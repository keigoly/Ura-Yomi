/**
 * バックエンドAPIサーバーとの通信
 */

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface User {
  id: string;
  email: string;
  credits: number;
  subscription: {
    type: string;
    startDate: string;
    creditsPerMonth: number;
  } | null;
}

export interface AuthResponse {
  success: boolean;
  sessionToken?: string;
  user?: User;
  error?: string;
}

export interface CreditsResponse {
  success: boolean;
  credits?: number;
  subscription?: any;
  error?: string;
}

/**
 * セッショントークンを取得
 */
export function getSessionToken(): string | null {
  return localStorage.getItem('sessionToken');
}

/**
 * セッショントークンを保存
 */
export function setSessionToken(token: string): void {
  localStorage.setItem('sessionToken', token);
}

/**
 * セッショントークンを削除
 */
export function clearSessionToken(): void {
  localStorage.removeItem('sessionToken');
}

/**
 * Google OAuth認証
 */
export async function authenticateWithGoogle(idToken: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

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
    const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    const data = await response.json();
    return data;
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
    const response = await fetch(`${API_BASE_URL}/api/user/credits`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    return await response.json();
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
export async function analyzeViaServer(videoId: string, comments: any[]): Promise<any> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ videoId, comments }),
    });

    const data = await response.json();

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
export async function purchaseCredits(plan: string, paymentMethod: any): Promise<any> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/billing/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ plan, paymentMethod }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '購入エラー');
    }

    return data;
  } catch (error) {
    console.error('Purchase error:', error);
    throw error;
  }
}
