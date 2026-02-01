/**
 * Side Panel メインコンポーネント
 */

import { useEffect, useCallback } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import { getSettings } from '../utils/storage';
import { analyzeViaServer } from '../services/apiServer';
import LoadingView from './LoadingView';
import ResultDashboard from './ResultDashboard';

function SidePanel() {
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
  } = useAnalysisStore();

  const handleStartAnalysis = useCallback(
    async (videoId: string, title?: string) => {
      try {
        startAnalysis(videoId, title);

        // 設定を取得（将来的にパラメータとして使用）
        await getSettings();

        // サーバー側で処理（コメント取得とAI解析）
        updateProgress({
          stage: 'fetching',
          message: 'サーバーで処理中...',
          current: 0,
          total: 100,
        });

        const analysisResult = await analyzeViaServer(videoId, []);

        // サーバーから返された結果を使用
        if (analysisResult.comments) {
          setComments(analysisResult.comments);
        }

        setResult(analysisResult.result);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '不明なエラーが発生しました';

        // クレジット不足エラーの場合
        if (errorMessage.includes('クレジット')) {
          setError(
            errorMessage + ' 設定画面でクレジットを購入してください。'
          );
        } else {
          setError(errorMessage);
        }
      }
    },
    [startAnalysis, updateProgress, setComments, setResult, setError]
  );

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

    // 初回チェック
    checkPendingAnalysis();

    // storage変更を監視
    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.pendingAnalysis?.newValue) {
        const { videoId, title } = changes.pendingAnalysis.newValue;
        chrome.storage.local.remove(['pendingAnalysis']);
        handleStartAnalysis(videoId, title);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [handleStartAnalysis]);

  const handleOpenSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  };

  if (error) {
    const isApiKeyError = error.includes('API Key');
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">エラー</h3>
          <p className="text-red-600 text-sm mb-3">{error}</p>
          {isApiKeyError && (
            <button
              onClick={handleOpenSettings}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              設定画面を開く
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return <LoadingView progress={progress} />;
  }

  if (result) {
    return (
      <ResultDashboard result={result} videoInfo={videoInfo} comments={comments} />
    );
  }

  return (
    <div className="p-6 text-center space-y-4">
      <p className="text-gray-500">
        解析を開始するには、拡張機能のアイコンをクリックしてください。
      </p>
      <button
        onClick={handleOpenSettings}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
      >
        設定を開く
      </button>
    </div>
  );
}

export default SidePanel;
