/**
 * Summary Tab コンポーネント
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { AnalysisResult } from '../../types';
import { useDesignStore, isLightMode } from '../../store/designStore';
import { useCharacterStore } from '../../store/characterStore';
import { useTranslation } from '../../i18n/useTranslation';
import { rewriteWithCharacter } from '../../services/apiServer';
import { extractJsonText, repairJson } from '../../utils/jsonParser';
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
 * jsonParser.tsの共通ユーティリティを使用
 */
function formatSummary(summary: string): string {
  if (!summary || typeof summary !== 'string') {
    return '';
  }

  const text = extractJsonText(summary);

  // JSON文字列の場合はパース
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const repaired = repairJson(text);
      const parsed = JSON.parse(repaired);

      if (parsed.summary && typeof parsed.summary === 'string') {
        let summaryText = parsed.summary.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        summaryText = summaryText.replace(/\n{3,}/g, '\n\n');
        return summaryText.trim();
      }

      return JSON.stringify(parsed, null, 2);
    } catch {
      return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    }
  }

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

  // 言語に応じたsummaryとtopicsを選択（バイリンガル対応）
  const rawSummary = (lang === 'en' && result.summary_en) ? result.summary_en : result.summary;
  const rawTopics = (lang === 'en' && result.topics_en) ? result.topics_en : result.topics;

  // === useMemoでサマリー処理をメモ化 ===
  const { formattedSummary, extractedSentiment, extractedTopics } = useMemo(() => {
    let summary: string;
    let sentimentData: { positive: number; negative: number; neutral: number } | null = null;
    let topicsData: string[] = [];

    if (typeof rawSummary === 'string') {
      const jsonText = extractJsonText(rawSummary);

      if (jsonText && (jsonText.startsWith('{') || jsonText.startsWith('['))) {
        try {
          const repaired = repairJson(jsonText);
          const parsed = JSON.parse(repaired);

          if (parsed.summary && typeof parsed.summary === 'string') {
            let s = parsed.summary.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            s = s.replace(/\n{3,}/g, '\n\n');
            summary = s.trim();
          } else {
            summary = t('summary.noSummary');
          }

          if (parsed.sentiment && typeof parsed.sentiment === 'object' && !Array.isArray(parsed.sentiment)) {
            const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) || 0 : 0);
            sentimentData = {
              positive: toNum(parsed.sentiment.positive),
              negative: toNum(parsed.sentiment.negative),
              neutral: toNum(parsed.sentiment.neutral),
            };
          }

          if (Array.isArray(parsed.topics)) {
            topicsData = parsed.topics.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0);
          }
        } catch {
          summary = formatSummary(rawSummary);
        }
      } else {
        summary = formatSummary(rawSummary);
      }
    } else {
      summary = rawSummary || t('summary.noSummary');
    }

    // 要約の整形処理
    if (summary && typeof summary === 'string') {
      if (lang === 'ja') {
        summary = summary.replace(/^このYouTube動画のコメントは[、。，．\s]*/i, '');
        summary = summary.replace(/。([^\n])/g, '。\n$1');
      }
      summary = summary.replace(/\n{3,}/g, '\n\n').trim();
    }

    return { formattedSummary: summary!, extractedSentiment: sentimentData, extractedTopics: topicsData };
  }, [rawSummary, lang, t]);

  // === useMemoでトピック処理をメモ化 ===
  const processedTopics = useMemo(() => {
    let topics: string[] = extractedTopics.length > 0 ? extractedTopics : [];
    if (topics.length === 0) {
      if (Array.isArray(rawTopics)) {
        topics = rawTopics.filter((topic: any) => topic && typeof topic === 'string' && topic.trim().length > 0);
      } else if (typeof rawTopics === 'string') {
        try {
          const parsed = JSON.parse(rawTopics);
          topics = Array.isArray(parsed) ? parsed.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0) : [];
        } catch {
          topics = [];
        }
      }
    }
    return topics
      .map(topic => (typeof topic === 'string' ? topic.trim() : String(topic).trim()))
      .filter(topic => topic.length > 0);
  }, [extractedTopics, rawTopics]);

  // === useMemoで感情分析をメモ化 ===
  const sentiment = useMemo(() => {
    if (extractedSentiment) return extractedSentiment;

    const toNum = (v: any) => typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) || 0 : 0);

    if (result.sentiment && typeof result.sentiment === 'object' && !Array.isArray(result.sentiment)) {
      const sent = result.sentiment as any;
      return { positive: toNum(sent.positive), negative: toNum(sent.negative), neutral: toNum(sent.neutral) };
    }
    if (typeof result.sentiment === 'string') {
      try {
        const parsed = JSON.parse(result.sentiment);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { positive: toNum(parsed.positive), negative: toNum(parsed.negative), neutral: toNum(parsed.neutral) };
        }
      } catch { /* ignore */ }
    }
    return { positive: 0, negative: 0, neutral: 0 };
  }, [extractedSentiment, result.sentiment]);

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

  // === useMemoでパーセンテージ・円グラフ計算をメモ化 ===
  const { positivePercent, negativePercent, neutralPercent, positiveAngle, neutralAngle, negativeAngle } = useMemo(() => {
    const { positive: p, negative: n, neutral: u } = sentiment;
    const tot = p + n + u;
    const pp = tot > 0 ? (p / tot) * 100 : 0;
    const np = tot > 0 ? (n / tot) * 100 : 0;
    const up = tot > 0 ? (u / tot) * 100 : 0;
    return {
      positivePercent: pp, negativePercent: np, neutralPercent: up,
      positiveAngle: (pp / 100) * 360,
      neutralAngle: (up / 100) * 360,
      negativeAngle: (np / 100) * 360,
    };
  }, [sentiment]);

  // 円グラフ用の定数
  const radius = 130;
  const centerX = 140;
  const centerY = 140;

  let currentAngle = -90; // 12時から開始

  // 円グラフのアークパスを生成する関数
  const createPieArcPath = useCallback((startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${centerX} ${centerY}
            L ${x1} ${y1}
            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
            Z`;
  }, []);

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
                      {lang === 'ja' ? 'ユウちゃんが要約中...' : 'Yu-chan is summarizing...'}
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
        {processedTopics.length > 0 && (
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
