/**
 * Summary Tab コンポーネント
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AnalysisResult } from '../../types';
import { useDesignStore, isLightMode } from '../../store/designStore';
import { useCharacterStore } from '../../store/characterStore';
import { useTranslation } from '../../i18n/useTranslation';
import { rewriteWithCharacter } from '../../services/apiServer';
import mascotGirl from '../../icons/mascot-girl.png';
import tsubechanSummary from '../../icons/tsubechan-summary.png';
import tsubechanSentiment from '../../icons/tsubechan-sentiment.png';
import tsubechanTopics from '../../icons/tsubechan-topics.png';

/** ホバー時にSpotify風マーキースクロールするテキスト */
function MarqueeText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [scrollDuration, setScrollDuration] = useState(5);

  const checkOverflow = useCallback(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      const overflows = textWidth > containerWidth;
      setIsOverflowing(overflows);
      if (overflows) {
        const overflow = textWidth - containerWidth;
        setScrollDuration(Math.max(4, overflow / 22));
      }
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text, checkOverflow]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, overflow: 'hidden', position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          animation: isOverflowing && isHovered
            ? `marquee-scroll ${scrollDuration}s linear infinite`
            : 'none',
          paddingRight: isOverflowing && isHovered ? '3em' : '0',
        }}
      >
        {text}
      </span>
      {/* CSSの場合のellipsis表示用オーバーレイ */}
      {isOverflowing && !isHovered && (
        <span style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '3em',
          background: 'linear-gradient(to right, transparent, var(--topic-bg, #1a1a1a))',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

interface SummaryTabProps {
  result: AnalysisResult;
}

/**
 * JSON文字列を整形して表示用のテキストに変換
 * Markdownコードブロック（```json ... ```）を検出してパースし、summaryフィールドのみを返す
 */
function formatSummary(summary: string): string {
  if (!summary || typeof summary !== 'string') {
    return '';
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
  const { t, lang } = useTranslation();
  const { bgMode } = useDesignStore();
  const isLight = isLightMode(bgMode);
  const { summaryCharacterMode, setSummaryCharacterMode } = useCharacterStore();
  const [characterSummary, setCharacterSummary] = useState<string | null>(null);
  const [characterLoading, setCharacterLoading] = useState(false);
  const [cachedOriginal, setCachedOriginal] = useState<string>('');
  const [hoveredSegment, setHoveredSegment] = useState<{
    label: string;
    percent: number;
  } | null>(null);

  // キャラクターモードON時にアニメーションを再発火させるキー
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (summaryCharacterMode) {
      setAnimKey((k) => k + 1);
    }
  }, [summaryCharacterMode]);

  // デバッグ用ログ
  console.log('[SummaryTab] 📥 Received result:', result);
  console.log('[SummaryTab] result.sentiment:', result.sentiment);
  console.log('[SummaryTab] result.topics:', result.topics);
  console.log('[SummaryTab] result.summary type:', typeof result.summary);
  console.log('[SummaryTab] result.summary preview:', typeof result.summary === 'string' ? result.summary.substring(0, 200) : result.summary);

  // 言語に応じたsummaryとtopicsを選択（バイリンガル対応）
  const rawSummary = (lang === 'en' && result.summary_en) ? result.summary_en : result.summary;
  const rawTopics = (lang === 'en' && result.topics_en) ? result.topics_en : result.topics;

  // summaryが文字列の場合は整形（JSONコードブロックをパース）
  let formattedSummary: string;
  let extractedSentiment: { positive: number; negative: number; neutral: number } | null = null;
  let extractedTopics: string[] = [];

  if (typeof rawSummary === 'string') {
    const summaryText = rawSummary.trim();

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
          formattedSummary = t('summary.noSummary');
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
        formattedSummary = formatSummary(rawSummary);
      }
    } else {
      // JSONコードブロックがない場合は通常の処理
      formattedSummary = formatSummary(rawSummary);
    }
  } else {
    formattedSummary = rawSummary || t('summary.noSummary');
  }

  // 要約の整形処理
  if (formattedSummary && typeof formattedSummary === 'string') {
    if (lang === 'ja') {
      // 日本語のみ：冒頭の冗長なフレーズを削除し、句読点の後に改行を追加
      formattedSummary = formattedSummary.replace(/^このYouTube動画のコメントは[、。，．\s]*/i, '');
      formattedSummary = formattedSummary.replace(/。([^\n])/g, '。\n$1');
    }

    // 余分な空白行を削除（3行以上連続する改行を2行に）
    formattedSummary = formattedSummary.replace(/\n{3,}/g, '\n\n');

    // 先頭と末尾の空白を削除
    formattedSummary = formattedSummary.trim();
  }

  // topicsが配列でない場合は空配列を使用
  // 抽出されたtopicsがある場合はそれを使用、なければresult.topicsを使用
  let topics: string[] = extractedTopics.length > 0 ? extractedTopics : [];
  if (topics.length === 0) {
    if (Array.isArray(rawTopics)) {
      topics = rawTopics.filter(topic => topic && typeof topic === 'string' && topic.trim().length > 0);
    } else if (typeof rawTopics === 'string') {
      try {
        const parsed = JSON.parse(rawTopics);
        topics = Array.isArray(parsed) ? parsed.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0) : [];
      } catch {
        topics = [];
      }
    }
  }

  // トピックの空文字を除外（全文を保持し、表示はCSSで制御）
  const processedTopics = topics
    .map(topic => (typeof topic === 'string' ? topic.trim() : String(topic).trim()))
    .filter(topic => topic.length > 0);

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

  // キャラクターモード: 要約が変わったらキャッシュをクリア
  useEffect(() => {
    if (formattedSummary !== cachedOriginal) {
      setCharacterSummary(null);
      setCachedOriginal(formattedSummary);
    }
  }, [formattedSummary, cachedOriginal]);

  // キャラクターモードON時にGeminiで口調変換（キャッシュがあればAPIを呼ばない）
  const { cacheSummary, getCachedSummary } = useCharacterStore();

  useEffect(() => {
    if (!summaryCharacterMode || !formattedSummary || characterSummary !== null) return;

    // キャッシュを先にチェック
    const cached = getCachedSummary(formattedSummary);
    if (cached) {
      setCharacterSummary(cached);
      return;
    }

    let cancelled = false;
    setCharacterLoading(true);

    rewriteWithCharacter(formattedSummary, 'tsubechan', lang)
      .then((rewritten) => {
        if (!cancelled) {
          setCharacterSummary(rewritten);
          // キャッシュに保存
          cacheSummary(formattedSummary, rewritten);
        }
      })
      .catch((err) => {
        console.error('[SummaryTab] Character rewrite failed:', err);
        if (!cancelled) {
          setCharacterSummary(formattedSummary);
        }
      })
      .finally(() => {
        if (!cancelled) setCharacterLoading(false);
      });

    return () => { cancelled = true; };
  }, [summaryCharacterMode, formattedSummary, characterSummary, lang, getCachedSummary, cacheSummary]);

  // 表示する要約テキスト
  const displaySummary = summaryCharacterMode && characterSummary
    ? characterSummary
    : formattedSummary;

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
    <div className="min-h-full bg-inherit">
      <div className="max-w-4xl mx-auto px-6 pt-3 pb-8 space-y-6">
        {/* キャラクターモード トグル */}
        <div className="flex items-center justify-end gap-3 -mb-2">
          <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            {t('character.toggle')}
          </span>
          <button
            onClick={() => setSummaryCharacterMode(!summaryCharacterMode)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              summaryCharacterMode
                ? 'bg-pink-500'
                : isLight ? 'bg-gray-300' : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                summaryCharacterMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* キャラクターモード時のタイトル */}
        {summaryCharacterMode && (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <img
                src={mascotGirl}
                alt="Yu-chan"
                className="w-9 h-9 flex-shrink-0 rounded-full object-cover"
              />
              <h2 className={`text-2xl font-bold whitespace-nowrap ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {t('character.yuchanSummary')}
              </h2>
            </div>
          </div>
        )}

        {/* 全体の要約 */}
        <div className="space-y-4">
          {summaryCharacterMode ? (
            /* キャラクターモード */
            <>
              {/* キャラ+吹き出し一体画像（ステッカー＋ポップイン） */}
              <div key={`summary-${animKey}`} className="flex justify-center px-2 py-1 animate-bounce-in" style={{ animationFillMode: 'both' }}>
                <img
                  src={tsubechanSummary}
                  alt={t('character.summaryBubble')}
                  className="w-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 0 #fff) drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(1.5px 1.5px 0 #fff) drop-shadow(-1.5px 1.5px 0 #fff) drop-shadow(1.5px -1.5px 0 #fff) drop-shadow(-1.5px -1.5px 0 #fff)',
                  }}
                />
              </div>
              {/* 要約テキスト */}
              <div className={`rounded-2xl p-6 shadow-lg ${isLight ? 'bg-pink-50 border border-pink-200' : 'bg-[#4a1942] border border-pink-800/50'}`}>
                {characterLoading ? (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                    <span className={`text-sm ${isLight ? 'text-pink-600' : 'text-pink-300'}`}>
                      {lang === 'ja' ? '夕ちゃんが要約中...' : 'Yu-chan is summarizing...'}
                    </span>
                  </div>
                ) : (
                  <p className={`whitespace-pre-line leading-relaxed text-base ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    {displaySummary || t('summary.noSummaryAvailable')}
                  </p>
                )}
              </div>
            </>
          ) : (
            /* 通常モード */
            <>
              <h2 className={`text-center text-xs uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('summary.overallSummary')}
              </h2>
              <div className={`rounded-2xl p-8 shadow-lg ${isLight ? 'bg-gray-50 border border-gray-200' : 'bg-[#1a1a1a] border border-gray-800'}`}>
                <p className={`whitespace-pre-line leading-relaxed text-base ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  {formattedSummary || t('summary.noSummaryAvailable')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* 感情分析 */}
        <div className="space-y-2">
          {summaryCharacterMode ? (
            /* キャラクターモード: 一体画像（ステッカー＋スクロールポップイン） */
            <>
              <div key={`sentiment-${animKey}`} className="flex justify-center px-2 py-1 animate-bounce-in" style={{ animationFillMode: 'both' }}>
                <img
                  src={tsubechanSentiment}
                  alt={t('summary.sentimentAnalysis')}
                  className="w-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 0 #fff) drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(1.5px 1.5px 0 #fff) drop-shadow(-1.5px 1.5px 0 #fff) drop-shadow(1.5px -1.5px 0 #fff) drop-shadow(-1.5px -1.5px 0 #fff)',
                  }}
                />
              </div>
            </>
          ) : (
            <h2 className={`text-center text-xs uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('summary.sentimentAnalysis')}
            </h2>
          )}
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
                    style={{ filter: hoveredSegment?.label === t('summary.positive') ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' : 'none' }}
                    onMouseEnter={() => {
                      setHoveredSegment({
                        label: t('summary.positive'),
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
                    fill="#9CA3AF"
                    className="transition-all cursor-pointer hover:opacity-90"
                    style={{ filter: hoveredSegment?.label === t('summary.neutral') ? 'drop-shadow(0 0 8px rgba(156, 163, 175, 0.6))' : 'none' }}
                    onMouseEnter={() => {
                      setHoveredSegment({
                        label: t('summary.neutral'),
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
                    style={{ filter: hoveredSegment?.label === t('summary.negative') ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' : 'none' }}
                    onMouseEnter={() => {
                      setHoveredSegment({
                        label: t('summary.negative'),
                        percent: negativePercent,
                      });
                    }}
                  />
                )}
              </svg>
              {/* 中心の表示（ホバー時のみ表示、小数点1桁） */}
              {hoveredSegment && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className={`text-5xl font-bold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {hoveredSegment.percent.toFixed(1)}%
                  </div>
                  <div className={`text-base uppercase tracking-wider opacity-90 ${isLight ? 'text-gray-700' : 'text-white'}`}>
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
              <span className={`text-sm whitespace-nowrap text-left ${isLight ? 'text-gray-600' : 'text-gray-300'}`} style={{ minWidth: '80px' }}>
                {t('summary.positive')}
              </span>
              <span className={`text-sm font-semibold text-right ${isLight ? 'text-gray-900' : 'text-white'}`} style={{ minWidth: '50px' }}>
                {positivePercent.toFixed(1)}%
              </span>
            </div>
            {/* ニュートラル */}
            <div className="flex items-center gap-3 w-fit">
              <div className="w-4 h-4 rounded-full flex-shrink-0 bg-[#9CA3AF]"></div>
              <span className={`text-sm whitespace-nowrap text-left ${isLight ? 'text-gray-600' : 'text-gray-300'}`} style={{ minWidth: '80px' }}>
                {t('summary.neutral')}
              </span>
              <span className={`text-sm font-semibold text-right ${isLight ? 'text-gray-900' : 'text-white'}`} style={{ minWidth: '50px' }}>
                {neutralPercent.toFixed(1)}%
              </span>
            </div>
            {/* ネガティブ */}
            <div className="flex items-center gap-3 w-fit">
              <div className="w-4 h-4 rounded-full bg-[#EF4444] flex-shrink-0"></div>
              <span className={`text-sm whitespace-nowrap text-left ${isLight ? 'text-gray-600' : 'text-gray-300'}`} style={{ minWidth: '80px' }}>
                {t('summary.negative')}
              </span>
              <span className={`text-sm font-semibold text-right ${isLight ? 'text-gray-900' : 'text-white'}`} style={{ minWidth: '50px' }}>
                {negativePercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 主なトピック */}
        {topics.length > 0 && (
          <div className="space-y-6">
            {summaryCharacterMode ? (
              /* キャラクターモード: 一体画像（ステッカー＋スクロールポップイン） */
              <div key={`topics-${animKey}`} className="flex justify-center px-2 py-1 animate-bounce-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
                <img
                  src={tsubechanTopics}
                  alt={t('summary.mainTopics')}
                  className="w-full object-contain"
                  style={{
                    filter: 'drop-shadow(0 0 0 #fff) drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(1.5px 1.5px 0 #fff) drop-shadow(-1.5px 1.5px 0 #fff) drop-shadow(1.5px -1.5px 0 #fff) drop-shadow(-1.5px -1.5px 0 #fff)',
                  }}
                />
              </div>
            ) : (
              <h2 className={`text-center text-xs uppercase tracking-widest ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('summary.mainTopics')}
              </h2>
            )}
            <div className="space-y-3">
              {processedTopics.slice(0, 10).map((topic, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl transition-all hover:scale-[1.01] w-full overflow-hidden ${
                    summaryCharacterMode
                      ? isLight ? 'bg-pink-50 border border-pink-200 hover:border-pink-300' : 'bg-[#4a1942] border border-pink-800/50 hover:border-pink-700'
                      : isLight ? 'bg-gray-50 border border-gray-200 hover:border-gray-300' : 'bg-[#1a1a1a] border border-gray-800 hover:border-gray-700'
                  }`}
                  style={{ '--topic-bg': isLight ? (summaryCharacterMode ? '#fdf2f8' : '#f9fafb') : (summaryCharacterMode ? '#4a1942' : '#1a1a1a') } as React.CSSProperties}
                >
                  <MarqueeText
                    text={topic}
                    className={`text-sm text-center ${isLight ? 'text-gray-800' : 'text-white'}`}
                    style={{ maxWidth: '100%', boxSizing: 'border-box' }}
                  />
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
