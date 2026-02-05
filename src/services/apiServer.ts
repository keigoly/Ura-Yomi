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
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    // ネットワークエラーやタイムアウトのチェック
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // JSON解析に失敗した場合はテキストを取得
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch (e2) {
          // テキスト取得にも失敗した場合はそのまま
        }
      }
      throw new Error(errorMessage);
    }

    // レスポンスが空の場合はエラー
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      if (text) {
        throw new Error(`予期しないレスポンス形式: ${text.substring(0, 200)}`);
      }
      throw new Error('サーバーからのレスポンスが空です');
    }

    return await response.json();
  } catch (error) {
    // ネットワークエラーの場合
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiBaseUrl = API_BASE_URL;
      throw new Error(
        `サーバーに接続できませんでした。\n\n` +
        `接続先URL: ${url}\n` +
        `APIベースURL: ${apiBaseUrl}\n\n` +
        `【確認事項】\n` +
        `1. サーバーが起動しているか確認してください\n` +
        `   → ターミナルで「cd server」→「npm run dev」を実行\n` +
        `2. サーバーが正しいポート（デフォルト: 3000）で起動しているか確認\n` +
        `3. フロントエンドの.envファイルに以下が設定されているか確認:\n` +
        `   VITE_API_BASE_URL=http://localhost:3000\n\n` +
        `エラー詳細: ${error.message}`
      );
    }
    
    // その他のエラーはそのまま再スロー
    throw error;
  }
}

/**
 * Google OAuth認証
 */
export async function authenticateWithGoogle(
  accessToken: string,
  userInfo: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }
): Promise<AuthResponse> {
  try {
    const data = await apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.GOOGLE, {
      method: 'POST',
      body: JSON.stringify({
        accessToken,
        userInfo: {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        },
      }),
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
  comments: any[],
  commentLimit?: number,
  summaryLength?: string
): Promise<any> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です。Googleアカウントでログインしてください。');
  }

  try {
    const data = await apiRequest<any>(API_ENDPOINTS.ANALYZE, {
      method: 'POST',
      body: JSON.stringify({
        videoId,
        comments,
        commentLimit,
        summaryLength,
      }),
    });

    if (!data.success) {
      throw new Error(data.error || '解析エラーが発生しました');
    }

    // サーバーからのレスポンス構造: { success: true, result: {...}, comments: [...], ... }
    return data;
  } catch (error) {
    console.error('Analyze error:', error);
    
    // エラーメッセージを改善
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        throw new Error(
          'サーバーに接続できませんでした。\n' +
          '1. サーバーが起動しているか確認してください（`cd server && npm run dev`）\n' +
          '2. サーバーのURLが正しいか確認してください（http://localhost:3000）\n' +
          `エラー詳細: ${error.message}`
        );
      }
      throw error;
    }
    
    throw new Error(`予期しないエラーが発生しました: ${String(error)}`);
  }
}

/**
 * 動画情報取得（タイトルとコメント総数）
 */
export async function getVideoInfo(videoId: string): Promise<{
  success: boolean;
  videoId?: string;
  title?: string;
  commentCount?: number;
  error?: string;
}> {
  try {
    const data = await apiRequest<any>(`${API_ENDPOINTS.VIDEO.INFO}?videoId=${encodeURIComponent(videoId)}`);
    return data;
  } catch (error) {
    console.error('Get video info error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '動画情報の取得に失敗しました',
    };
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
