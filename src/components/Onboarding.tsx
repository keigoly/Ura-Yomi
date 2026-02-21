/**
 * Onboarding - 初回インストール時に表示される使い方ガイド
 * chrome.storage.local の onboardingComplete フラグで表示制御
 */

import { useEffect, useState } from 'react';
import { Play, MousePointerClick, BarChart3 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface OnboardingState {
  showOnboarding: boolean;
  completeOnboarding: () => void;
}

export function useOnboarding(): OnboardingState {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['onboardingComplete'], (result) => {
      const completed: boolean = result['onboardingComplete'] ?? false;
      setShowOnboarding(!completed);
    });
  }, []);

  const completeOnboarding = () => {
    chrome.storage.local.set({ onboardingComplete: true });
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding };
}

// ---------------------------------------------------------------------------
// Step data
// ---------------------------------------------------------------------------

interface Step {
  number: number;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OnboardingProps {
  onComplete: () => void;
}

function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslation();
  const { bgMode } = useDesignStore();
  const { completeOnboarding } = useOnboarding();
  const lightMode = isLightMode(bgMode);

  const headingColor = lightMode ? 'text-gray-900' : 'text-white';
  const bodyColor = lightMode ? 'text-gray-600' : 'text-gray-400';
  const stepCardBg = lightMode ? 'bg-gray-100' : 'bg-gray-800';
  const stepNumberBg = 'bg-blue-500';
  const hintColor = lightMode ? 'text-gray-400' : 'text-gray-500';

  const steps: Step[] = [
    {
      number: 1,
      icon: <Play className="w-5 h-5 text-blue-400" />,
      titleKey: 'onboarding.step1Title',
      descKey: 'onboarding.step1Desc',
    },
    {
      number: 2,
      icon: <MousePointerClick className="w-5 h-5 text-purple-400" />,
      titleKey: 'onboarding.step2Title',
      descKey: 'onboarding.step2Desc',
    },
    {
      number: 3,
      icon: <BarChart3 className="w-5 h-5 text-green-400" />,
      titleKey: 'onboarding.step3Title',
      descKey: 'onboarding.step3Desc',
    },
  ];

  const handleGetStarted = () => {
    completeOnboarding();
    onComplete();
  };

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ backgroundColor: BG_COLORS[bgMode] }}
    >
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
        {/* Mascot image */}
        <div className="flex justify-center mb-4">
          <img
            src={chrome.runtime.getURL('icons/mascot-duo.png')}
            alt="Ura-Yomi! マスコット"
            className="w-28 h-auto"
          />
        </div>

        {/* Title */}
        <h1 className={`text-lg font-bold text-center mb-5 ${headingColor}`}>
          {t('onboarding.title')}
        </h1>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex items-start gap-3 rounded-xl p-3 ${stepCardBg}`}
            >
              {/* Number circle */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${stepNumberBg}`}
              >
                {step.number}
              </div>

              {/* Icon */}
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-700/50 mt-0.5">
                {step.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-snug ${headingColor}`}>
                  {t(step.titleKey)}
                </p>
                <p className={`text-xs mt-0.5 leading-relaxed ${bodyColor}`}>
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sample video hint */}
        <p className={`text-center text-xs mt-4 leading-relaxed ${hintColor}`}>
          {t('onboarding.hint')}
        </p>
      </div>

      {/* CTA button — pinned to bottom */}
      <div className="flex-shrink-0 px-5 pb-6 pt-2">
        <button
          onClick={handleGetStarted}
          className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white text-sm font-bold transition-colors shadow-md"
        >
          {t('onboarding.getStarted')}
        </button>
      </div>
    </div>
  );
}

export default Onboarding;
