/**
 * ReviewRequest - 星評価付きレビュー依頼モーダル
 * 3回以上解析を行ったユーザーに対して星評価を促す
 * 4-5つ星 → Chrome Web Storeレビューページへ誘導
 * 1-3つ星 → フィードバックフォームへ誘導
 */

import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useDesignStore, isLightMode } from '../store/designStore';

const STORE_URL =
  'https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn';

const FEEDBACK_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdSyrRWEPHWtuDRvwkRNvPem4YONvthES4QrkJn4eZBEEyP8A/viewform?usp=sharing&ouid=100536804432513362660';

const STORAGE_KEYS = {
  ANALYSIS_COUNT: 'analysisCount',
  REVIEW_DISMISSED_AT: 'reviewDismissedAt',
  REVIEW_COMPLETED: 'reviewCompleted',
} as const;

const MIN_ANALYSIS_COUNT = 3;
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface ReviewRequestState {
  shouldShow: boolean;
  markCompleted: () => void;
  markDismissed: () => void;
}

export function useReviewRequest(): ReviewRequestState {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    chrome.storage.local
      .get([
        STORAGE_KEYS.ANALYSIS_COUNT,
        STORAGE_KEYS.REVIEW_DISMISSED_AT,
        STORAGE_KEYS.REVIEW_COMPLETED,
      ])
      .then((data) => {
        // レビュー完了済みなら二度と表示しない
        if (data[STORAGE_KEYS.REVIEW_COMPLETED]) return;

        // 解析回数が閾値未満なら表示しない
        const count = data[STORAGE_KEYS.ANALYSIS_COUNT] || 0;
        if (count < MIN_ANALYSIS_COUNT) return;

        // 14日以内に「あとで」を押していたら表示しない
        const dismissedAt = data[STORAGE_KEYS.REVIEW_DISMISSED_AT];
        if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

        setShouldShow(true);
      });
  }, []);

  const markCompleted = () => {
    chrome.storage.local.set({ [STORAGE_KEYS.REVIEW_COMPLETED]: true });
    setShouldShow(false);
  };

  const markDismissed = () => {
    chrome.storage.local.set({
      [STORAGE_KEYS.REVIEW_DISMISSED_AT]: Date.now(),
    });
    setShouldShow(false);
  };

  return { shouldShow, markCompleted, markDismissed };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Phase = 'rating' | 'thanks';

interface ReviewRequestProps {
  onDismiss: () => void;
  onSkip: () => void;
}

function ReviewRequest({ onDismiss, onSkip }: ReviewRequestProps) {
  const { t } = useTranslation();
  const { bgMode } = useDesignStore();
  const lightMode = isLightMode(bgMode);
  const { markCompleted, markDismissed } = useReviewRequest();

  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [phase, setPhase] = useState<Phase>('rating');

  const cardBg = lightMode
    ? 'bg-white'
    : bgMode === 'black'
    ? 'bg-gray-900'
    : 'bg-[#1e2a36]';

  const headingColor = lightMode ? 'text-gray-900' : 'text-white';
  const bodyColor = lightMode ? 'text-gray-600' : 'text-gray-300';

  const handleStarClick = (star: number) => {
    setSelectedStar(star);

    if (star >= 4) {
      chrome.tabs.create({ url: STORE_URL });
      markCompleted();
    } else {
      setPhase('thanks');
    }
  };

  const handleFeedback = () => {
    chrome.tabs.create({ url: FEEDBACK_URL });
    markCompleted();
  };

  // ×ボタン・「あとで」 → 14日間非表示
  const handleLater = () => {
    markDismissed();
    onDismiss();
  };

  // 背景クリック → スルー（記録せず閉じるだけ、次回また表示）
  const handleBackdropClick = () => {
    onSkip();
  };

  const activeStar = hoveredStar || selectedStar;

  // お礼 & フィードバック誘導画面（1-3つ星選択後）
  const thanksContent = (
    <div className="text-center">
      <p className={`text-base font-bold ${headingColor}`}>
        {t('review.thanksTitle')}
      </p>
      <p className={`text-xs mt-2 leading-relaxed ${bodyColor}`}>
        {t('review.thanksDescription')}
      </p>
      <div className="flex flex-col items-center gap-2 mt-4">
        <button
          onClick={handleFeedback}
          className="w-full px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-colors"
        >
          {t('review.sendFeedback')}
        </button>
        <button
          onClick={handleLater}
          className={`text-xs underline underline-offset-2 transition-colors ${
            lightMode
              ? 'text-gray-400 hover:text-gray-600'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {t('review.later')}
        </button>
      </div>
    </div>
  );

  // 星評価画面（初期表示）
  const ratingContent = (
    <div className="text-center">
      {/* マスコットアイコン（ステッカー風） */}
      <div className="flex justify-center mb-2">
        <img
          src={chrome.runtime.getURL('icons/mascot-duo.png')}
          alt=""
          className="w-24 h-auto"
          style={{
            filter: 'drop-shadow(0 0 0 white) drop-shadow(0 0 1px white) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            WebkitFilter: 'drop-shadow(0 0 0 white) drop-shadow(0 0 1px white) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        />
      </div>

      <p className={`text-base font-bold ${headingColor}`}>
        {t('review.title')}
      </p>
      <p className={`text-xs mt-1 ${bodyColor}`}>
        {t('review.ratingPrompt')}
      </p>

      {/* 星評価 */}
      <div className="flex items-center justify-center gap-2 mt-3 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleStarClick(star)}
            className="p-0.5 transition-transform hover:scale-125 active:scale-95"
          >
            <Star
              className={`w-9 h-9 transition-colors ${
                star <= activeStar
                  ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                  : lightMode
                  ? 'text-gray-300'
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>

      {/* あとで */}
      <button
        onClick={handleLater}
        className={`text-xs underline underline-offset-2 transition-colors ${
          lightMode
            ? 'text-gray-400 hover:text-gray-600'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        {t('review.later')}
      </button>
    </div>
  );

  return (
    <>
      {/* キーフレームをインジェクト */}
      <style>{`
        @keyframes review-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes review-card-in {
          from { opacity: 0; transform: scale(0.9) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* オーバーレイ（背景ぼかし） */}
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center"
        style={{
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'review-overlay-in 0.2s ease-out',
        }}
      >
        {/* 半透明背景（クリック = スルー） */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={handleBackdropClick}
        />

        {/* モーダルカード */}
        <div
          className={`relative mx-4 w-full max-w-[320px] rounded-2xl p-5 shadow-2xl ${cardBg}`}
          style={{
            animation: 'review-card-in 0.3s ease-out',
          }}
        >
          {/* ×ボタン（右上） */}
          <button
            onClick={handleLater}
            className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${
              lightMode
                ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>

          {phase === 'rating' ? ratingContent : thanksContent}
        </div>
      </div>
    </>
  );
}

export default ReviewRequest;
