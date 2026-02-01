/**
 * Google認証コンポーネント
 */

import { useEffect, useState } from 'react';
import { LogIn, CreditCard } from 'lucide-react';
import { authenticateWithGoogle, verifySession, getCredits } from '../services/apiServer';
import type { User } from '../types';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

function Auth({ onAuthSuccess }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const result = await verifySession();
    if (result.success && result.user) {
      onAuthSuccess(result.user);
      loadCredits();
    }
  };

  const loadCredits = async () => {
    const result = await getCredits();
    if (result.success && result.credits !== undefined) {
      setCredits(result.credits);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Chrome Identity APIを使用してGoogle認証
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError || !token) {
          console.error('Auth error:', chrome.runtime.lastError);
          alert('認証に失敗しました: ' + chrome.runtime.lastError?.message);
          setLoading(false);
          return;
        }

        // IDトークンを取得
        const result = await authenticateWithGoogle(token);

        if (result.success && result.user) {
          onAuthSuccess(result.user);
          await loadCredits();
        } else {
          alert(result.error || '認証に失敗しました');
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Sign in error:', error);
      alert('認証エラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          TubeInsight AI へようこそ
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Googleアカウントでサインインして、すぐに解析を始めましょう
        </p>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
      >
        {loading ? (
          <>読み込み中...</>
        ) : (
          <>
            <LogIn className="w-5 h-5" />
            Googleアカウントでサインイン
          </>
        )}
      </button>

      {credits !== null && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                クレジット残高
              </span>
            </div>
            <span className="text-lg font-bold text-blue-600">
              {credits.toLocaleString()}
            </span>
          </div>
          {credits === 100 && (
            <p className="text-xs text-blue-700 mt-2">
              新規登録特典で100クレジット無料プレゼント！
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 text-center space-y-1">
        <p className="font-semibold text-blue-600">
          新規登録で100クレジット無料プレゼント！
        </p>
        <p>・解析1回につき10クレジット消費</p>
        <p>・クレジットが不足した場合は追加購入できます</p>
        <p>・クレジットは有効期限なし</p>
      </div>
    </div>
  );
}

export default Auth;
