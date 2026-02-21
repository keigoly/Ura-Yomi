/**
 * 課金/プラン比較コンポーネント
 * Free vs Pro の機能比較テーブルを表示する
 */

import { useState } from 'react';
import { Check, X, Lock, Crown } from 'lucide-react';
import { subscribeToPro } from '../services/apiServer';
import { useTranslation } from '../i18n/useTranslation';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';

type FeatureValue =
  | { type: 'text'; value: string }
  | { type: 'check' }
  | { type: 'x' }
  | { type: 'coming-soon' };

interface FeatureRow {
  labelKey: string;
  free: FeatureValue;
  pro: FeatureValue;
}

function Billing() {
  const { t } = useTranslation();
  const { bgMode } = useDesignStore();
  const lightMode = isLightMode(bgMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const features: FeatureRow[] = [
    {
      labelKey: 'billing.feature.aiAnalysis',
      free: { type: 'text', value: `3${t('billing.perDay')}` },
      pro: { type: 'text', value: t('billing.unlimited') },
    },
    {
      labelKey: 'billing.feature.commentFetch',
      free: { type: 'text', value: '100' },
      pro: { type: 'text', value: '2,000' },
    },
    {
      labelKey: 'billing.feature.sentimentRatio',
      free: { type: 'check' },
      pro: { type: 'check' },
    },
    {
      labelKey: 'billing.feature.wordCloud',
      free: { type: 'coming-soon' },
      pro: { type: 'coming-soon' },
    },
    {
      labelKey: 'billing.feature.detailedReport',
      free: { type: 'coming-soon' },
      pro: { type: 'coming-soon' },
    },
    {
      labelKey: 'billing.feature.csvExport',
      free: { type: 'coming-soon' },
      pro: { type: 'coming-soon' },
    },
    {
      labelKey: 'billing.feature.videoPlanning',
      free: { type: 'coming-soon' },
      pro: { type: 'coming-soon' },
    },
    {
      labelKey: 'billing.feature.snsShareImage',
      free: { type: 'coming-soon' },
      pro: { type: 'coming-soon' },
    },
    {
      labelKey: 'billing.feature.byok',
      free: { type: 'coming-soon' },
      pro: { type: 'coming-soon' },
    },
  ];

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await subscribeToPro();
      if (result.url) {
        chrome.tabs.create({ url: result.url });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('billing.subscribeError'));
    } finally {
      setLoading(false);
    }
  };

  const renderValue = (value: FeatureValue, isPro: boolean) => {
    switch (value.type) {
      case 'text':
        return (
          <span
            className={`text-sm font-medium ${
              isPro
                ? 'text-yellow-400'
                : lightMode
                ? 'text-gray-700'
                : 'text-gray-200'
            }`}
          >
            {value.value}
          </span>
        );
      case 'check':
        return <Check className="w-5 h-5 text-green-400 mx-auto" />;
      case 'x':
        return (
          <X
            className={`w-5 h-5 mx-auto ${
              lightMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          />
        );
      case 'coming-soon':
        return (
          <span className="flex items-center justify-center gap-1">
            <Lock
              className={`w-3.5 h-3.5 ${
                lightMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
            <span
              className={`text-xs ${
                lightMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {t('billing.comingSoon')}
            </span>
          </span>
        );
    }
  };

  const cardBg = lightMode ? 'bg-white' : bgMode === 'black' ? 'bg-gray-900' : 'bg-[#1e2a36]';
  const borderColor = lightMode ? 'border-gray-200' : 'border-gray-700';
  const rowEvenBg = lightMode ? 'bg-gray-50' : bgMode === 'black' ? 'bg-gray-800/40' : 'bg-[#1a2530]';
  const labelColor = lightMode ? 'text-gray-700' : 'text-gray-300';
  const headingColor = lightMode ? 'text-gray-900' : 'text-white';

  return (
    <div
      className="p-4 min-h-full"
      style={{ backgroundColor: BG_COLORS[bgMode] }}
    >
      <h2 className={`text-lg font-bold mb-4 text-center ${headingColor}`}>
        {t('billing.title')}
      </h2>

      <div className={`rounded-xl border ${borderColor} ${cardBg} overflow-hidden`}>
        {/* Plan header row */}
        <div className={`grid grid-cols-3 border-b ${borderColor}`}>
          {/* Feature label column header */}
          <div className="p-3" />

          {/* Free column header */}
          <div className={`p-3 text-center border-l ${borderColor}`}>
            <p className={`text-sm font-semibold ${labelColor}`}>
              {t('billing.freePlan')}
            </p>
            <p className={`text-xs mt-0.5 ${lightMode ? 'text-gray-500' : 'text-gray-400'}`}>
              ¥0
            </p>
          </div>

          {/* Pro column header */}
          <div
            className={`p-3 text-center border-l ${borderColor} bg-gradient-to-b from-yellow-500/10 to-transparent`}
          >
            <div className="flex items-center justify-center gap-1">
              <Crown className="w-4 h-4 text-yellow-400" />
              <p className="text-sm font-bold text-yellow-400">
                {t('billing.proPlan')}
              </p>
            </div>
            <p className={`text-xs mt-0.5 ${lightMode ? 'text-gray-500' : 'text-gray-400'}`}>
              ¥980/{t('billing.perMonth')}
            </p>
          </div>
        </div>

        {/* Feature rows */}
        {features.map((row, i) => (
          <div
            key={row.labelKey}
            className={`grid grid-cols-3 border-b ${borderColor} ${
              i % 2 === 0 ? rowEvenBg : ''
            }`}
          >
            {/* Label */}
            <div className="px-3 py-2.5 flex items-center">
              <span className={`text-xs leading-tight ${labelColor}`}>
                {t(row.labelKey)}
              </span>
            </div>

            {/* Free value */}
            <div className={`px-2 py-2.5 flex items-center justify-center border-l ${borderColor}`}>
              {renderValue(row.free, false)}
            </div>

            {/* Pro value */}
            <div
              className={`px-2 py-2.5 flex items-center justify-center border-l ${borderColor} bg-yellow-500/5`}
            >
              {renderValue(row.pro, true)}
            </div>
          </div>
        ))}

        {/* CTA row */}
        <div className={`grid grid-cols-3`}>
          <div className="p-3" />

          {/* Free CTA */}
          <div className={`p-3 flex items-center justify-center border-l ${borderColor}`}>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                lightMode
                  ? 'border-gray-300 text-gray-500'
                  : 'border-gray-600 text-gray-400'
              }`}
            >
              {t('billing.currentPlan')}
            </span>
          </div>

          {/* Pro CTA */}
          <div className={`p-3 flex items-center justify-center border-l ${borderColor} bg-yellow-500/5`}>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold rounded-full hover:from-yellow-400 hover:to-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                t('billing.processing')
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5" />
                  {t('billing.upgradeToPro')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs text-red-500 border border-red-500/30 ${
            lightMode ? 'bg-red-50' : 'bg-red-900/20'
          }`}
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default Billing;
