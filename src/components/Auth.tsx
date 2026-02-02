/**
 * Google認証コンポーネント
 */

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { authenticateWithGoogle, verifySession, getCredits } from '../services/apiServer';
import type { User } from '../types';
import { ANALYSIS_CREDIT_COST } from '../constants';

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
      chrome.identity.getAuthToken({ interactive: true }, async (accessToken) => {
        if (chrome.runtime.lastError || !accessToken) {
          console.error('Auth error:', chrome.runtime.lastError);
          alert('認証に失敗しました: ' + chrome.runtime.lastError?.message);
          setLoading(false);
          return;
        }

        try {
          // アクセストークンを使用してユーザー情報を取得
          const userInfoResponse = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!userInfoResponse.ok) {
            throw new Error('ユーザー情報の取得に失敗しました');
          }

          const userInfo = await userInfoResponse.json();

          // サーバーに認証情報を送信（アクセストークンとユーザー情報を含める）
          const result = await authenticateWithGoogle(accessToken, userInfo);

          if (result.success && result.user) {
            onAuthSuccess(result.user);
            await loadCredits();
          } else {
            alert(result.error || '認証に失敗しました');
          }
        } catch (error) {
          console.error('User info fetch error:', error);
          alert('ユーザー情報の取得に失敗しました');
        } finally {
          setLoading(false);
        }
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
        <h2 className="text-xl font-bold text-white mb-2">
          YouTubeコメント withAI へようこそ
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Googleアカウントでサインインして、すぐに解析を始めましょう
        </p>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="gsi-material-button"
        style={{ width: '100%' }}
      >
        <div className="gsi-material-button-state"></div>
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span className="gsi-material-button-contents">
            {loading ? '読み込み中...' : 'Googleアカウントでサインイン'}
          </span>
          <span style={{ display: 'none' }}>Sign in with Google</span>
        </div>
      </button>

      {credits !== null && (
        <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-300" />
              <span className="text-sm font-medium text-white">
                クレジット残高
              </span>
            </div>
            <span className="text-lg font-bold text-white">
              {credits.toLocaleString()}
            </span>
          </div>
          {credits === 999 && (
            <p className="text-xs text-gray-300 mt-2">
              開発モード: 999クレジット無料プレゼント！
            </p>
          )}
          {credits === 100 && (
            <p className="text-xs text-gray-300 mt-2">
              新規登録特典で100クレジット無料プレゼント！
            </p>
          )}
        </div>
      )}

      <div className="text-xs text-gray-400 text-center space-y-1">
        <p className="font-semibold text-blue-400">
          新規登録で100クレジット無料プレゼント！
        </p>
        <p>・解析1回につき{ANALYSIS_CREDIT_COST}クレジット消費</p>
        <p>・クレジットが不足した場合は追加購入できます</p>
        <p>・クレジットは有効期限なし</p>
      </div>
    </div>
  );
}

export default Auth;
