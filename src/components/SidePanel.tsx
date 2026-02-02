/**
 * Side Panel メインコンポーネント
 */

import { useEffect, useCallback } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
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

        // サーバー側で処理（コメント取得とAI解析）
        // デフォルト値を使用: コメント数上限2000件、要約の長さmedium
        updateProgress({
          stage: 'fetching',
          message: 'サーバーで処理中...',
          current: 0,
          total: 100,
        });

        const analysisResult = await analyzeViaServer(
          videoId,
          [],
          2000, // デフォルト: 2000件
          'medium' // デフォルト: medium
        );

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
