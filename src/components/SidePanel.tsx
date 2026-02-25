/**
 * Side Panel メインコンポーネント
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { Play, Link, Settings, ExternalLink, Clock, Star, Crown, X, Check } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';
import { analyzeViaServer, analyzeViaServerStream, getVideoInfo, verifySession, getUserPlan, subscribeToPro, openBillingPortal } from '../services/apiServer';
import type { User, PlanResponse } from '../types';
import { addToHistory, addFavorite, removeFavorite, getEntryById, isFavorite, migrateFromLocalStorage } from '../services/analysisStorage';
import { getCurrentYouTubeVideo, extractVideoId } from '../utils/youtube';
import { FREE_DAILY_LIMIT, FREE_FAVORITES_LIMIT } from '../constants';
import { useTranslation } from '../i18n/useTranslation';
import { getLanguage } from '../i18n/useTranslation';
import { parseAnalysisResult } from '../utils/jsonParser';
import LoadingView from './LoadingView';
import ResultDashboard from './ResultDashboard';
import SettingsView from './SettingsView';
import Auth from './Auth';
import Onboarding, { useOnboarding } from './Onboarding';
import ReviewRequest, { useReviewRequest } from './ReviewRequest';
import HistorySection from './HistorySection';

function SidePanel() {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(() => {
    // 言語切替後のリロード時に設定画面に留まるためのフラグ
    const flag = localStorage.getItem('yt-gemini-openSettings');
    if (flag) {
      localStorage.removeItem('yt-gemini-openSettings');
      return true;
    }
    return false;
  });
  const [showPlanModal, setShowPlanModal] = useState(() => {
    const flag = localStorage.getItem('yt-gemini-openPlanSection');
    if (flag) {
      localStorage.removeItem('yt-gemini-openPlanSection');
      return true;
    }
    return false;
  });
  const [showHistory, setShowHistory] = useState<'favorites' | 'history' | null>(null);
  const [showCharacterIntro, setShowCharacterIntro] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState<'favorites' | 'history' | false>(false);
  const [savedFavoriteId, setSavedFavoriteId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const showShareToast = (msg: string) => { setShareToast(msg); setTimeout(() => setShareToast(null), 2000); };
  const [interruptedNotice, setInterruptedNotice] = useState(false);
  const [isStandaloneWindow, setIsStandaloneWindow] = useState(false);
  useEffect(() => {
    chrome.windows.getCurrent((win) => {
      if (win.type === 'popup') setIsStandaloneWindow(true);
    });
  }, []);
  const [currentVideo, setCurrentVideo] = useState<{ videoId: string; title?: string; commentCount?: number } | null>(null);
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const { shouldShow: showReviewRequest, markDismissed: markReviewDismissed } = useReviewRequest();
  const [reviewSkipped, setReviewSkipped] = useState(false);
  const { fontSize, bgMode } = useDesignStore();
  const bgColor = BG_COLORS[bgMode];
  const isLight = isLightMode(bgMode);
  const isPro = user?.plan === 'pro';
  const {
    isAnalyzing,
    progress,
    videoInfo,
    comments,
    result,
    error,
    startAnalysis,
    updateProgress,
    setComments,
    setResult,
    setError,
    reset,
  } = useAnalysisStore();

  // 新しいウィンドウで開いた際に解析結果を復元（chrome.storage.local経由）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('restore') === '1') {
      chrome.storage.local.get('transferState').then((data) => {
        try {
          const state = data.transferState;
          if (state && state.result && state.videoInfo) {
            useAnalysisStore.setState({
              videoInfo: state.videoInfo,
              result: state.result,
              comments: state.comments || [],
              isAnalyzing: false,
              error: null,
            });
            if (state.savedFavoriteId) setSavedFavoriteId(state.savedFavoriteId);
            if (state.isFromHistory) setIsFromHistory(state.isFromHistory);
          }
        } catch (e) {
          console.error('[SidePanel] Failed to restore transfer state:', e);
        }
        // 使い終わったら削除
        chrome.storage.local.remove('transferState');
      }).catch((e) => {
        console.error('[SidePanel] Failed to read transfer state:', e);
      });
      // URLからクエリパラメータを除去
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      const result = await verifySession();
      if (result.success && result.user) {
        setUser(result.user);
        // プラン情報をchrome.storageに保存（content scriptから参照）
        const planResult = await getUserPlan();
        if (planResult.success) {
          chrome.storage.local.set({ planInfo: { plan: planResult.plan, dailyRemaining: planResult.dailyRemaining } });
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
    // 言語設定をchrome.storage.localに同期（コンテンツスクリプト用）
    const lang = localStorage.getItem('yt-gemini-language') || 'ja';
    chrome.storage.local.set({ language: lang });
  }, []);

  // 初回マウント時にlocalStorageからのマイグレーション実行
  useEffect(() => {
    migrateFromLocalStorage();
  }, []);

  // 解析中断フラグの確認
  useEffect(() => {
    chrome.storage.local.get(['analysisInterrupted']).then((result) => {
      if (result.analysisInterrupted) {
        setInterruptedNotice(true);
        chrome.storage.local.remove(['analysisInterrupted']);
      }
    });
  }, []);

  // 進捗タイマーを保存するためのref
  const progressTimerRef = useRef<number | null>(null);
  // 解析リクエストのAbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStartAnalysis = useCallback(
    async (videoId: string, title?: string, noCache?: boolean) => {
      // 既存のタイマーとAbortControllerをクリーンアップ
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 新しい解析開始時はフラグをリセット（前回の状態を引き継がない）
      setSavedFavoriteId(null);
      setIsFromHistory(false);
      setReviewSkipped(false);

      try {
        // タイトル・コメント数をサーバーから取得
        let resolvedTitle = title;
        let resolvedCommentCount: number | undefined;
        try {
          const info = await getVideoInfo(videoId);
          if (info.success) {
            if (!resolvedTitle && info.title) resolvedTitle = info.title;
            if (info.commentCount) resolvedCommentCount = info.commentCount;
          }
        } catch {
          // 取得失敗は無視して続行
        }

        startAnalysis(videoId, resolvedTitle, resolvedCommentCount);

        // 進捗を初期化
        updateProgress({
          stage: 'fetching',
          message: t('side.serverProcessing'),
          current: 1,
          total: 100,
        });

        // SSEストリーミングを試行、失敗時はPOSTにフォールバック
        const language = getLanguage();
        try {
          await new Promise<void>((resolve, reject) => {
            const sseHandle = analyzeViaServerStream(
              videoId, 2000, 'medium', language,
              {
                onProgress: (data) => {
                  const stage = (['fetching', 'analyzing', 'complete'].includes(data.stage) ? data.stage : 'analyzing') as 'fetching' | 'analyzing' | 'complete';
                  updateProgress({
                    stage,
                    message: data.message,
                    current: data.current,
                    total: data.total,
                  });
                },
                onComments: (data) => {
                  if (data.comments) {
                    setComments(data.comments);
                  }
                },
                onResult: (data) => {
                  const resultData = parseAnalysisResult(data);
                  setResult(resultData);
                  resolve();
                },
                onError: (message) => {
                  reject(new Error(message));
                },
              },
              !!noCache
            );

            // AbortControllerとSSEを連携
            abortController.signal.addEventListener('abort', () => {
              sseHandle.abort();
              reject(new DOMException('Aborted', 'AbortError'));
            });

            // SSE接続タイムアウト（EventSourceが即座に失敗する場合のフォールバック用）
            // 通常はonError/onResultで解決する
          });
        } catch (sseError) {
          // SSEが失敗した場合、POSTにフォールバック
          if (sseError instanceof DOMException && sseError.name === 'AbortError') {
            throw sseError; // ユーザーが中止した場合はそのまま再スロー
          }

          console.warn('[SidePanel] SSE failed, falling back to POST:', sseError);

          // 疑似プログレス付きのPOSTフォールバック
          let currentProgress = 10;
          progressTimerRef.current = window.setInterval(() => {
            if (currentProgress < 98) {
              currentProgress += 3;
              updateProgress({
                stage: currentProgress < 50 ? 'fetching' : 'analyzing',
                message: currentProgress < 50 ? t('side.serverProcessing') : t('side.aiAnalyzing'),
                current: Math.min(currentProgress, 98),
                total: 100,
              });
            } else if (progressTimerRef.current !== null) {
              clearInterval(progressTimerRef.current);
              progressTimerRef.current = null;
            }
          }, 1000);

          const analysisResult = await analyzeViaServer(
            videoId, [], 2000, 'medium', abortController.signal, language, noCache
          );

          if (progressTimerRef.current !== null) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }

          if (analysisResult.comments) {
            setComments(analysisResult.comments);
          }

          const resultData = parseAnalysisResult(analysisResult);
          setResult(resultData);
        }

        // 完了アニメーション
        updateProgress({
          stage: 'analyzing',
          message: t('side.complete'),
          current: 100,
          total: 100,
        });

        // 解析回数をインクリメント（レビュー依頼用）
        chrome.storage.local.get(['analysisCount'], (res) => {
          const count = (res.analysisCount ?? 0) + 1;
          chrome.storage.local.set({ analysisCount: count });
        });

        // 解析結果を自動的に履歴に保存
        const currentState = useAnalysisStore.getState();
        if (currentState.result && currentState.videoInfo) {
          const historyId = `${Date.now()}`;
          addToHistory({
            id: historyId,
            videoId: currentState.videoInfo.videoId,
            videoTitle: currentState.videoInfo.title || currentState.videoInfo.videoId,
            analyzedAt: new Date().toISOString(),
            result: currentState.result,
            comments: currentState.comments || [],
            videoInfo: currentState.videoInfo,
          }).then(() => {
            setHistoryRefreshKey((k) => k + 1);
          }).catch((e) => {
            console.error('[SidePanel] Failed to auto-save to history:', e);
          });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        // エラーが発生した場合はタイマーを停止
        if (progressTimerRef.current !== null) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }

        // ユーザーが中止した場合はエラーを表示しない
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log('[SidePanel] 解析がユーザーによって中止されました');
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : t('side.unknownError');

        // 日次上限到達エラーの場合 → プランモーダルを表示
        if (errorMessage.includes('上限') || errorMessage.includes('limit') || errorMessage.includes('クレジット') || errorMessage.includes('credit')) {
          setShowPlanModal(true);
        } else {
          setError(errorMessage);
        }
      }
    },
    [startAnalysis, updateProgress, setComments, setResult, setError]
  );

  // 解析を中止する関数
  const cancelAnalysis = useCallback(() => {
    // AbortControllerでリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // タイマーを停止
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    // UIをリセット
    reset();
    setSavedFavoriteId(null);
  }, [reset]);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // 解析中にパネルが閉じられた場合、中断フラグを保存
      if (useAnalysisStore.getState().isAnalyzing) {
        chrome.storage.local.set({ analysisInterrupted: true });
      }
    };
  }, []);

  useEffect(() => {
    // chrome.storageの変更を監視して解析開始を検知
    const checkPendingAnalysis = async () => {
      const result = await chrome.storage.local.get(['pendingAnalysis']);
      if (result.pendingAnalysis) {
        const { videoId, title } = result.pendingAnalysis;
        // 解析開始後、pendingAnalysisを削除
        await chrome.storage.local.remove(['pendingAnalysis']);
        handleStartAnalysis(videoId, title);
      }
    };

    // 設定画面を開くリクエストがあるか確認
    const checkOpenSettings = async () => {
      const result = await chrome.storage.local.get(['openSettings']);
      if (result.openSettings) {
        await chrome.storage.local.remove(['openSettings']);
        setShowSettings(true);
      }
    };

    // storage変更を監視（リスナーを先に登録して取りこぼしを防ぐ）
    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.pendingAnalysis?.newValue) {
        const { videoId, title } = changes.pendingAnalysis.newValue;
        chrome.storage.local.remove(['pendingAnalysis']);
        setShowSettings(false);
        handleStartAnalysis(videoId, title);
      }
      if (changes.openSettings?.newValue) {
        chrome.storage.local.remove(['openSettings']);
        setShowSettings(true);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    // リスナー登録後に初回チェック（書き込み済みデータを確実に拾う）
    checkPendingAnalysis();
    checkOpenSettings();

    // パネルが新規マウントされた場合、background.jsがpendingAnalysisを書き込む前に
    // 初回チェックが走る可能性があるため、遅延リトライで確実にキャッチする
    const retryTimer = setTimeout(checkPendingAnalysis, 600);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearTimeout(retryTimer);
    };
  }, [handleStartAnalysis]);

  const handleOpenSettings = () => {
    setShowSettings(true);
  };
  const handleOpenPlan = () => {
    setShowPlanModal(true);
  };

  // 現在の解析結果をお気に入りに保存
  const saveCurrentResult = useCallback(async () => {
    if (!result || !videoInfo) {
      console.warn('[SidePanel] saveCurrentResult: result or videoInfo is null', { result: !!result, videoInfo: !!videoInfo });
      return;
    }
    try {
      const id = savedFavoriteId || `${Date.now()}`;
      const maxLimit = isPro ? undefined : FREE_FAVORITES_LIMIT;
      await addFavorite({
        id,
        videoId: videoInfo.videoId,
        videoTitle: videoInfo.title || videoInfo.videoId,
        analyzedAt: new Date().toISOString(),
        result,
        comments,
        videoInfo,
      }, maxLimit);
      setSavedFavoriteId(id);
      setHistoryRefreshKey((k) => k + 1);
    } catch (e) {
      if (e instanceof Error && e.message === 'FAVORITES_FULL') {
        alert(t('history.favoritesFull'));
      } else {
        console.error('[SidePanel] Failed to save favorite:', e);
      }
    }
  }, [result, comments, videoInfo, savedFavoriteId, t]);

  // お気に入りから削除
  const unsaveCurrentResult = useCallback(async () => {
    if (!savedFavoriteId) return;
    await removeFavorite(savedFavoriteId);
    setSavedFavoriteId(null);
    setHistoryRefreshKey((k) => k + 1);
  }, [savedFavoriteId]);

  // 再解析
  const handleReanalyze = useCallback(() => {
    if (!videoInfo?.videoId) return;
    handleStartAnalysis(videoInfo.videoId, videoInfo.title, true);
  }, [videoInfo, handleStartAnalysis]);

  // 履歴/お気に入りから読み込み
  const loadEntry = useCallback(async (id: string, fromPage?: 'favorites' | 'history') => {
    const entry = await getEntryById(id);
    if (!entry) return;
    setComments(entry.comments);
    setResult(entry.result);
    useAnalysisStore.setState({ videoInfo: entry.videoInfo });
    setIsFromHistory(fromPage || (entry.source === 'favorite' ? 'favorites' : 'history'));
    // お気に入りの場合はIDをセット
    if (entry.source === 'favorite') {
      setSavedFavoriteId(id);
    } else {
      // 履歴エントリの場合、お気に入りかどうかチェック
      const favFlag = await isFavorite(id);
      setSavedFavoriteId(favFlag ? id : null);
    }
    setShowSettings(false);
  }, [setComments, setResult]);

  // 現在のタブのYouTube動画情報を検出
  useEffect(() => {
    const loadCurrentVideo = async () => {
      const info = await getCurrentYouTubeVideo();
      if (info) {
        try {
          const videoData = await getVideoInfo(info.videoId);
          if (videoData.success) {
            setCurrentVideo({
              videoId: info.videoId,
              title: videoData.title || info.title,
              commentCount: videoData.commentCount,
            });
          } else {
            setCurrentVideo({ videoId: info.videoId, title: info.title });
          }
        } catch {
          setCurrentVideo({ videoId: info.videoId, title: info.title });
        }
      }
    };
    if (!isAnalyzing && !result && !error) {
      loadCurrentVideo();
    }
  }, [isAnalyzing, result, error]);

  const urlVideoId = extractVideoId(urlInput);
  const isValidUrl = urlVideoId !== null;

  const handleUrlAnalyze = async () => {
    if (!urlVideoId) return;
    setUrlLoading(true);
    try {
      const videoData = await getVideoInfo(urlVideoId);
      const title = videoData.success ? videoData.title : undefined;
      handleStartAnalysis(urlVideoId, title);
    } catch {
      handleStartAnalysis(urlVideoId);
    } finally {
      setUrlLoading(false);
    }
  };

  // 全画面共通のラッパースタイル
  const wrapperStyle = { backgroundColor: bgColor, fontSize: `${fontSize}px`, minHeight: '100vh' };

  // 認証ロード中
  if (authLoading) {
    return (
      <div style={wrapperStyle} className="flex items-center justify-center">
        <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('auth.loading')}</p>
      </div>
    );
  }

  // 未ログイン時はAuth画面を表示
  if (!user) {
    return (
      <div style={wrapperStyle} className="flex flex-col items-center justify-center px-6">
        <div className="flex justify-center px-2 py-1 mb-2 animate-bounce-in" style={{ animationFillMode: 'both' }}>
          <img
            src={chrome.runtime.getURL('icons/logo-urayomi.png')}
            alt="ウラヨミ！"
            className="w-full max-w-[320px] px-4 object-contain"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 20px rgba(255,255,255,0.4)) drop-shadow(0 0 40px rgba(200,220,255,0.3))',
            }}
          />
        </div>
        <Auth onAuthSuccess={(u) => setUser(u)} />
      </div>
    );
  }

  // オンボーディング画面（初回インストール時）
  if (showOnboarding) {
    return (
      <div style={wrapperStyle}>
        <Onboarding onComplete={completeOnboarding} />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div style={wrapperStyle}>
        <SettingsView onBack={() => setShowSettings(false)} onLogout={() => location.reload()} />
      </div>
    );
  }

  if (showCharacterIntro) {
    return (
      <div style={wrapperStyle}>
        <CharacterProfile
          isLight={isLight}
          onBack={() => setShowCharacterIntro(false)}
          t={t}
        />
      </div>
    );
  }

  if (showHistory) {
    return (
      <div style={wrapperStyle}>
        <HistorySection
          mode={showHistory}
          plan={isPro ? 'pro' : 'free'}
          onBack={() => setShowHistory(null)}
          onLoadEntry={(id) => {
            const currentMode = showHistory;
            setShowHistory(null);
            loadEntry(id, currentMode || undefined);
          }}
          refreshKey={historyRefreshKey}
        />
      </div>
    );
  }

  if (error) {
    const isApiKeyError = error.includes('API Key');
    return (
      <div style={wrapperStyle}>
        <div className="p-6">
          <div className={`rounded-lg p-4 ${isLight ? 'bg-red-50 border border-red-200' : 'bg-red-900/30 border border-red-800'}`}>
            <h3 className={`font-semibold mb-2 ${isLight ? 'text-red-600' : 'text-red-400'}`}>{t('side.error')}</h3>
            <p className={`text-sm mb-3 ${isLight ? 'text-red-500' : 'text-red-300'}`}>{error}</p>
            {isApiKeyError && (
              <button
                onClick={handleOpenSettings}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                {t('side.openSettings')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return <LoadingView progress={progress} onCancel={cancelAnalysis} />;
  }

  if (result) {
    return (
      <>
        {/* レビュー依頼モーダル（3回以上解析後に表示） */}
        {showReviewRequest && !reviewSkipped && (
          <ReviewRequest onDismiss={markReviewDismissed} onSkip={() => setReviewSkipped(true)} />
        )}
        <ResultDashboard result={result} videoInfo={videoInfo} comments={comments} plan={isPro ? 'pro' : 'free'} onBack={() => {
            const returnTo = isFromHistory;
            reset();
            setSavedFavoriteId(null);
            setHistoryRefreshKey((k) => k + 1);
            if (returnTo) {
              // お気に入り/履歴から来た場合はそのリストページに戻る
              setShowHistory(returnTo);
            }
            setIsFromHistory(false);
          }} onSave={saveCurrentResult} onUnsave={unsaveCurrentResult} isSaved={!!savedFavoriteId} onReanalyze={handleReanalyze} onOpenPlan={() => {
            // フリープランのPRO機能タップ時: ランディングページに戻ってプラン管理モーダルを表示
            reset();
            setSavedFavoriteId(null);
            setIsFromHistory(false);
            setShowHistory(false);
            setShowPlanModal(true);
          }} onOpenWindow={isStandaloneWindow ? undefined : async () => {
            try {
              // chrome.storage.localに解析結果を保存（localStorageより大容量で信頼性が高い）
              const stateToTransfer = {
                result,
                videoInfo,
                comments,
                savedFavoriteId,
                isFromHistory,
              };
              await chrome.storage.local.set({ transferState: stateToTransfer });
              // 現在のウィンドウIDを取得（サイドパネルを閉じるため）
              const currentWindow = await chrome.windows.getCurrent();
              // background scriptにウィンドウ作成を依頼（サイドパネルからの直接作成は不安定）
              const resp = await chrome.runtime.sendMessage({ type: 'OPEN_RESULT_WINDOW', windowId: currentWindow.id });
              if (!resp?.success) {
                throw new Error(resp?.error || 'Window creation failed');
              }
            } catch (e) {
              console.error('[SidePanel] Failed to open new window:', e);
              // コメントが大きすぎる場合、コメント抜きで再試行
              try {
                await chrome.storage.local.set({
                  transferState: { result, videoInfo, comments: [], savedFavoriteId, isFromHistory },
                });
                const currentWindow = await chrome.windows.getCurrent();
                const resp = await chrome.runtime.sendMessage({ type: 'OPEN_RESULT_WINDOW', windowId: currentWindow.id });
                if (!resp?.success) throw new Error('Retry also failed');
              } catch (e2) {
                console.error('[SidePanel] Minimal state transfer also failed:', e2);
              }
            }
          }} />
      </>
    );
  }

  return (
    <div style={wrapperStyle} className="flex flex-col">
      {/* 解析中断通知 */}
      {interruptedNotice && (
        <div className={`mx-3 mt-3 p-3 rounded-lg border flex items-start gap-2 ${isLight ? 'bg-yellow-50 border-yellow-300' : 'bg-yellow-900/30 border-yellow-700'}`}>
          <p className={`flex-1 text-xs leading-relaxed ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
            {t('side.analysisInterrupted')}
          </p>
          <button
            onClick={() => setInterruptedNotice(false)}
            className={`shrink-0 text-lg leading-none px-1 ${isLight ? 'text-yellow-600 hover:text-yellow-800' : 'text-yellow-400 hover:text-yellow-200'}`}
          >
            &times;
          </button>
        </div>
      )}

      {/* ボタン（右上） */}
      <div className="flex items-center justify-end gap-1.5 p-3" style={{ flexShrink: 0 }}>
        {user && (
          <button
            onClick={handleOpenPlan}
            className="cursor-pointer transition-opacity hover:opacity-80"
            title={t('settings.planManagement')}
          >
            {isPro ? (
              <span className="relative inline-flex rounded-full p-[2px] overflow-hidden" style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}>
                <span className={`block text-xs font-bold px-3 py-0.5 rounded-full ${
                  isLight ? 'bg-white text-gray-800' : 'bg-gray-900 text-gray-100'
                }`}>
                  PRO
                </span>
              </span>
            ) : (
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isLight
                  ? 'border-gray-300 text-gray-500 bg-white'
                  : 'bg-gray-800 border-gray-600 text-gray-400'
              }`}>
                FREE
              </span>
            )}
          </button>
        )}
        {!isStandaloneWindow && (
          <button
            onClick={async () => {
              const url = chrome.runtime.getURL('sidepanel.html');
              await chrome.windows.create({ url, type: 'popup', width: 420, height: 720 });
              window.close();
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('side.openWindow')}
          >
            <ExternalLink className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={handleOpenSettings}
          className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
          title={t('side.settings')}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col min-h-0">
        <div className="w-full max-w-sm mx-auto space-y-5 my-auto">
          {currentVideo ? (
            <>
              {/* ユウちゃん「解析開始！」ステッカー */}
              <div className="flex justify-center">
                <img
                  src={chrome.runtime.getURL('icons/yuchan-analyze.png')}
                  alt="ユウちゃん - 解析開始！"
                  className="w-72 object-contain yuchan-sticker animate-bounce-in"
                  style={{ animationFillMode: 'both' }}
                />
              </div>

              {/* 現在の動画情報 */}
              <div className={`p-4 rounded-lg ${isLight ? 'bg-gray-50 border border-gray-200' : 'bg-gray-800/50 border border-gray-700'}`}>
                {currentVideo.title && (
                  <>
                    <p className={`text-xs mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('side.title')}</p>
                    <p className={`text-sm line-clamp-2 mb-3 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                      {currentVideo.title}
                    </p>
                  </>
                )}
                {currentVideo.commentCount !== undefined && (
                  <>
                    <p className={`text-xs mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('side.commentCount')}</p>
                    <p className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {currentVideo.commentCount.toLocaleString()}{t('side.commentUnit')}
                    </p>
                  </>
                )}
              </div>

              {/* 解析ボタン */}
              <div className={`relative w-full ${isPro ? 'glow-btn-wrap' : ''}`}>
                <button
                  onClick={() => handleStartAnalysis(currentVideo.videoId, currentVideo.title)}
                  className="relative w-full rounded-[20px] p-[2px] cursor-pointer transition-all z-[1]"
                  style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
                >
                  <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] text-white font-semibold">
                    <Play className="w-5 h-5" />
                    {t('side.startAnalysis')}
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ロゴ */}
              <div className="flex justify-center px-2 py-1 animate-bounce-in" style={{ animationFillMode: 'both' }}>
                <img
                  src={chrome.runtime.getURL('icons/logo-urayomi.png')}
                  alt="ウラヨミ！"
                  className="w-full max-w-[320px] px-4 object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 20px rgba(255,255,255,0.4)) drop-shadow(0 0 40px rgba(200,220,255,0.3))',
                  }}
                />
              </div>

              {/* マスコットキャラクター */}
              <div className="flex justify-center animate-bounce-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
                <img
                  src={chrome.runtime.getURL('icons/mascot.png')}
                  alt="ウラヨミ！ マスコット"
                  className="w-48"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 20px rgba(255,255,255,0.4)) drop-shadow(0 0 40px rgba(200,220,255,0.3))',
                  }}
                />
              </div>

              {/* YouTube動画ページを開いてくださいメッセージ */}
              <p className={`text-center font-semibold ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                {t('side.openYoutube')}
              </p>

              {/* 区切り線 */}
              <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className={`flex-1 border-t ${isLight ? 'border-gray-300' : 'border-gray-700'}`} />
                <span>{t('side.orPasteUrl')}</span>
                <div className={`flex-1 border-t ${isLight ? 'border-gray-300' : 'border-gray-700'}`} />
              </div>

              {/* URL入力 */}
              <div className="relative">
                <Link className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={t('side.urlPlaceholder')}
                  className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors ${isLight ? 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400' : 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'}`}
                />
              </div>

              {/* 解析ボタン */}
              <div className={`relative w-full ${isValidUrl && isPro ? 'glow-btn-wrap' : ''}`}>
                <button
                  onClick={handleUrlAnalyze}
                  disabled={!isValidUrl || urlLoading}
                  className={`relative w-full rounded-[20px] p-[2px] transition-all z-[1] ${
                    isValidUrl
                      ? 'cursor-pointer'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
                >
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] font-semibold ${isValidUrl ? 'text-white' : 'text-gray-500'}`}>
                    <Play className="w-5 h-5" />
                    {urlLoading ? t('side.loading') : t('side.startAnalysis')}
                  </div>
                </button>
              </div>
            </>
          )}

          {/* お気に入りボタン（黄色 + 黄色シャドウ） */}
          <div className={`relative w-full ${isPro ? 'glow-btn-wrap glow-yellow' : ''}`}>
            <button
              onClick={() => setShowHistory('favorites')}
              className="relative w-full rounded-[20px] p-[1px] cursor-pointer transition-all z-[1] bg-yellow-500"
            >
              <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-[19px] font-semibold ${isLight ? 'bg-white text-yellow-600' : 'bg-[#0f0f0f] text-yellow-500'}`}>
                <Star className="w-5 h-5 fill-current" />
                {t('history.viewFavorites')}
              </div>
            </button>
          </div>

          {/* 履歴ボタン（白縁 + 白色シャドウ） */}
          <div className={`relative w-full ${isPro ? 'glow-btn-wrap glow-white' : ''}`}>
            <button
              onClick={() => setShowHistory('history')}
              className={`relative w-full rounded-[20px] p-[1px] cursor-pointer transition-all z-[1] ${isLight ? 'bg-gray-300' : 'border border-white/40 bg-transparent'}`}
            >
              <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-[19px] font-semibold ${isLight ? 'bg-white text-gray-600' : 'bg-[#0f0f0f] text-gray-300'}`}>
                <Clock className="w-5 h-5" />
                {t('history.viewHistory')}
              </div>
            </button>
          </div>

          {/* キャラクター紹介ボタン（虹色グラデーション + グラデーションシャドウ） */}
          <div className={`relative w-full ${isPro ? 'character-intro-btn' : ''}`}>
            <button
              onClick={() => setShowCharacterIntro(true)}
              className="relative w-full rounded-[50px] px-4 py-3 cursor-pointer font-semibold text-white z-[1] transition-all"
              style={{ background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c, #fda085, #f6d365, #96e6a1, #667eea)' }}
            >
              {t('side.characterIntro')}
            </button>
          </div>
        </div>
      </div>

      {/* フッター: セリフ + シェアアイコン + バージョン */}
      <div className="flex flex-col items-center gap-2 pb-4 pt-2 px-6" style={{ flexShrink: 0 }}>
        <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('share.yuchanAsk')}
        </p>
        <div className="flex items-center gap-3">
          {/* X (Twitter) */}
          <button
            onClick={() => {
              const text = encodeURIComponent(t('share.text'));
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank');
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.x')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          {/* LINE */}
          <button
            onClick={() => {
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${encodeURIComponent(t('share.text'))}`, '_blank');
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.line')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1c-6.615 0-12 4.398-12 9.806 0 4.882 4.27 8.934 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.104 9.436-7.019C23.176 14.748 24 12.362 24 9.806 24 5.398 18.615 1 12 1zM6.63 13.224H4.622a.48.48 0 0 1-.481-.48V8.34a.48.48 0 0 1 .962 0v3.922H6.63a.48.48 0 0 1 0 .962zm2.276 0a.48.48 0 0 1-.481-.48V8.34a.48.48 0 0 1 .962 0v4.404a.48.48 0 0 1-.48.48zm5.186 0a.48.48 0 0 1-.396-.208l-2.348-3.218v2.946a.48.48 0 0 1-.962 0V8.34a.48.48 0 0 1 .48-.48h.015a.48.48 0 0 1 .396.207l2.346 3.216V8.34a.48.48 0 0 1 .962 0v4.404a.48.48 0 0 1-.48.48h-.013zm4.178-3.463a.48.48 0 0 1 0 .962h-1.908v1.02h1.908a.48.48 0 0 1 0 .962h-2.389a.48.48 0 0 1-.481-.48V8.34a.48.48 0 0 1 .48-.48h2.39a.48.48 0 0 1 0 .962h-1.909v1.019h1.909z" />
            </svg>
          </button>
          {/* Facebook */}
          <button
            onClick={() => {
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.facebook')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
          {/* Reddit */}
          <button
            onClick={() => {
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              const title = encodeURIComponent(t('share.text'));
              window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, '_blank');
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.reddit')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
          </button>
          {/* Chrome Web Store URLコピー */}
          <button
            onClick={async () => {
              const storeUrl = 'https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn';
              await navigator.clipboard.writeText(storeUrl);
              showShareToast(t('share.copied'));
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.copyUrl')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.819 7.555l-3.953 6.848A12 12 0 0 0 24 12c0-1.576-.309-3.08-.855-4.455zM12 8.181a3.818 3.818 0 1 0 0 7.636 3.818 3.818 0 0 0 0-7.636z" />
            </svg>
          </button>
        </div>
        <span className={`text-[10px] ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>
          v{chrome.runtime.getManifest().version}
        </span>
      </div>

      {/* シェアトースト */}
      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-toast-in">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${isLight ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}>
            {shareToast}
          </div>
        </div>
      )}

      {/* プラン管理モーダル */}
      {showPlanModal && (
        <PlanModal
          plan={user?.plan || 'free'}
          isLight={isLight}
          bgColor={bgColor}
          onClose={() => setShowPlanModal(false)}
          t={t}
        />
      )}
    </div>
  );
}

/** プラン管理モーダル */
function PlanModal({ plan, isLight, bgColor, onClose, t }: {
  plan: 'free' | 'pro';
  isLight: boolean;
  bgColor: string;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [planInfo, setPlanInfo] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUserPlan().then((res) => { if (res.success) setPlanInfo(res); });
    const onVisible = () => { if (document.visibilityState === 'visible') getUserPlan().then((res) => { if (res.success) setPlanInfo(res); }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await subscribeToPro();
      if (result.url) chrome.tabs.create({ url: result.url });
      else alert(result.error || t('settings.purchaseError'));
    } catch (e) {
      alert(t('settings.purchaseError') + (e instanceof Error ? e.message : ''));
    } finally { setLoading(false); }
  };

  const handleBilling = async () => {
    try {
      const result = await openBillingPortal();
      if (result.url) chrome.tabs.create({ url: result.url });
      else alert(result.error || t('settings.purchaseError'));
    } catch (e) {
      alert(t('settings.purchaseError') + (e instanceof Error ? e.message : ''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 animate-modal-backdrop" />
      {/* 虹色ボーダー + カード */}
      <div
        className="relative w-full max-w-sm rounded-2xl p-[2px] modal-rainbow-border animate-modal-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-full rounded-2xl shadow-2xl overflow-hidden ${isLight ? 'text-gray-800' : 'text-white'}`}
          style={{ backgroundColor: bgColor }}
        >
        {/* ヘッダー */}
        <div className="relative p-5 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('settings.planManagement')}</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* 現在のプランバッジ */}
          <div className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
            <div className="flex items-center gap-2">
              <Crown className={`w-5 h-5 ${plan === 'pro' ? 'text-yellow-400' : isLight ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t('settings.currentPlan')}</span>
            </div>
            {plan === 'pro' ? (
              <span className="relative inline-flex rounded-full p-[2px] overflow-hidden" style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}>
                <span className={`block text-xs font-bold px-3 py-0.5 rounded-full ${isLight ? 'bg-white text-gray-800' : 'bg-gray-900 text-gray-100'}`}>PRO</span>
              </span>
            ) : (
              <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-300'}`}>FREE</span>
            )}
          </div>

          {/* Freeプラン: 日次使用量 + Pro特典 + アップグレードボタン */}
          {plan === 'free' && (
            <>
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
                <div className={`text-xs font-bold mb-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('settings.dailyUsage')}</div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}>
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, ((planInfo?.dailyUsed ?? 0) / FREE_DAILY_LIMIT) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    {planInfo?.dailyUsed ?? 0} / {FREE_DAILY_LIMIT}
                  </span>
                </div>
              </div>

              {/* Pro特典リスト */}
              <div className={`p-4 rounded-xl border ${isLight ? 'bg-yellow-50/60 border-yellow-200' : 'bg-yellow-900/10 border-yellow-800/30'}`}>
                <div className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${isLight ? 'text-yellow-700' : 'text-yellow-400'}`}>
                  <Crown className="w-3.5 h-3.5" />
                  {t('settings.proPerks')}
                </div>
                <ul className="space-y-2">
                  {(['perk1', 'perk2', 'perk3', 'perk4', 'perk5'] as const).map((key) => (
                    <li key={key} className="flex items-start gap-2">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" />
                      <span className={`text-xs leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                        {t(`settings.${key}`)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className={`text-center text-xs font-bold mt-3 pt-3 border-t ${isLight ? 'border-yellow-200 text-yellow-700' : 'border-yellow-800/30 text-yellow-400'}`}>
                  {t('settings.perkPrice')}
                </div>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="relative w-full rounded-[20px] p-[2px] cursor-pointer transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
              >
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] text-white font-bold text-sm">
                  <Crown className="w-4 h-4" />
                  {loading ? t('settings.processing') : t('settings.upgradeToPro')}
                </div>
              </button>
            </>
          )}

          {/* Proプラン: サブスクリプション管理 */}
          {plan === 'pro' && (
            <button
              onClick={handleBilling}
              className={`w-full py-3 text-sm font-bold rounded-xl border transition-colors flex items-center justify-center gap-2 ${isLight ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
            >
              {t('settings.manageSubscription')}
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

/** キャラクター紹介ページ */
function CharacterProfile({ isLight, onBack, t }: {
  isLight: boolean;
  onBack: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [activeChar, setActiveChar] = useState<'yuchan' | 'geminny'>('yuchan');
  const isYuchan = activeChar === 'yuchan';

  // キャラクター別データ
  const charData = isYuchan ? {
    image: chrome.runtime.getURL('icons/yuchan-standing.png'),
    imageAlt: 'ユウちゃん',
    imageClass: 'w-64 object-contain yuchan-standing',
    name: t('character.name'),
    catchphrase: t('character.catchphrase'),
    birthday: t('character.birthday'),
    age: t('character.age'),
    affiliation: t('character.affiliation'),
    description: t('character.description'),
    gradientFrom: '#667eea',
    gradientVia: '#764ba2',
    gradientTo: '#f093fb',
    descBg: isLight ? 'bg-purple-50 border border-purple-200' : 'bg-purple-900/20 border border-purple-800/40',
  } : {
    image: chrome.runtime.getURL('icons/geminny-standing.png'),
    imageAlt: 'ジェミニーちゃん',
    imageClass: 'w-52 object-contain geminny-standing',
    name: t('character.geminny.name'),
    catchphrase: t('character.geminny.catchphrase'),
    birthday: t('character.geminny.birthday'),
    age: t('character.geminny.age'),
    affiliation: t('character.geminny.affiliation'),
    description: t('character.geminny.description'),
    gradientFrom: '#4285F4',
    gradientVia: '#34A853',
    gradientTo: '#FBBC05',
    descBg: isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-800/40',
  };

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 p-4" style={{ flexShrink: 0 }}>
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={`text-lg font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
          {t('character.profileTitle')}
        </h1>
      </div>

      {/* キャラクタートグル */}
      <div className="flex justify-center px-5 pb-3" style={{ flexShrink: 0 }}>
        <div className={`relative grid grid-cols-2 rounded-xl p-1 w-full max-w-xs ${isLight ? 'bg-gray-200' : 'bg-gray-700/80'}`}>
          {/* スライドする背景 */}
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg shadow-md transition-all duration-300 ease-in-out"
            style={{
              left: isYuchan ? '4px' : 'calc(50% + 0px)',
              background: isYuchan
                ? 'linear-gradient(135deg, #667eea, #764ba2)'
                : 'linear-gradient(135deg, #4285F4, #34A853)',
            }}
          />
          <button
            onClick={() => setActiveChar('yuchan')}
            className={`relative z-10 py-2 rounded-lg text-sm font-bold transition-colors duration-300 ${
              isYuchan ? 'text-white' : isLight ? 'text-gray-400' : 'text-gray-400'
            }`}
          >
            {t('character.yuchan')}
          </button>
          <button
            onClick={() => setActiveChar('geminny')}
            className={`relative z-10 py-2 rounded-lg text-sm font-bold transition-colors duration-300 ${
              !isYuchan ? 'text-white' : isLight ? 'text-gray-400' : 'text-gray-400'
            }`}
          >
            {t('character.geminnyName')}
          </button>
        </div>
      </div>

      {/* スクロールコンテンツ */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-6 flex flex-col justify-center">
        <div key={activeChar} className="w-full max-w-sm mx-auto space-y-5">
          {/* キャラクター立ち絵 */}
          <div className="flex justify-center pt-2">
            <img
              src={charData.image}
              alt={charData.imageAlt}
              className={`${charData.imageClass} ${isYuchan ? 'animate-fade-slide-in' : 'animate-fade-slide-in-right'}`}
              style={{ animationFillMode: 'both' }}
            />
          </div>

          {/* 名前 + キャッチフレーズ */}
          <div className="text-center space-y-2 animate-bounce-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <h2 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {charData.name}
            </h2>
            <p
              className="text-sm font-semibold"
              style={{
                background: `linear-gradient(135deg, ${charData.gradientFrom}, ${charData.gradientVia}, ${charData.gradientTo})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {charData.catchphrase}
            </p>
          </div>

          {/* プロフィールカード */}
          <div
            className={`rounded-2xl p-4 space-y-2 animate-bounce-in ${isLight ? 'bg-gray-50 border border-gray-200' : 'bg-gray-800/60 border border-gray-700'}`}
            style={{ animationDelay: '0.2s', animationFillMode: 'both' }}
          >
            <p className={`text-sm text-center ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{charData.birthday}</p>
            <div className={`border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`} />
            <p className={`text-sm text-center ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{charData.age}</p>
            <div className={`border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`} />
            <p className={`text-sm text-center ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{charData.affiliation}</p>
          </div>

          {/* 性格紹介テキスト */}
          <div
            className={`rounded-2xl p-4 animate-bounce-in ${charData.descBg}`}
            style={{ animationDelay: '0.3s', animationFillMode: 'both' }}
          >
            <p className={`text-sm leading-relaxed whitespace-pre-line ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              {charData.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SidePanel;
