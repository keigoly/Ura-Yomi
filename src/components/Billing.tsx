/**
 * 課金/サブスクリプションコンポーネント
 */

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { purchaseCredits, getCredits } from '../services/apiServer';
import { ANALYSIS_CREDIT_COST } from '../constants';
import { useTranslation } from '../i18n/useTranslation';

interface BillingProps {
  onPurchaseSuccess: () => void;
}

/**
 * 購入プラン
 */
interface PurchasePlan {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceUsd: number;
  description: string;
}

/**
 * 利用可能なプラン
 */
const PURCHASE_PLANS: PurchasePlan[] = [
  {
    id: 'credits_30',
    name: 'お試しパック',
    credits: 30,
    price: 300,
    priceUsd: 1.99,
    description: `解析${30 / ANALYSIS_CREDIT_COST}回分`,
  },
  {
    id: 'credits_60',
    name: 'スタンダード',
    credits: 60,
    price: 500,
    priceUsd: 2.99,
    description: `解析${60 / ANALYSIS_CREDIT_COST}回分`,
  },
  {
    id: 'credits_150',
    name: 'プレミアム',
    credits: 150,
    price: 1000,
    priceUsd: 6.99,
    description: `解析${150 / ANALYSIS_CREDIT_COST}回分`,
  },
  {
    id: 'subscription_lite',
    name: '月額ライト',
    credits: 90,
    price: 800,
    priceUsd: 4.99,
    description: '毎月90クレジット自動付与',
  },
  {
    id: 'subscription_standard',
    name: '月額スタンダード',
    credits: 300,
    price: 1980,
    priceUsd: 12.99,
    description: '毎月300クレジット自動付与',
  },
];

function Billing({ onPurchaseSuccess }: BillingProps) {
  const { t, lang } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      // TODO: 実際の決済処理（Stripe、PayPal等）
      await purchaseCredits(planId, { method: 'test' });

      // クレジットを再取得
      await getCredits();
      onPurchaseSuccess();

      alert('購入が完了しました！');
    } catch (error) {
      console.error('Purchase error:', error);
      alert(
        '購入エラーが発生しました: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">クレジットを購入</h2>

      <div className="space-y-3">
        {PURCHASE_PLANS.map((plan) => (
          <div
            key={plan.id}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                <p className="text-sm text-gray-600">{plan.description}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">
                  {lang === 'en' ? `$${plan.priceUsd}` : `¥${plan.price.toLocaleString()}`}
                </p>
                <p className="text-xs text-gray-500">{plan.credits} {t('side.credits')}</p>
              </div>
            </div>
            <button
              onClick={() => handlePurchase(plan.id)}
              disabled={loading}
              className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && selectedPlan === plan.id ? (
                <>処理中...</>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  購入する
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <p className="font-semibold mb-2">初回特典</p>
        <p className="mb-2">新規登録で15クレジット無料プレゼント！</p>
        <p className="text-blue-700">
          その後はクレジットを購入してご利用ください。
        </p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-semibold mb-1">クレジットについて</p>
        <ul className="list-disc list-inside space-y-1">
          <li>解析1回につき{ANALYSIS_CREDIT_COST}クレジット消費</li>
          <li>購入クレジットは有効期限なし（月額付与分は90日）</li>
          <li>月額サブスクは毎月自動でクレジットが付与されます</li>
        </ul>
      </div>
    </div>
  );
}

export default Billing;
