/**
 * Summary Tab コンポーネント
 */

import type { AnalysisResult } from '../../types';

interface SummaryTabProps {
  result: AnalysisResult;
}

/**
 * JSON文字列を整形して表示用のテキストに変換
 * Markdownコードブロック（```json ... ```）を検出してパースし、summaryフィールドのみを返す
 */
function formatSummary(summary: string): string {
  if (!summary || typeof summary !== 'string') {
    return '要約がありません';
  }

  let text = summary.trim();

  // ```json ... ``` コードブロックを検出して抽出（複数行対応、複数パターンを試す）
  let jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim();
  } else {
    // 貪欲マッチも試す
    jsonBlockMatch = text.match(/```json\s*([\s\S]*)\s*```/);
    if (jsonBlockMatch) {
      text = jsonBlockMatch[1].trim();
    } else {
      // ``` ... ``` コードブロックを検出（jsonラベルなし）
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
      } else {
        const codeBlockMatchGreedy = text.match(/```\s*([\s\S]*)\s*```/);
        if (codeBlockMatchGreedy) {
          text = codeBlockMatchGreedy[1].trim();
        }
      }
    }
  }

  // JSON文字列の場合はパース
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      // JSONの修正を試みる（不完全なJSONを修正）
      let jsonText = text;
      jsonText = jsonText.replace(/,\s*([}\]])/g, '$1'); // 末尾の余分なカンマを削除
      jsonText = jsonText.replace(/([,\[])\s*([}\]])/g, '$1$2'); // 空の配列/オブジェクトの修正
      
      const parsed = JSON.parse(jsonText);
      
      // summaryフィールドがある場合はそれを使用
      if (parsed.summary && typeof parsed.summary === 'string') {
        // エスケープシーケンスを実際の改行に変換
        let summaryText = parsed.summary.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        // 複数の連続する改行を1つに統一（見やすくするため）
        summaryText = summaryText.replace(/\n{3,}/g, '\n\n');
        return summaryText.trim();
      }
      
      // summaryフィールドがない場合は、オブジェクト全体を文字列化（通常は発生しない）
      console.warn('[SummaryTab] ⚠️ JSONにsummaryフィールドがありません:', parsed);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // JSONパースに失敗した場合は、エスケープシーケンスを変換して返す
      console.error('[SummaryTab] ❌ JSONパースに失敗:', e);
      console.error('[SummaryTab] Text preview:', text.substring(0, 200));
      return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    }
  }

  // エスケープシーケンスを実際の改行に変換
  return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

function SummaryTab({ result }: SummaryTabProps) {
  // デバッグ用ログ
  console.log('[SummaryTab] 📥 Received result:', result);
  console.log('[SummaryTab] result.sentiment:', result.sentiment);
  console.log('[SummaryTab] result.topics:', result.topics);
  console.log('[SummaryTab] result.summary type:', typeof result.summary);
  console.log('[SummaryTab] result.summary preview:', typeof result.summary === 'string' ? result.summary.substring(0, 200) : result.summary);

  // summaryが文字列の場合は整形（JSONコードブロックをパース）
  let formattedSummary: string;
  let extractedSentiment: { positive: number; negative: number; neutral: number } | null = null;
  let extractedTopics: string[] = [];

  if (typeof result.summary === 'string') {
    const summaryText = result.summary.trim();
    
    // JSONコードブロックを検出してパース（複数パターンを試す）
    let jsonText = null;
    
    // パターン1: ```json ... ``` (非貪欲)
    let jsonBlockMatch = summaryText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1].trim();
    } else {
      // パターン2: ```json ... ``` (貪欲)
      jsonBlockMatch = summaryText.match(/```json\s*([\s\S]*)\s*```/);
      if (jsonBlockMatch) {
        jsonText = jsonBlockMatch[1].trim();
      } else {
        // パターン3: ``` ... ``` (jsonラベルなし)
        const codeBlockMatch = summaryText.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1].trim();
        } else {
          const codeBlockMatchGreedy = summaryText.match(/```\s*([\s\S]*)\s*```/);
          if (codeBlockMatchGreedy) {
            jsonText = codeBlockMatchGreedy[1].trim();
          }
        }
      }
    }
    
    if (jsonText && (jsonText.startsWith('{') || jsonText.startsWith('['))) {
      try {
        // JSONの修正を試みる
        let cleanedJson = jsonText;
        cleanedJson = cleanedJson.replace(/,\s*([}\]])/g, '$1');
        cleanedJson = cleanedJson.replace(/([,\[])\s*([}\]])/g, '$1$2');
        
        const parsed = JSON.parse(cleanedJson);
        
        // summaryフィールドを抽出
        if (parsed.summary && typeof parsed.summary === 'string') {
          let summaryText = parsed.summary.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
          summaryText = summaryText.replace(/\n{3,}/g, '\n\n');
          formattedSummary = summaryText.trim();
        } else {
          formattedSummary = '要約がありません';
        }
        
        // sentimentを抽出
        if (parsed.sentiment && typeof parsed.sentiment === 'object' && !Array.isArray(parsed.sentiment)) {
          extractedSentiment = {
            positive: typeof parsed.sentiment.positive === 'number' ? parsed.sentiment.positive : (typeof parsed.sentiment.positive === 'string' ? parseFloat(parsed.sentiment.positive) || 0 : 0),
            negative: typeof parsed.sentiment.negative === 'number' ? parsed.sentiment.negative : (typeof parsed.sentiment.negative === 'string' ? parseFloat(parsed.sentiment.negative) || 0 : 0),
            neutral: typeof parsed.sentiment.neutral === 'number' ? parsed.sentiment.neutral : (typeof parsed.sentiment.neutral === 'string' ? parseFloat(parsed.sentiment.neutral) || 0 : 0),
          };
        }
        
        // topicsを抽出
        if (Array.isArray(parsed.topics)) {
          extractedTopics = parsed.topics.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0);
        }
        
        console.log('[SummaryTab] ✅ Extracted from JSON code block:', {
          hasSummary: !!formattedSummary,
          sentiment: extractedSentiment,
          topics: extractedTopics,
        });
      } catch (e) {
        console.error('[SummaryTab] ❌ Failed to parse JSON code block:', e);
        formattedSummary = formatSummary(result.summary);
      }
    } else {
      // JSONコードブロックがない場合は通常の処理
      formattedSummary = formatSummary(result.summary);
    }
  } else {
    formattedSummary = result.summary || '要約がありません';
  }

  // topicsが配列でない場合は空配列を使用
  // 抽出されたtopicsがある場合はそれを使用、なければresult.topicsを使用
  let topics: string[] = extractedTopics.length > 0 ? extractedTopics : [];
  if (topics.length === 0) {
    if (Array.isArray(result.topics)) {
      topics = result.topics.filter(topic => topic && typeof topic === 'string' && topic.trim().length > 0);
    } else if (typeof result.topics === 'string') {
      try {
        const parsed = JSON.parse(result.topics);
        topics = Array.isArray(parsed) ? parsed.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0) : [];
      } catch {
        topics = [];
      }
    }
  }

  // sentimentがオブジェクトでない場合はデフォルト値を使用
  // 抽出されたsentimentがある場合はそれを使用、なければresult.sentimentを使用
  let sentiment = extractedSentiment || { positive: 0, negative: 0, neutral: 0 };
  
  if (!extractedSentiment && result.sentiment && typeof result.sentiment === 'object' && !Array.isArray(result.sentiment)) {
    // オブジェクトの場合
    const sent = result.sentiment as any;
    sentiment = {
      positive: typeof sent.positive === 'number' ? sent.positive : (typeof sent.positive === 'string' ? parseFloat(sent.positive) || 0 : 0),
      negative: typeof sent.negative === 'number' ? sent.negative : (typeof sent.negative === 'string' ? parseFloat(sent.negative) || 0 : 0),
      neutral: typeof sent.neutral === 'number' ? sent.neutral : (typeof sent.neutral === 'string' ? parseFloat(sent.neutral) || 0 : 0),
    };
  } else if (!extractedSentiment && typeof result.sentiment === 'string') {
    // 文字列の場合
    try {
      const parsed = JSON.parse(result.sentiment);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        sentiment = {
          positive: typeof parsed.positive === 'number' ? parsed.positive : (typeof parsed.positive === 'string' ? parseFloat(parsed.positive) || 0 : 0),
          negative: typeof parsed.negative === 'number' ? parsed.negative : (typeof parsed.negative === 'string' ? parseFloat(parsed.negative) || 0 : 0),
          neutral: typeof parsed.neutral === 'number' ? parsed.neutral : (typeof parsed.neutral === 'string' ? parseFloat(parsed.neutral) || 0 : 0),
        };
      }
    } catch (e) {
      console.warn('[SummaryTab] sentiment文字列のパースに失敗:', e);
    }
  }
  
  console.log('[SummaryTab] 📊 Final extracted data:', {
    sentiment,
    topics,
    summaryLength: formattedSummary.length,
  });
  
  const { positive, negative, neutral } = sentiment;
  const total = positive + negative + neutral;
  const positivePercent = total > 0 ? (positive / total) * 100 : 0;
  const negativePercent = total > 0 ? (negative / total) * 100 : 0;
  const neutralPercent = total > 0 ? (neutral / total) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* 全体の要約 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">全体の要約</h3>
        <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
          <p className="text-gray-800 whitespace-pre-line leading-relaxed text-sm">
            {formattedSummary || '要約を取得できませんでした'}
          </p>
        </div>
      </div>

      {/* 感情分析 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">感情分析</h3>
        {/* 横棒グラフ（積み上げ式） */}
        <div className="mb-4">
          <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden flex">
            {positivePercent > 0 && (
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${positivePercent}%` }}
                title={`ポジティブ ${positivePercent.toFixed(1)}%`}
              />
            )}
            {negativePercent > 0 && (
              <div
                className="bg-red-500 h-full transition-all"
                style={{ width: `${negativePercent}%` }}
                title={`ネガティブ ${negativePercent.toFixed(1)}%`}
              />
            )}
            {neutralPercent > 0 && (
              <div
                className="bg-gray-400 h-full transition-all"
                style={{ width: `${neutralPercent}%` }}
                title={`ニュートラル ${neutralPercent.toFixed(1)}%`}
              />
            )}
          </div>
        </div>
        {/* 凡例 */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-gray-700">ポジティブ ({positivePercent.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-gray-700">ネガティブ ({negativePercent.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
            <span className="text-gray-700">ニュートラル ({neutralPercent.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* 主なトピック */}
      {topics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">主なトピック</h3>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium"
              >
                {typeof topic === 'string' ? topic : JSON.stringify(topic)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryTab;
