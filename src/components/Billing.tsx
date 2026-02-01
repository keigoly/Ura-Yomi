/**
 * 課金/サブスクリプションコンポーネント
 */

import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { purchaseCredits, getCredits } from '../services/apiServer';
import { ANALYSIS_CREDIT_COST } from '../constants';

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
  description: string;
}

/**
 * 利用可能なプラン
 */
const PURCHASE_PLANS: PurchasePlan[] = [
  {
    id: 'credits_100',
    name: '100クレジット',
    credits: 100,
    price: 500,
    description: `解析${100 / ANALYSIS_CREDIT_COST}回分`,
  },
  {
    id: 'credits_500',
    name: '500クレジット',
    credits: 500,
    price: 2000,
    description: `解析${500 / ANALYSIS_CREDIT_COST}回分（20%割引）`,
  },
  {
    id: 'subscription_monthly',
    name: '月額サブスク',
    credits: 1000,
    price: 3000,
    description: '毎月1000クレジット自動付与',
  },
];

function Billing({ onPurchaseSuccess }: BillingProps) {
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
                  ¥{plan.price.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{plan.credits}クレジット</p>
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
        <p className="mb-2">新規登録で100クレジット無料プレゼント！</p>
        <p className="text-blue-700">
          その後はクレジットを購入してご利用ください。
        </p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-semibold mb-1">クレジットについて</p>
        <ul className="list-disc list-inside space-y-1">
          <li>解析1回につき{ANALYSIS_CREDIT_COST}クレジット消費</li>
          <li>クレジットは有効期限なし</li>
          <li>月額サブスクは毎月自動でクレジットが付与されます</li>
        </ul>
      </div>
    </div>
  );
}

export default Billing;
