/**
 * Google認証コンポーネント
 */

import { useEffect, useState } from 'react';
import { authenticateWithGoogle, verifySession } from '../services/apiServer';
import type { User } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

function Auth({ onAuthSuccess }: AuthProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const result = await verifySession();
    if (result.success && result.user) {
      onAuthSuccess(result.user);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // launchWebAuthFlowでアカウント選択画面を表示
      const manifest = chrome.runtime.getManifest();
      const clientId = manifest.oauth2?.client_id;
      const scopes = manifest.oauth2?.scopes?.join(' ') || 'openid email profile';
      const redirectUrl = chrome.identity.getRedirectURL();
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${encodeURIComponent(scopes)}&prompt=select_account`;

      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          // キャンセル時はローディングを解除するだけ（エラー表示なし）
          console.log('Auth cancelled or error:', chrome.runtime.lastError?.message);
          setLoading(false);
          return;
        }

        // リダイレクトURLからアクセストークンを取得
        const hashParams = new URLSearchParams(responseUrl.split('#')[1]);
        const accessToken = hashParams.get('access_token');

        if (!accessToken) {
          alert(t('auth.authFailed'));
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
            throw new Error(t('auth.userInfoError'));
          }

          const userInfo = await userInfoResponse.json();

          // サーバーに認証情報を送信（アクセストークンとユーザー情報を含める）
          const result = await authenticateWithGoogle(accessToken, userInfo);

          if (result.success && result.user) {
            onAuthSuccess(result.user);
          } else {
            const errorMsg = result.error || t('auth.authFailed');
            console.error('Auth error:', errorMsg);
            alert(`${t('auth.authError')}: ${errorMsg}`);
          }
        } catch (error) {
          console.error('Auth request error:', error);
          const errorMessage = error instanceof Error ? error.message : t('auth.authError');

          // サーバー接続エラーの場合は詳細なメッセージを表示
          if (errorMessage.includes('サーバーに接続できませんでした') || errorMessage.includes('Failed to fetch') || errorMessage.includes('server')) {
            alert(errorMessage);
          } else {
            alert(`${t('auth.authError')}: ${errorMessage}`);
          }
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Sign in error:', error);
      alert(t('auth.authError'));
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="text-center">
        <img
          src={chrome.runtime.getURL('icons/mascot-duo.png')}
          alt="ウラヨミ！ マスコット"
          className="w-32 mx-auto mb-2 animate-bounce-in"
        />
        <h2 className="text-xl font-bold text-white mb-1">
          {t('auth.welcome')}
        </h2>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed whitespace-pre-line">
          {t('auth.description')}
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
            {loading ? t('auth.loading') : t('auth.signInWithGoogle')}
          </span>
          <span style={{ display: 'none' }}>Sign in with Google</span>
        </div>
      </button>

      <div className="p-3 bg-gray-800/50 rounded-lg text-center">
        <p className="text-xs font-semibold text-blue-400 mb-2">
          {t('auth.freeStart')}
        </p>
        <div className="text-[11px] text-gray-400 space-y-0.5 leading-relaxed">
          <p>{t('auth.freePlanInfo')}</p>
          <p>{t('auth.proUpgradeInfo')}</p>
        </div>
      </div>
    </div>
  );
}

export default Auth;
