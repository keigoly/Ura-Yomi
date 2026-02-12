/**
 * Side Panel メインコンポーネント
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { Play, Link, Settings, ExternalLink } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';
import { analyzeViaServer, analyzeViaServerStream, getVideoInfo, verifySession } from '../services/apiServer';
import type { User } from '../types';
import { saveHistory, getHistoryEntry, deleteHistoryEntry } from '../services/historyStorage';
import { getCurrentYouTubeVideo, extractVideoId } from '../utils/youtube';
import { ANALYSIS_CREDIT_COST } from '../constants';
import { useTranslation } from '../i18n/useTranslation';
import { getLanguage } from '../i18n/useTranslation';
import { parseAnalysisResult } from '../utils/jsonParser';
import LoadingView from './LoadingView';
import ResultDashboard from './ResultDashboard';
import SettingsView from './SettingsView';
import Auth from './Auth';

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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);
  const [savedHistoryId, setSavedHistoryId] = useState<string | null>(null);
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
  const { fontSize, bgMode } = useDesignStore();
  const bgColor = BG_COLORS[bgMode];
  const isLight = isLightMode(bgMode);
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

  // 新しいウィンドウで開いた際に解析結果を復元
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('restore') === '1') {
      try {
        const raw = localStorage.getItem('yt-gemini-transfer-state');
        if (raw) {
          const state = JSON.parse(raw);
          if (state.result) setResult(state.result);
          if (state.comments) setComments(state.comments);
          if (state.videoInfo) useAnalysisStore.setState({ videoInfo: state.videoInfo });
          localStorage.removeItem('yt-gemini-transfer-state');
        }
      } catch (e) {
        console.error('[SidePanel] Failed to restore transfer state:', e);
      }
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
      }
      setAuthLoading(false);
    };
    checkAuth();
    // 言語設定をchrome.storage.localに同期（コンテンツスクリプト用）
    const lang = localStorage.getItem('yt-gemini-language') || 'ja';
    chrome.storage.local.set({ language: lang });
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
    async (videoId: string, title?: string) => {
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

      // 新しい解析開始時は保存フラグをリセット（前回の保存状態を引き継がない）
      setSavedHistoryId(null);
      setIsFromHistory(false);

      try {
        // タイトルが空の場合、サーバーから取得
        let resolvedTitle = title;
        if (!resolvedTitle) {
          try {
            const info = await getVideoInfo(videoId);
            if (info.success && info.title) {
              resolvedTitle = info.title;
            }
          } catch {
            // タイトル取得失敗は無視して続行
          }
        }

        startAnalysis(videoId, resolvedTitle);

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
              }
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
            videoId, [], 2000, 'medium', abortController.signal, language
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

        // クレジット不足エラーの場合
        if (errorMessage.includes('クレジット') || errorMessage.includes('credit')) {
          setError(
            errorMessage + ' ' + t('side.creditShortage')
          );
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
    setSavedHistoryId(null);
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

    // 初回チェック
    checkPendingAnalysis();
    checkOpenSettings();

    // storage変更を監視
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

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [handleStartAnalysis]);

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  // 現在の解析結果を履歴に保存
  const saveCurrentResult = useCallback(() => {
    if (!result || !videoInfo) return;
    const id = `${Date.now()}`;
    saveHistory({
      id,
      videoId: videoInfo.videoId,
      videoTitle: videoInfo.title || videoInfo.videoId,
      analyzedAt: new Date().toISOString(),
      result,
      comments,
      videoInfo,
    });
    setSavedHistoryId(id);
  }, [result, comments, videoInfo]);

  // 履歴から削除
  const unsaveCurrentResult = useCallback(() => {
    if (!savedHistoryId) return;
    deleteHistoryEntry(savedHistoryId);
    setSavedHistoryId(null);
  }, [savedHistoryId]);

  // 再解析
  const handleReanalyze = useCallback(() => {
    if (!videoInfo?.videoId) return;
    handleStartAnalysis(videoInfo.videoId, videoInfo.title);
  }, [videoInfo, handleStartAnalysis]);

  // 履歴から読み込み
  const loadHistoryEntry = useCallback((id: string) => {
    const entry = getHistoryEntry(id);
    if (!entry) return;
    setComments(entry.comments);
    setResult(entry.result);
    // videoInfoはstartAnalysisで設定されるが、履歴読み込み時は直接storeに設定
    useAnalysisStore.setState({ videoInfo: entry.videoInfo });
    setIsFromHistory(true);
    setSavedHistoryId(id);
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

  if (showSettings) {
    return (
      <div style={wrapperStyle}>
        <SettingsView onBack={() => setShowSettings(false)} onLoadHistory={loadHistoryEntry} onLogout={() => location.reload()} />
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
      <ResultDashboard result={result} videoInfo={videoInfo} comments={comments} onBack={() => {
        if (isFromHistory) {
          // 履歴から来た場合は設定画面（履歴一覧）に戻る
          reset();
          setShowSettings(true);
          setIsFromHistory(false);
        } else {
          reset();
        }
        setSavedHistoryId(null);
      }} onSave={saveCurrentResult} onUnsave={unsaveCurrentResult} isSaved={!!savedHistoryId} onReanalyze={handleReanalyze} onOpenWindow={isStandaloneWindow ? undefined : async () => {
        // 現在の解析結果をlocalStorageに一時保存して新しいウィンドウで復元
        const stateToTransfer = {
          result,
          videoInfo,
          comments,
        };
        localStorage.setItem('yt-gemini-transfer-state', JSON.stringify(stateToTransfer));
        const url = chrome.runtime.getURL('sidepanel.html') + '?restore=1';
        await chrome.windows.create({ url, type: 'popup', width: 420, height: 720 });
        window.close();
      }} />
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
      <div className="flex justify-end gap-1 p-3" style={{ flexShrink: 0 }}>
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
      <div className="flex-1 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm space-y-5">
          {currentVideo ? (
            <>
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
              <button
                onClick={() => handleStartAnalysis(currentVideo.videoId, currentVideo.title)}
                className="w-full rounded-[20px] p-[2px] cursor-pointer transition-all hover:brightness-125 hover:shadow-[0_0_12px_2px_rgba(100,100,255,0.5)]"
                style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
              >
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] text-white font-semibold">
                  <Play className="w-5 h-5" />
                  {t('side.startAnalysis')} ({ANALYSIS_CREDIT_COST} {t('side.credits')})
                </div>
              </button>
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
              <button
                onClick={handleUrlAnalyze}
                disabled={!isValidUrl || urlLoading}
                className={`w-full rounded-[20px] p-[2px] transition-all ${
                  isValidUrl
                    ? 'cursor-pointer hover:brightness-125 hover:shadow-[0_0_12px_2px_rgba(100,100,255,0.5)]'
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
              >
                <div className={`flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] font-semibold ${isValidUrl ? 'text-white' : 'text-gray-500'}`}>
                  <Play className="w-5 h-5" />
                  {urlLoading ? t('side.loading') : `${t('side.startAnalysis')} (${ANALYSIS_CREDIT_COST} ${t('side.credits')})`}
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* フッター: セリフ + シェアアイコン + バージョン */}
      <div className="flex flex-col items-center gap-2 pb-4 pt-2 px-6" style={{ flexShrink: 0 }}>
        <p className={`text-[11px] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('share.yuchanAsk')}
        </p>
        <div className="flex items-center gap-4">
          {/* X (Twitter) */}
          <button
            onClick={() => {
              const text = encodeURIComponent(t('share.text'));
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/urayomi/placeholder');
              window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank');
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.x')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          {/* Instagram */}
          <button
            onClick={() => {
              window.open('https://www.instagram.com/', '_blank');
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.instagram')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </button>
          {/* URLコピー（ウェブストア） */}
          <button
            onClick={async () => {
              const storeUrl = 'https://chromewebstore.google.com/detail/urayomi/placeholder';
              await navigator.clipboard.writeText(storeUrl);
              showShareToast(t('share.copied'));
            }}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-gray-800 text-gray-400'}`}
            title={t('share.copyUrl')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
    </div>
  );
}

export default SidePanel;
