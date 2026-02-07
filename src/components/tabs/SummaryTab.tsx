/**
 * Summary Tab コンポーネント
 */

import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
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
  const { theme } = useThemeStore();
  const [hoveredSegment, setHoveredSegment] = useState<{
    label: string;
    percent: number;
  } | null>(null);
  
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

  // 要約の整形処理：冒頭の冗長なフレーズを削除し、句読点の後に改行を追加
  if (formattedSummary && typeof formattedSummary === 'string') {
    // 「このYouTube動画のコメントは」という冒頭フレーズを削除
    formattedSummary = formattedSummary.replace(/^このYouTube動画のコメントは[、。，．\s]*/i, '');
    
    // 丸の句読点（。）の後に改行を追加（ただし、既に改行がある場合は追加しない）
    formattedSummary = formattedSummary.replace(/。([^\n])/g, '。\n$1');
    
    // 余分な空白行を削除（3行以上連続する改行を2行に）
    formattedSummary = formattedSummary.replace(/\n{3,}/g, '\n\n');
    
    // 先頭と末尾の空白を削除
    formattedSummary = formattedSummary.trim();
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

  // トピックのテキストが長すぎる場合は短縮またはスキップ
  // 1行に収まるように、最大20文字程度に制限（絶対にはみ出さない安全な値）
  const MAX_TOPIC_LENGTH = 20;
  const processedTopics = topics
    .map(topic => {
      const topicStr = typeof topic === 'string' ? topic.trim() : String(topic).trim();
      // 長すぎる場合は短縮
      if (topicStr.length > MAX_TOPIC_LENGTH) {
        return topicStr.substring(0, MAX_TOPIC_LENGTH) + '...';
      }
      return topicStr;
    })
    .filter(topic => topic.length > 0); // 空のトピックを除外

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

  // 円グラフ用の計算
  const radius = 130; // 円の半径
  const centerX = 140;
  const centerY = 140;
  
  // 各セグメントの開始角度と終了角度を計算
  let currentAngle = -90; // 12時から開始
  const positiveAngle = (positivePercent / 100) * 360;
  const neutralAngle = (neutralPercent / 100) * 360;
  const negativeAngle = (negativePercent / 100) * 360;
  
  // 円グラフのアークパスを生成する関数（中心から始まる完全な円）
  const createPieArcPath = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    // 外側の円の座標
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    // 円グラフのパス（中心→外側の円弧→中心）
    return `M ${centerX} ${centerY} 
            L ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
            Z`;
  };

  return (
    <div className={`min-h-full ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* 全体の要約 */}
        <div className="space-y-4">
          <h2 className={`text-center text-xs uppercase tracking-widest ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            全体の要約
          </h2>
          <div className={`rounded-2xl p-8 ${
            theme === 'dark' 
              ? 'bg-[#1a1a1a] border border-gray-800 shadow-lg' 
              : 'bg-gray-50 border border-gray-200 shadow-md'
          }`}>
            <p className={`whitespace-pre-line leading-relaxed text-base ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}>
              {formattedSummary || '要約を取得できませんでした'}
            </p>
          </div>
        </div>

        {/* 感情分析 */}
        <div className="space-y-2">
          <h2 className={`text-center text-xs uppercase tracking-widest ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            感情分析
          </h2>
          <div className="flex flex-col items-center">
            <div className="relative w-80 h-80 flex items-center justify-center">
              <svg 
                width="280" 
                height="280" 
                className="transform"
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {/* ポジティブ */}
                {positivePercent > 0 && (
                  <path
                    d={createPieArcPath(currentAngle, currentAngle + positiveAngle)}
                    fill="#10B981"
                    className="transition-all cursor-pointer hover:opacity-90"
                    style={{ filter: hoveredSegment?.label === 'ポジティブ' ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' : 'none' }}
                    onMouseEnter={() => {
                      setHoveredSegment({
                        label: 'ポジティブ',
                        percent: positivePercent,
                      });
                    }}
                  />
                )}
                {/* ニュートラル */}
                {neutralPercent > 0 && (
                  <path
                    d={createPieArcPath(
                      currentAngle + positiveAngle,
                      currentAngle + positiveAngle + neutralAngle
                    )}
                    fill={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                    className="transition-all cursor-pointer hover:opacity-90"
                    style={{ filter: hoveredSegment?.label === 'ニュートラル' ? 'drop-shadow(0 0 8px rgba(156, 163, 175, 0.6))' : 'none' }}
                    onMouseEnter={() => {
                      setHoveredSegment({
                        label: 'ニュートラル',
                        percent: neutralPercent,
                      });
                    }}
                  />
                )}
                {/* ネガティブ */}
                {negativePercent > 0 && (
                  <path
                    d={createPieArcPath(
                      currentAngle + positiveAngle + neutralAngle,
                      currentAngle + positiveAngle + neutralAngle + negativeAngle
                    )}
                    fill="#EF4444"
                    className="transition-all cursor-pointer hover:opacity-90"
                    style={{ filter: hoveredSegment?.label === 'ネガティブ' ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' : 'none' }}
                    onMouseEnter={() => {
                      setHoveredSegment({
                        label: 'ネガティブ',
                        percent: negativePercent,
                      });
                    }}
                  />
                )}
              </svg>
              {/* 中心の表示（ホバー時のみ表示、小数点1桁） */}
              {hoveredSegment && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className={`text-5xl font-bold mb-1 ${
                    theme === 'dark' 
                      ? 'text-white' 
                      : hoveredSegment.label === 'ポジティブ'
                        ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]'
                        : hoveredSegment.label === 'ネガティブ'
                          ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]'
                          : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]'
                  }`}>
                    {hoveredSegment.percent.toFixed(1)}%
                  </div>
                  <div className={`text-base uppercase tracking-wider opacity-90 ${
                    theme === 'dark' 
                      ? 'text-white' 
                      : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                  }`}>
                    {hoveredSegment.label.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* 凡例（縦3列、中央揃えかつ左揃え） */}
          <div className="flex flex-col items-center gap-2 mt-2">
            {/* ポジティブ */}
            <div className="flex items-center gap-3 w-fit">
              <div className="w-4 h-4 rounded-full bg-[#10B981] flex-shrink-0"></div>
              <span className={`text-sm whitespace-nowrap text-left ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`} style={{ minWidth: '80px' }}>
                ポジティブ
              </span>
              <span className={`text-sm font-semibold text-right ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`} style={{ minWidth: '50px' }}>
                {positivePercent.toFixed(1)}%
              </span>
            </div>
            {/* ニュートラル */}
            <div className="flex items-center gap-3 w-fit">
              <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                theme === 'dark' ? 'bg-[#9CA3AF]' : 'bg-[#6B7280]'
              }`}></div>
              <span className={`text-sm whitespace-nowrap text-left ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`} style={{ minWidth: '80px' }}>
                ニュートラル
              </span>
              <span className={`text-sm font-semibold text-right ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`} style={{ minWidth: '50px' }}>
                {neutralPercent.toFixed(1)}%
              </span>
            </div>
            {/* ネガティブ */}
            <div className="flex items-center gap-3 w-fit">
              <div className="w-4 h-4 rounded-full bg-[#EF4444] flex-shrink-0"></div>
              <span className={`text-sm whitespace-nowrap text-left ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`} style={{ minWidth: '80px' }}>
                ネガティブ
              </span>
              <span className={`text-sm font-semibold text-right ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`} style={{ minWidth: '50px' }}>
                {negativePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 主なトピック */}
        {topics.length > 0 && (
          <div className="space-y-6">
            <h2 className={`text-center text-xs uppercase tracking-widest ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              主なトピック
            </h2>
            <div className="space-y-3">
              {processedTopics.slice(0, 10).map((topic, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl transition-all hover:scale-[1.01] w-full overflow-hidden ${
                    theme === 'dark' 
                      ? 'bg-[#1a1a1a] border border-gray-800 hover:border-gray-700' 
                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`text-sm text-center whitespace-nowrap ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`} style={{ 
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    boxSizing: 'border-box'
                  }}>
                    {topic}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryTab;
