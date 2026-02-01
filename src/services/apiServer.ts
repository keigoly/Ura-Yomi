/**
 * バックエンドAPIサーバーとの通信
 */

import type { User, AuthResponse, CreditsResponse } from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../constants';

// 型をre-export（後方互換性のため）
export type { User, AuthResponse, CreditsResponse };

/**
 * セッショントークンのストレージキー
 */
const SESSION_TOKEN_KEY = 'sessionToken';

/**
 * セッショントークンを取得
 */
export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * セッショントークンを保存
 */
export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

/**
 * セッショントークンを削除
 */
export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * 認証ヘッダーを生成
 */
function getAuthHeaders(): HeadersInit {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * APIリクエストを実行
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  return response.json();
}

/**
 * Google OAuth認証
 */
export async function authenticateWithGoogle(
  idToken: string
): Promise<AuthResponse> {
  try {
    const data = await apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.GOOGLE, {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });

    if (data.success && data.sessionToken) {
      setSessionToken(data.sessionToken);
    }

    return data;
  } catch (error) {
    console.error('Auth error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '認証エラーが発生しました',
    };
  }
}

/**
 * セッション検証
 */
export async function verifySession(): Promise<AuthResponse> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return { success: false, error: 'セッションが見つかりません' };
  }

  try {
    return await apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY);
  } catch (error) {
    console.error('Verify error:', error);
    clearSessionToken();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'セッション検証エラー',
    };
  }
}

/**
 * クレジット残高取得
 */
export async function getCredits(): Promise<CreditsResponse> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return { success: false, error: '認証が必要です' };
  }

  try {
    return await apiRequest<CreditsResponse>(API_ENDPOINTS.USER.CREDITS);
  } catch (error) {
    console.error('Get credits error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'クレジット取得エラー',
    };
  }
}

/**
 * 解析リクエスト（サーバー経由）
 */
export async function analyzeViaServer(
  videoId: string,
  comments: any[]
): Promise<any> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  try {
    const data = await apiRequest<any>(API_ENDPOINTS.ANALYZE, {
      method: 'POST',
      body: JSON.stringify({ videoId, comments }),
    });

    if (!data.success) {
      throw new Error(data.error || '解析エラー');
    }

    return data.result;
  } catch (error) {
    console.error('Analyze error:', error);
    throw error;
  }
}

/**
 * クレジット購入
 */
export async function purchaseCredits(
  plan: string,
  paymentMethod: any
): Promise<any> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  try {
    const data = await apiRequest<any>(API_ENDPOINTS.BILLING.PURCHASE, {
      method: 'POST',
      body: JSON.stringify({ plan, paymentMethod }),
    });

    if (!data.success) {
      throw new Error(data.error || '購入エラー');
    }

    return data;
  } catch (error) {
    console.error('Purchase error:', error);
    throw error;
  }
}
