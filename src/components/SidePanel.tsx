/**
 * Side Panel メインコンポーネント
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { Play, Link, Settings } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';
import { analyzeViaServer, getVideoInfo, verifySession } from '../services/apiServer';
import type { User } from '../types';
import { saveHistory, getHistoryEntry } from '../services/historyStorage';
import { getCurrentYouTubeVideo, extractVideoId } from '../utils/youtube';
import { ANALYSIS_CREDIT_COST } from '../constants';
import { useTranslation } from '../i18n/useTranslation';
import { getLanguage } from '../i18n/useTranslation';
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

      try {
        startAnalysis(videoId, title);

        // 進捗シミュレーション用の変数
        let currentProgress = 1; // 1%から開始
        const totalProgress = 100;
        let isAnalyzingPhase = false; // AI解析フェーズかどうか

        // 進捗更新関数
        const updateProgressTimer = () => {
          if (!isAnalyzingPhase && currentProgress < 60) {
            // コメント取得フェーズ（1-60%）
            currentProgress += 2; // 2%ずつ増加
            updateProgress({
              stage: 'fetching',
              message: t('side.serverProcessing'),
              current: currentProgress,
              total: totalProgress,
            });
          } else if (currentProgress < 98) {
            // AI解析フェーズ（60-98%）
            isAnalyzingPhase = true;
            currentProgress += 1; // 1%ずつ増加（AI解析は時間がかかるため）
            updateProgress({
              stage: 'analyzing',
              message: t('side.aiAnalyzing'),
              current: currentProgress,
              total: totalProgress,
            });
          } else {
            // 98%で停止（サーバー側の処理完了を待つ）
            if (progressTimerRef.current !== null) {
              clearInterval(progressTimerRef.current);
              progressTimerRef.current = null;
            }
          }
        };

        // 進捗を初期化
        updateProgress({
          stage: 'fetching',
          message: t('side.serverProcessing'),
          current: 1,
          total: 100,
        });

        // 進捗タイマーを開始（300msごとに更新）
        progressTimerRef.current = window.setInterval(updateProgressTimer, 300);

        // サーバー側で処理（コメント取得とAI解析）
        // デフォルト値を使用: コメント数上限2000件、要約の長さmedium
        const analysisResult = await analyzeViaServer(
          videoId,
          [],
          2000, // デフォルト: 2000件
          'medium', // デフォルト: medium
          abortController.signal,
          getLanguage()
        );

        // サーバー側の処理が完了したら進捗を100%に設定
        if (progressTimerRef.current !== null) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        
        // 少し遅延を入れて100%に達するアニメーションを表示
        await new Promise(resolve => setTimeout(resolve, 300));
        updateProgress({
          stage: 'analyzing',
          message: t('side.complete'),
          current: 100,
          total: 100,
        });
        
        // 100%表示を少し維持してから結果を表示
        await new Promise(resolve => setTimeout(resolve, 500));

        // サーバーから返された結果を使用
        // analyzeViaServerはdata全体を返すので、resultプロパティを確認
        if (analysisResult.comments) {
          setComments(analysisResult.comments);
        }

        // resultプロパティがある場合はそれを使用、なければanalysisResult全体を使用
        let resultData = analysisResult.result || analysisResult;
        
        // resultDataがJSON文字列の場合はパースする
        if (typeof resultData === 'string') {
          try {
            resultData = JSON.parse(resultData);
          } catch (e) {
            console.warn('Failed to parse result as JSON:', e);
          }
        }
        
        // resultData全体がJSONコードブロック形式の文字列の場合を処理
        if (typeof resultData === 'string') {
          let dataText = resultData.trim();
          
          // ```json ... ``` コードブロックを検出
          const jsonBlockMatch = dataText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch) {
            dataText = jsonBlockMatch[1].trim();
          } else {
            const codeBlockMatch = dataText.match(/```\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
              dataText = codeBlockMatch[1].trim();
            }
          }
          
          if (dataText.startsWith('{') || dataText.startsWith('[')) {
            try {
              let cleanedJson = dataText;
              cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, '$1');
              cleanedJson = cleanedJson.replace(/([,\[])\s*([}\]])/g, '$1$2');
              
              resultData = JSON.parse(cleanedJson);
              console.log('[SidePanel] ✅ Parsed resultData from JSON code block');
            } catch (e) {
              console.warn('[SidePanel] Failed to parse resultData as JSON:', e);
            }
          }
        }
        
        // summaryがJSON文字列またはコードブロックの場合はパースして整形
        if (resultData && typeof resultData.summary === 'string') {
          let summaryText = resultData.summary.trim();
          
          console.log('[SidePanel] 🔍 Processing summary:', {
            length: summaryText.length,
            startsWithJsonBlock: summaryText.includes('```json'),
            preview: summaryText.substring(0, 150),
          });
          
          // ```json ... ``` コードブロックを検出（複数行対応、貪欲マッチも試す）
          let jsonText: string | null = null;
          
          // パターン1: ```json ... ``` (非貪欲)
          let jsonBlockMatch = summaryText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonBlockMatch) {
            jsonText = jsonBlockMatch[1].trim();
            console.log('[SidePanel] ✅ Found ```json code block (non-greedy)');
          } else {
            // パターン2: ```json ... ``` (貪欲 - 最後の```まで)
            jsonBlockMatch = summaryText.match(/```json\s*([\s\S]*)\s*```/);
            if (jsonBlockMatch) {
              jsonText = jsonBlockMatch[1].trim();
              console.log('[SidePanel] ✅ Found ```json code block (greedy)');
            } else {
              // パターン3: ``` ... ``` (jsonラベルなし)
              const codeBlockMatch = summaryText.match(/```\s*([\s\S]*?)\s*```/);
              if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
                console.log('[SidePanel] ✅ Found ``` code block');
              }
            }
          }
          
          // JSON文字列の場合はパース
          if (jsonText && (jsonText.startsWith('{') || jsonText.startsWith('['))) {
            try {
              // JSONの修正を試みる（不完全なJSONを修正）
              let cleanedJson = jsonText;
              cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, '$1'); // 末尾の余分なカンマを削除
              cleanedJson = cleanedJson.replace(/([,\[])\s*([}\]])/g, '$1$2'); // 空の配列/オブジェクトの修正
              
              console.log('[SidePanel] 🔧 Attempting to parse JSON (first 300 chars):', cleanedJson.substring(0, 300));
              
              const parsedSummary = JSON.parse(cleanedJson);
              
              console.log('[SidePanel] ✅ JSON parsed successfully:', {
                hasSummary: !!parsedSummary.summary,
                hasSentiment: !!parsedSummary.sentiment,
                hasTopics: !!parsedSummary.topics,
                sentiment: parsedSummary.sentiment,
                topics: parsedSummary.topics,
              });
              
              // パースした結果をresultDataにマージ（優先順位: parsedSummary > resultData）
              resultData = {
                ...resultData,
                summary: parsedSummary.summary || resultData.summary,
                sentiment: parsedSummary.sentiment || resultData.sentiment,
                topics: parsedSummary.topics || resultData.topics,
                hiddenGems: parsedSummary.hiddenGems || resultData.hiddenGems,
                controversy: parsedSummary.controversy || resultData.controversy,
                keywords: parsedSummary.keywords || resultData.keywords,
              };
            } catch (e) {
              // JSONパースに失敗した場合はそのまま使用
              console.error('[SidePanel] ❌ Failed to parse summary as JSON:', e);
              console.error('[SidePanel] Error details:', {
                message: e instanceof Error ? e.message : String(e),
                jsonTextLength: jsonText.length,
                jsonTextPreview: jsonText.substring(0, 500),
              });
              // パースに失敗した場合は、生テキストをそのまま使用
              resultData.summary = summaryText;
            }
          } else if (summaryText.startsWith('{') || summaryText.startsWith('[')) {
            // コードブロックがなくても、JSON形式の場合はパースを試みる
            try {
              let cleanedJson = summaryText;
              cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, '$1');
              cleanedJson = cleanedJson.replace(/([,\[])\s*([}\]])/g, '$1$2');
              
              const parsedSummary = JSON.parse(cleanedJson);
              
              resultData = {
                ...resultData,
                summary: parsedSummary.summary || resultData.summary,
                sentiment: parsedSummary.sentiment || resultData.sentiment,
                topics: parsedSummary.topics || resultData.topics,
                hiddenGems: parsedSummary.hiddenGems || resultData.hiddenGems,
                controversy: parsedSummary.controversy || resultData.controversy,
                keywords: parsedSummary.keywords || resultData.keywords,
              };
              
              console.log('[SidePanel] ✅ Parsed JSON without code block');
            } catch (e) {
              console.warn('[SidePanel] ⚠️ Failed to parse as JSON:', e);
            }
          } else {
            // コードブロックもJSON形式でもない場合は、そのまま使用
            resultData.summary = summaryText;
          }
        }
        
        // デバッグ用ログ
        console.log('[SidePanel] 📊 Final resultData structure:', {
          hasSummary: !!resultData.summary,
          summaryType: typeof resultData.summary,
          summaryPreview: typeof resultData.summary === 'string' ? resultData.summary.substring(0, 100) : resultData.summary,
          hasSentiment: !!resultData.sentiment,
          sentiment: resultData.sentiment,
          hasTopics: !!resultData.topics,
          topics: resultData.topics,
        });
        
        setResult(resultData);
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
    saveHistory({
      id: `${Date.now()}`,
      videoId: videoInfo.videoId,
      videoTitle: videoInfo.title || videoInfo.videoId,
      analyzedAt: new Date().toISOString(),
      result,
      comments,
      videoInfo,
    });
  }, [result, comments, videoInfo]);

  // 履歴から読み込み
  const loadHistoryEntry = useCallback((id: string) => {
    const entry = getHistoryEntry(id);
    if (!entry) return;
    setComments(entry.comments);
    setResult(entry.result);
    // videoInfoはstartAnalysisで設定されるが、履歴読み込み時は直接storeに設定
    useAnalysisStore.setState({ videoInfo: entry.videoInfo });
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
        <img
          src={chrome.runtime.getURL('icons/logo-urayomi.png')}
          alt="ウラヨミ！"
          className="h-16 mb-2"
        />
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
      <ResultDashboard result={result} videoInfo={videoInfo} comments={comments} onBack={reset} onSave={saveCurrentResult} />
    );
  }

  return (
    <div style={wrapperStyle} className="flex flex-col">
      {/* 設定ボタン（右上） */}
      <div className="flex justify-end p-3" style={{ flexShrink: 0 }}>
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
              {/* マスコットキャラクター */}
              <div className="flex justify-center">
                <img
                  src={chrome.runtime.getURL('icons/mascot.png')}
                  alt="ウラヨミ！ マスコット"
                  className="w-48 animate-bounce-in"
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
    </div>
  );
}

export default SidePanel;
