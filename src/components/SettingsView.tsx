/**
 * サイドパネル内設定画面（リアタイ風アコーディオン式）
 */

import { useState, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { ArrowLeft, CreditCard, Trash2, LogOut } from 'lucide-react';
import { getCredits, purchaseCredits, createCheckoutSession, clearSessionToken } from '../services/apiServer';
import { ANALYSIS_CREDIT_COST } from '../constants';
import type { NearestExpiry } from '../types';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';
import type { FontSize } from '../store/designStore';
import { getHistoryList, deleteHistoryEntry, clearHistory } from '../services/historyStorage';
import type { HistoryListItem } from '../services/historyStorage';
import { useTranslation } from '../i18n/useTranslation';

// ---- 型定義 ----
type Language = 'ja' | 'en';

interface ReleaseData {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
}

interface SettingsViewProps {
  onBack: () => void;
  onLoadHistory?: (id: string) => void;
  onLogout?: () => void;
}

// ---- ストレージキー ----
const STORAGE_KEYS = {
  LANGUAGE: 'yt-gemini-language',
  FONT_SIZE: 'yt-gemini-fontSize',
  BG_MODE: 'yt-gemini-bgMode',
} as const;

const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

// ---- アコーディオンコンポーネント ----
interface AccordionProps {
  title: string;
  currentValueLabel?: string;
  currentLabelText?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isNew?: boolean;
  isLight?: boolean;
}

const SettingsAccordion: React.FC<AccordionProps> = ({
  title,
  currentValueLabel,
  currentLabelText,
  isOpen,
  onToggle,
  children,
  isNew,
  isLight = false,
}) => {
  const [animationParent] = useAutoAnimate({ duration: 300, easing: 'ease-in-out' });
  return (
    <div ref={animationParent} className={`border rounded-lg overflow-hidden transition-colors ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 text-left hover:brightness-110 transition-all z-10 relative ${isLight ? 'bg-white' : 'bg-gray-800'}`}
      >
        <div>
          <div className="flex items-center gap-2">
            <div className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{title}</div>
            {isNew && <span className="bg-red-500 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded animate-pulse">NEW</span>}
          </div>
          {currentValueLabel && (
            <div className={`text-xs mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{currentLabelText ? `${currentLabelText}: ` : ''}{currentValueLabel}</div>
          )}
        </div>
        <div className={`transition-transform duration-300 ease-in-out ${isLight ? 'text-gray-500' : 'text-gray-400'} ${isOpen ? 'rotate-180' : ''}`}>▼</div>
      </button>
      {isOpen && <div className={`border-t ${isLight ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-900'}`}>{children}</div>}
    </div>
  );
};

// ---- 購入プラン ----
interface PurchasePlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceUsd: number;
  description: string;
}

// Plans are constructed inside the component to access t()
const PURCHASE_PLANS_BASE: Array<{ id: string; credits: number; price: number; priceUsd: number; nameKey: string; descKey: string; descParams?: Record<string, string | number> }> = [
  {
    id: 'credits_30',
    credits: 30,
    price: 300,
    priceUsd: 1.99,
    nameKey: 'settings.plan30',
    descKey: 'settings.analysisCount',
    descParams: { count: 30 / ANALYSIS_CREDIT_COST },
  },
  {
    id: 'credits_60',
    credits: 60,
    price: 500,
    priceUsd: 2.99,
    nameKey: 'settings.plan60',
    descKey: 'settings.analysisCount',
    descParams: { count: 60 / ANALYSIS_CREDIT_COST },
  },
  {
    id: 'credits_150',
    credits: 150,
    price: 1000,
    priceUsd: 6.99,
    nameKey: 'settings.plan150',
    descKey: 'settings.analysisCount',
    descParams: { count: 150 / ANALYSIS_CREDIT_COST },
  },
  {
    id: 'subscription_lite',
    credits: 90,
    price: 800,
    priceUsd: 4.99,
    nameKey: 'settings.planLite',
    descKey: 'settings.monthlySubscription',
    descParams: { credits: 90 },
  },
  {
    id: 'subscription_standard',
    credits: 300,
    price: 1980,
    priceUsd: 12.99,
    nameKey: 'settings.planStandard',
    descKey: 'settings.monthlySubscription',
    descParams: { credits: 300 },
  },
];

// ---- メインコンポーネント ----
function SettingsView({ onBack, onLoadHistory, onLogout }: SettingsViewProps) {
  const { t, lang } = useTranslation();
  const PURCHASE_PLANS: PurchasePlan[] = PURCHASE_PLANS_BASE.map(p => ({
    id: p.id,
    name: t(p.nameKey),
    credits: p.credits,
    price: p.price,
    priceUsd: p.priceUsd,
    description: t(p.descKey, p.descParams),
  }));
  // アコーディオン開閉状態
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isUpdateInfoOpen, setIsUpdateInfoOpen] = useState(false);
  const [isNgOpen, setIsNgOpen] = useState(false);
  const [isDesignOpen, setIsDesignOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<HistoryListItem[]>(() => getHistoryList());
  const [isOtherOpen, setIsOtherOpen] = useState(false);

  // データ
  const [credits, setCredits] = useState<number | null>(null);
  const [nearestExpiry, setNearestExpiry] = useState<NearestExpiry | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language) || 'ja';
  });
  const { fontSize, bgMode, setFontSize, setBgMode } = useDesignStore();
  const bgColor = BG_COLORS[bgMode];
  const isLight = isLightMode(bgMode);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseData | null>(null);

  const [parent] = useAutoAnimate({ duration: 300, easing: 'ease-in-out' });

  // 初期化
  useEffect(() => {
    loadCredits();
    fetchRelease();

    // タブがフォーカスされた時にクレジット残高を再取得（Stripe決済完了後の反映用）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCredits();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadCredits = async () => {
    const result = await getCredits();
    if (result.success && result.credits !== undefined) {
      setCredits(result.credits);
      setNearestExpiry(result.nearestExpiry ?? null);
    }
  };

  const fetchRelease = async () => {
    try {
      const res = await fetch('https://api.github.com/repos/keigoly/youtube-comment-gemini/releases/latest');
      if (res.ok) {
        setReleaseInfo(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch release info', e);
    }
  };

  // セッター（localStorage同期）
  const setLanguage = (lang: Language) => {
    const prev = language;
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    if (lang !== prev) {
      // 設定画面に留まるようにフラグを同期的に保存してからリロード
      localStorage.setItem('yt-gemini-openSettings', 'true');
      location.reload();
    }
  };

  // 購入（Stripe Checkout → フォールバック: 旧方式）
  const handlePurchase = async (planId: string) => {
    setPurchaseLoading(true);
    setSelectedPlan(planId);
    try {
      // Stripe Checkout Sessionを作成
      const result = await createCheckoutSession(planId);
      if (result.url) {
        // 購入前の残高を記録
        const creditsBefore = credits;
        // Stripe決済ページを新タブで開く（サイドパネルからはリダイレクト不可のため）
        window.open(result.url, '_blank');
        // alertを使わず、即座にポーリング開始（残高が変わるまで2秒ごとにチェック）
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const res = await getCredits();
          if (res.success && res.credits !== undefined) {
            setCredits(res.credits);
            if (res.credits !== creditsBefore) {
              clearInterval(poll);
            }
          }
          if (attempts >= 60) clearInterval(poll); // 最大60回（120秒）で停止
        }, 2000);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // Stripeが未設定の場合は旧方式にフォールバック
      const errorMsg = error instanceof Error ? error.message : '';
      if (errorMsg.includes('Stripe') || errorMsg.includes('500')) {
        try {
          await purchaseCredits(planId, { method: 'test' });
          await loadCredits();
          alert(t('settings.purchaseComplete'));
        } catch (fallbackError) {
          console.error('Purchase fallback error:', fallbackError);
          alert(t('settings.purchaseError') + (fallbackError instanceof Error ? fallbackError.message : 'Unknown error'));
        }
      } else {
        alert(t('settings.purchaseError') + errorMsg);
      }
    } finally {
      setPurchaseLoading(false);
      setSelectedPlan(null);
    }
  };

  // ストレージ
  const getStorageSize = () => {
    let totalSize = 0;
    for (const key of ALL_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value) totalSize += new Blob([value]).size;
    }
    return totalSize;
  };
  const [storageSize, setStorageSize] = useState(getStorageSize());

  const exportSettings = () => {
    const data: Record<string, unknown> = {};
    for (const key of ALL_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value) {
        try { data[key] = JSON.parse(value); } catch { data[key] = value; }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yt_gemini_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        for (const [key, value] of Object.entries(data)) {
          if ((ALL_STORAGE_KEYS as readonly string[]).includes(key)) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          }
        }
        alert(t('settings.importSuccess'));
        location.reload();
      } catch { alert(t('settings.importError')); }
    };
    input.click();
  };

  const resetSettings = () => {
    if (!confirm(t('settings.confirmReset'))) return;
    for (const key of ALL_STORAGE_KEYS) localStorage.removeItem(key);
    location.reload();
  };

  const clearAllStorage = () => {
    if (!confirm(t('settings.confirmClear'))) return;
    for (const key of ALL_STORAGE_KEYS) localStorage.removeItem(key);
    location.reload();
  };

  // 定数
  const fontSizes: FontSize[] = [13, 14, 15, 16, 18];
  const bgOptions = [
    { mode: 'default' as const, label: t('settings.bgLight'), color: '#ffffff' },
    { mode: 'darkblue' as const, label: t('settings.bgDarkBlue'), color: '#273340' },
    { mode: 'black' as const, label: t('settings.bgBlack'), color: '#000000' },
  ];

  // 外部リンクアイコン
  const ExternalLinkIcon = () => (
    <svg className="text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );

  return (
    <>
      <style>{`
        @keyframes spring-in {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          50% { opacity: 1; transform: scale(1.03) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spring-out {
          0% { opacity: 1; transform: scale(1) translateY(0); }
          20% { opacity: 1; transform: scale(1.02) translateY(0); }
          100% { opacity: 0; transform: scale(0.9) translateY(10px); }
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        .animate-spring-in { animation: spring-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-spring-out { animation: spring-out 0.3s ease-in forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-out { animation: fade-out 0.3s ease-in forwards; }
      `}</style>

      <div className="flex flex-col" style={{ backgroundColor: bgColor, height: '100vh' }}>
        {/* ヘッダー（固定） */}
        <div className={`flex items-center gap-3 p-4 border-b flex-shrink-0 ${isLight ? 'border-gray-200' : 'border-gray-700'}`} style={{ backgroundColor: bgColor }}>
          <button onClick={onBack} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'}`}>
            <ArrowLeft className={`w-5 h-5 ${isLight ? 'text-gray-600' : 'text-gray-300'}`} />
          </button>
          <h1 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{t('settings.title')}</h1>
        </div>

        {/* 設定項目（スクロール） */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1" ref={parent}>

          {/* ===== 1. クレジット管理 ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.creditManagement')}
            currentValueLabel={credits !== null ? `${credits} ${t('side.credits')}` : t('settings.loadingCredits')}
            isOpen={isCreditOpen}
            onToggle={() => setIsCreditOpen(!isCreditOpen)}
          >
            <div className="p-4 space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-lg border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t('settings.balance')}</span>
                </div>
                <span className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{credits !== null ? `${credits}` : '---'}</span>
              </div>
              {nearestExpiry && nearestExpiry.daysLeft <= 30 && (
                <div className={`p-3 rounded-lg border ${nearestExpiry.daysLeft <= 7 ? 'bg-red-900/20 border-red-700' : 'bg-yellow-900/20 border-yellow-700'}`}>
                  <div className={`text-xs font-bold mb-1 ${nearestExpiry.daysLeft <= 7 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {t('settings.expiryWarning')}
                  </div>
                  <div className={`text-xs ${nearestExpiry.daysLeft <= 7 ? 'text-red-300' : 'text-yellow-300'}`}>
                    {t('settings.expiryDetails', { amount: nearestExpiry.amount, days: nearestExpiry.daysLeft })}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-400 mb-2">{t('settings.selectPlan')}</div>
                {PURCHASE_PLANS.map((plan) => (
                  <div key={plan.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-bold text-white">{plan.name}</div>
                        <div className="text-xs text-gray-400">{plan.description}</div>
                      </div>
                      <div className="text-sm font-bold text-blue-400">{lang === 'en' ? `$${plan.priceUsd}` : `¥${plan.price.toLocaleString()}`}</div>
                    </div>
                    <button
                      onClick={() => handlePurchase(plan.id)}
                      disabled={purchaseLoading}
                      className="w-full py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {purchaseLoading && selectedPlan === plan.id ? t('settings.processing') : (<><CreditCard className="w-4 h-4" />{t('settings.purchase')}</>)}
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-xs text-gray-400 space-y-1">
                <p className="font-bold text-gray-300">{t('settings.aboutCredits')}</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>{t('settings.creditCostInfo', { cost: ANALYSIS_CREDIT_COST })}</li>
                  <li>{t('settings.creditNoExpiry')}</li>
                  <li>{t('settings.subscriptionInfo')}</li>
                </ul>
              </div>
            </div>
          </SettingsAccordion>

          {/* ===== 2. 言語設定 ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.language')}
            currentValueLabel={language === 'ja' ? '日本語' : 'English'}
            isOpen={isLanguageOpen}
            onToggle={() => setIsLanguageOpen(!isLanguageOpen)}
          >
            <div className="p-3 space-y-2">
              <p className="text-xs text-gray-400 mb-3">{t('settings.languageDescription')}</p>
              {[
                { value: 'ja' as const, label: '日本語' },
                { value: 'en' as const, label: 'English' },
              ].map((option) => (
                <label key={option.value} className="flex items-center justify-between p-3 rounded-lg cursor-pointer border border-gray-700 hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="language" value={option.value} checked={language === option.value} onChange={() => setLanguage(option.value)} className="accent-blue-500 w-4 h-4" />
                    <span className="text-sm text-white">{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </SettingsAccordion>

          {/* ===== 3. 最新アップデート情報 ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.updateInfo')}
            currentValueLabel={releaseInfo?.tag_name || t('settings.fetching')}
            isOpen={isUpdateInfoOpen}
            onToggle={() => setIsUpdateInfoOpen(!isUpdateInfoOpen)}
            isNew={releaseInfo?.published_at ? (Date.now() - new Date(releaseInfo.published_at).getTime()) < 7 * 24 * 60 * 60 * 1000 : false}
          >
            {releaseInfo ? (
              <div className="p-4 bg-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">{releaseInfo.name || releaseInfo.tag_name}</span>
                  <span className="text-xs text-gray-500">{new Date(releaseInfo.published_at).toLocaleDateString()}</span>
                </div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto mb-4 p-2 bg-gray-900 rounded border border-gray-700">
                  {releaseInfo.body || t('settings.noUpdateInfo')}
                </div>
                <a
                  href={releaseInfo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 text-sm font-bold text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600"
                >
                  {t('settings.viewOnGithub')}
                </a>
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                {t('settings.noReleaseInfo')}
              </div>
            )}
          </SettingsAccordion>

          {/* ===== 4. NG設定（将来的に実装） ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.ngSettings')}
            isOpen={isNgOpen}
            onToggle={() => setIsNgOpen(!isNgOpen)}
          >
            <div className="p-4 text-center">
              <div className="text-gray-500 mb-2">
                <svg className="mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <p className="text-sm text-gray-400 font-bold mb-1">{t('settings.comingSoon')}</p>
              <p className="text-xs text-gray-500">{t('settings.ngDescription')}</p>
            </div>
          </SettingsAccordion>

          {/* ===== 5. デザイン ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.design')}
            currentValueLabel={t('settings.designDescription')}
            isOpen={isDesignOpen}
            onToggle={() => setIsDesignOpen(!isDesignOpen)}
          >
            <div className="p-3 space-y-6">
              {/* フォントサイズ */}
              <div>
                <div className={`text-xs font-bold mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('settings.fontSize')}</div>
                <div className={`flex items-center justify-between rounded-full px-4 py-3 border ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
                  <span className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Aa</span>
                  <div className="flex-1 mx-4 flex justify-between items-center relative">
                    <div className={`absolute left-0 right-0 h-1 rounded-full z-0 ${isLight ? 'bg-gray-300' : 'bg-gray-600'}`}></div>
                    {fontSizes.map((size) => (
                      <div
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`w-4 h-4 rounded-full z-10 cursor-pointer transition-all duration-200 ${fontSize === size ? `bg-blue-500 scale-125 ring-2 ${isLight ? 'ring-white' : 'ring-gray-900'}` : isLight ? 'bg-gray-400 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-400'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-lg ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Aa</span>
                </div>
              </div>

              {/* 背景 */}
              <div>
                <div className={`text-xs font-bold mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{t('settings.background')}</div>
                <div className={`flex flex-col gap-2 p-2 rounded-xl border ${isLight ? 'bg-gray-100 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
                  {bgOptions.map((item) => (
                    <div
                      key={item.mode}
                      onClick={() => setBgMode(item.mode)}
                      className={`w-full p-3 rounded-lg cursor-pointer border-2 transition-all flex items-center gap-3 ${bgMode === item.mode ? 'border-blue-500' : item.mode === 'default' && isLight ? 'border-gray-300 hover:brightness-95' : 'border-transparent hover:brightness-110'}`}
                      style={{ backgroundColor: item.color }}
                    >
                      <div className={`w-4 h-4 rounded-full border border-gray-500 flex items-center justify-center flex-shrink-0 ${bgMode === item.mode ? 'bg-blue-500 border-transparent' : ''}`}>
                        {bgMode === item.mode && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${item.mode === 'default' ? 'text-gray-900' : 'text-white'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SettingsAccordion>

          {/* ===== 6. ストレージ ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.storage')}
            currentValueLabel={`${(storageSize / 1024).toFixed(1)} KB`}
            isOpen={isStorageOpen}
            onToggle={() => { setIsStorageOpen(!isStorageOpen); setStorageSize(getStorageSize()); }}
          >
            <div className="p-4 flex flex-col gap-4">
              <div className="flex justify-between text-xs text-gray-400 border-b border-gray-700 pb-3">
                <span>{t('settings.storageTotal')}: {(storageSize / 1024).toFixed(1)} KB</span>
              </div>

              {/* インポート */}
              <div className="flex justify-between items-center">
                <div className="text-sm font-bold text-white">{t('settings.importSettings')}</div>
                <button
                  onClick={importSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500 text-blue-500 text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  {t('settings.import')}
                </button>
              </div>

              {/* エクスポート */}
              <div className="flex justify-between items-center">
                <div className="text-sm font-bold text-white">{t('settings.exportSettings')}</div>
                <button
                  onClick={exportSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500 text-blue-500 text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  {t('settings.export')}
                </button>
              </div>

              {/* リセット */}
              <div className="flex justify-between items-center border-t border-gray-700 pt-3">
                <div>
                  <div className="text-sm font-bold text-white">{t('settings.resetSettings')}</div>
                  <div className="text-xs text-gray-500">{t('settings.resetDescription')}</div>
                </div>
                <button
                  onClick={resetSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-pink-500 text-pink-500 text-xs font-bold hover:bg-pink-500 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  {t('settings.reset')}
                </button>
              </div>

              {/* 初期化 */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-white">{t('settings.clearStorage')}</div>
                  <div className="text-xs text-gray-500">{t('settings.clearDescription')}</div>
                </div>
                <button
                  onClick={clearAllStorage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  {t('settings.clear')}
                </button>
              </div>
            </div>
          </SettingsAccordion>

          {/* ===== 7. 履歴 ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.history')}
            currentValueLabel={t('settings.historyCount', { count: historyList.length })}
            isOpen={isHistoryOpen}
            onToggle={() => { setIsHistoryOpen(!isHistoryOpen); setHistoryList(getHistoryList()); }}
          >
            <div className="p-4 space-y-3">
              {historyList.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('settings.noHistory')}
                </p>
              ) : (
                <>
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${isLight ? 'border-gray-200 bg-white hover:bg-gray-100' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                    >
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => onLoadHistory?.(item.id)}
                      >
                        <p className={`text-sm font-medium truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                          {item.videoTitle || item.videoId}
                        </p>
                        <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(item.analyzedAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryEntry(item.id);
                          setHistoryList(getHistoryList());
                        }}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isLight ? 'hover:bg-red-100 text-gray-400 hover:text-red-500' : 'hover:bg-red-900/30 text-gray-500 hover:text-red-400'}`}
                        title={t('settings.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      if (confirm(t('settings.confirmDeleteHistory'))) {
                        clearHistory();
                        setHistoryList([]);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-500 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('settings.deleteAll')}
                  </button>
                </>
              )}
            </div>
          </SettingsAccordion>

          {/* ===== 8. その他・問い合わせ ===== */}
          <SettingsAccordion
            isLight={isLight}
            title={t('settings.other')}
            isOpen={isOtherOpen}
            onToggle={() => setIsOtherOpen(!isOtherOpen)}
          >
            <div className="flex flex-col bg-gray-800">
              {/* 不具合の報告 */}
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeUlF5s7vgcG0RrISNrAwLKhMQTvJpndH8e31Z_WHF081McEA/viewform?usp=dialog"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border-b border-gray-700 hover:bg-gray-900 transition-colors group"
              >
                <div className="p-2 rounded-full bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{t('settings.reportBug')}</div>
                  <div className="text-xs text-gray-500">{t('settings.reportBugDescription')}</div>
                </div>
                <ExternalLinkIcon />
              </a>

              {/* プライバシーポリシー */}
              <a
                href="https://github.com/keigoly/youtube-comment-gemini/blob/main/PRIVACY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border-b border-gray-700 hover:bg-gray-900 transition-colors group"
              >
                <div className="p-2 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{t('settings.privacyPolicy')}</div>
                  <div className="text-xs text-gray-500">{t('settings.privacyDescription')}</div>
                </div>
                <ExternalLinkIcon />
              </a>

              {/* GitHub ソースコード */}
              <a
                href="https://github.com/keigoly/youtube-comment-gemini"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border-b border-gray-700 hover:bg-gray-900 transition-colors group"
              >
                <div className="p-2 rounded-full bg-gray-700/30 text-white group-hover:bg-gray-700/50 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{t('settings.sourceCode')}</div>
                  <div className="text-xs text-gray-500">{t('settings.sourceCodeDescription')}</div>
                </div>
                <ExternalLinkIcon />
              </a>

              {/* Amazon 欲しいものリスト */}
              <a
                href="https://www.amazon.jp/hz/wishlist/ls/EB28J89CZWVI?ref_=wl_share"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 border-b border-gray-700 hover:bg-gray-900 transition-colors group"
              >
                <div className="p-2 rounded-full bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{t('settings.supportDeveloper')}</div>
                  <div className="text-xs text-gray-500">{t('settings.supportDescription')}</div>
                </div>
                <ExternalLinkIcon />
              </a>

              {/* 開発者サイト */}
              <a
                href="https://keigoly.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 hover:bg-gray-900 transition-colors group"
              >
                <div className="p-1 rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36 }}>
                  <img src="icons/developer-logo.png" alt="Developer" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{t('settings.developerSite')}</div>
                  <div className="text-xs text-gray-500">{t('settings.developerSiteUrl')}</div>
                </div>
                <ExternalLinkIcon />
              </a>
            </div>
          </SettingsAccordion>

          {/* ===== 9. ログアウト ===== */}
          <button
            onClick={() => {
              if (!confirm(t('settings.confirmLogout'))) return;
              clearSessionToken();
              // Chrome Identity APIのキャッシュトークンを無効化（次回ログイン時にアカウント選択可能にする）
              chrome.identity.getAuthToken({ interactive: false }, (token) => {
                if (token) {
                  // Googleのトークン無効化
                  fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => {});
                  chrome.identity.removeCachedAuthToken({ token }, () => {});
                }
                if (onLogout) {
                  onLogout();
                } else {
                  location.reload();
                }
              });
            }}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${isLight ? 'border-gray-200 bg-white hover:bg-red-50 hover:border-red-300' : 'border-gray-700 bg-gray-800 hover:bg-red-900/20 hover:border-red-700'}`}
          >
            <div className="p-2 rounded-full bg-red-500/10 text-red-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <div className={`text-sm font-bold ${isLight ? 'text-red-600' : 'text-red-400'}`}>{t('settings.logout')}</div>
              <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>{t('settings.logoutDescription')}</div>
            </div>
          </button>

        </div>
      </div>
    </>
  );
}

export default SettingsView;
