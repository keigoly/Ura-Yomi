/**
 * PaywallOverlay - Proプランへの誘導モーダル
 * Free ユーザーが Pro 限定機能をクリックした際に表示する
 */

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { subscribeToPro } from '../services/apiServer';
import { useTranslation } from '../i18n/useTranslation';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';

interface PaywallOverlayProps {
  isOpen: boolean;
  featureName: string;
  onClose: () => void;
}

function PaywallOverlay({ isOpen, featureName, onClose }: PaywallOverlayProps) {
  const { t } = useTranslation();
  const { bgMode } = useDesignStore();
  const lightMode = isLightMode(bgMode);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const result = await subscribeToPro();
      if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setLoading(false);
    }
  };

  const cardBg = lightMode
    ? 'bg-white'
    : bgMode === 'black'
    ? 'bg-gray-900'
    : 'bg-[#1e2a36]';
  const headingColor = lightMode ? 'text-gray-900' : 'text-white';
  const bodyColor = lightMode ? 'text-gray-600' : 'text-gray-300';
  const borderColor = lightMode ? 'border-gray-200' : 'border-gray-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl border ${borderColor} ${cardBg} p-6 shadow-xl`}
        style={{ backgroundColor: BG_COLORS[bgMode] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lock icon */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-500/10">
            <Lock className="w-7 h-7 text-yellow-500" />
          </div>
        </div>

        {/* Feature name */}
        <h2 className={`text-center text-base font-bold mb-2 ${headingColor}`}>
          {featureName}
        </h2>

        {/* Description */}
        <p className={`text-center text-sm mb-6 ${bodyColor}`}>
          {t('paywall.description')}
        </p>

        {/* CTA button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-sm font-bold hover:from-yellow-400 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mb-3"
        >
          {loading ? t('billing.processing') : t('paywall.upgradeToPro')}
        </button>

        {/* Later link */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className={`text-sm underline underline-offset-2 ${
              lightMode
                ? 'text-gray-400 hover:text-gray-600'
                : 'text-gray-500 hover:text-gray-300'
            } transition-colors`}
          >
            {t('paywall.later')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaywallOverlay;
