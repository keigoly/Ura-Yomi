/**
 * Settings Page コンポーネント
 * ユーザー向けの設定画面（プラン管理）
 */

import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { getUserPlan } from '../services/apiServer';
import type { PlanResponse } from '../types';
import Billing from './Billing';

function Settings() {
  const [showBilling, setShowBilling] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanResponse | null>(null);

  useEffect(() => {
    loadPlanInfo();
  }, []);

  const loadPlanInfo = async () => {
    try {
      const result = await getUserPlan();
      if (result) {
        setPlanInfo(result);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">設定</h1>

        {/* 情報メッセージ */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            APIキーや分析設定はサーバー側で管理されています。
            認証後、すぐにYouTube動画のコメント解析を開始できます。
          </p>
        </div>

        {/* プラン管理セクション */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">プラン管理</h2>
            {planInfo && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
                <Crown className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  {planInfo.plan === 'pro' ? 'Pro' : 'Free'}
                </span>
              </div>
            )}
          </div>

          {showBilling ? (
            <Billing />
          ) : (
            <div className="space-y-3">
              {planInfo && planInfo.plan === 'free' && (
                <p className="text-sm text-gray-600">
                  今日の使用: {planInfo.dailyUsed}/{planInfo.dailyLimit}回
                </p>
              )}
              <button
                onClick={() => setShowBilling(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <Crown className="w-5 h-5" />
                プランを見る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
