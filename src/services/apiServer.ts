/**
 * バックエンドAPIサーバーとの通信
 */

import type { User, AuthResponse, PlanResponse } from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../constants';

// 型をre-export（後方互換性のため）
export type { User, AuthResponse, PlanResponse };

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
 * セッショントークンを保存（localStorage + background.js経由でchrome.storage.localにも同期）
 */
export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  // background.jsにメッセージ送信してchrome.storage.localに確実に保存
  // API_BASE_URLも同期（background.jsはVite環境変数にアクセスできないため）
  chrome.runtime.sendMessage({ type: 'SYNC_TOKEN', token, apiBaseUrl: API_BASE_URL }).catch(() => {});
}

/**
 * セッショントークンを削除（localStorage + background.js経由でchrome.storage.localからも削除）
 */
export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  chrome.runtime.sendMessage({ type: 'SYNC_TOKEN', token: null }).catch(() => {});
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
      const isLocal = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
      if (isLocal) {
        throw new Error(
          `サーバーに接続できませんでした。\n\n` +
          `接続先URL: ${url}\n` +
          `APIベースURL: ${API_BASE_URL}\n\n` +
          `【確認事項】\n` +
          `1. サーバーが起動しているか確認してください\n` +
          `   → ターミナルで「cd server」→「npm run dev」を実行\n` +
          `2. サーバーが正しいポート（デフォルト: 3000）で起動しているか確認\n` +
          `3. フロントエンドの.envファイルに以下が設定されているか確認:\n` +
          `   VITE_API_BASE_URL=http://localhost:3000`
        );
      } else {
        throw new Error(
          `サーバーに接続できませんでした。\n\n` +
          `接続先URL: ${url}\n\n` +
          `【確認事項】\n` +
          `1. インターネット接続を確認してください\n` +
          `2. しばらく待ってから再度お試しください\n` +
          `3. 問題が続く場合はサポートにお問い合わせください`
        );
      }
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
    const result = await apiRequest<AuthResponse>(API_ENDPOINTS.AUTH.VERIFY);
    if (result.success) {
      // setSessionTokenでchrome.storage.localにも同期される
      setSessionToken(sessionToken);
    }
    return result;
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
 * プラン情報取得
 */
export async function getUserPlan(): Promise<PlanResponse> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return { success: false, plan: 'free', dailyLimit: 3, dailyUsed: 0, dailyRemaining: 3, commentLimit: 100, error: '認証が必要です' };
  }

  try {
    return await apiRequest<PlanResponse>(API_ENDPOINTS.USER.PLAN);
  } catch (error) {
    console.error('Get plan error:', error);
    return {
      success: false,
      plan: 'free',
      dailyLimit: 3,
      dailyUsed: 0,
      dailyRemaining: 3,
      commentLimit: 100,
      error: error instanceof Error ? error.message : 'プラン情報取得エラー',
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
  summaryLength?: string,
  signal?: AbortSignal,
  language?: string,
  noCache?: boolean
): Promise<any> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です。Googleアカウントでログインしてください。');
  }

  try {
    const data = await apiRequest<any>(API_ENDPOINTS.ANALYZE.DEFAULT, {
      method: 'POST',
      body: JSON.stringify({
        videoId,
        comments,
        commentLimit,
        summaryLength,
        language,
        ...(noCache ? { noCache: true } : {}),
      }),
      signal,
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
        const isLocal = API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
        if (isLocal) {
          throw new Error(
            'サーバーに接続できませんでした。\n' +
            '1. サーバーが起動しているか確認してください（`cd server && npm run dev`）\n' +
            '2. サーバーのURLが正しいか確認してください（http://localhost:3000）'
          );
        } else {
          throw new Error(
            'サーバーに接続できませんでした。\n' +
            '1. インターネット接続を確認してください\n' +
            '2. しばらく待ってから再度お試しください'
          );
        }
      }
      throw error;
    }

    throw new Error(`予期しないエラーが発生しました: ${String(error)}`);
  }
}

/**
 * SSEストリーミング解析
 * EventSource APIでリアルタイム進捗を受信
 */
export interface SSECallbacks {
  onProgress?: (data: { stage: string; message: string; current: number; total: number }) => void;
  onComments?: (data: { comments: any[] }) => void;
  onResult?: (data: any) => void;
  onError?: (message: string) => void;
}

export function analyzeViaServerStream(
  videoId: string,
  commentLimit: number = 2000,
  summaryLength: string = 'medium',
  language: string = 'ja',
  callbacks: SSECallbacks = {},
  noCache: boolean = false
): { abort: () => void } {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    callbacks.onError?.('認証が必要です。Googleアカウントでログインしてください。');
    return { abort: () => {} };
  }

  const params = new URLSearchParams({
    videoId,
    commentLimit: String(commentLimit),
    summaryLength,
    language,
    token: sessionToken,
    ...(noCache ? { noCache: '1' } : {}),
  });

  const url = `${API_BASE_URL}${API_ENDPOINTS.ANALYZE.STREAM}?${params.toString()}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener('progress', (e: MessageEvent) => {
    try {
      callbacks.onProgress?.(JSON.parse(e.data));
    } catch { /* ignore parse errors */ }
  });

  eventSource.addEventListener('comments', (e: MessageEvent) => {
    try {
      callbacks.onComments?.(JSON.parse(e.data));
    } catch { /* ignore */ }
  });

  eventSource.addEventListener('result', (e: MessageEvent) => {
    try {
      callbacks.onResult?.(JSON.parse(e.data));
    } catch { /* ignore */ }
  });

  eventSource.addEventListener('error', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onError?.(data.message || '解析エラーが発生しました');
    } catch {
      callbacks.onError?.('接続エラーが発生しました');
    }
  });

  eventSource.addEventListener('done', () => {
    eventSource.close();
  });

  // EventSource自体のエラーハンドリング（接続失敗等）
  eventSource.onerror = () => {
    if (eventSource.readyState === EventSource.CLOSED) return;
    eventSource.close();
    callbacks.onError?.('SSE接続が切断されました');
  };

  return {
    abort: () => {
      eventSource.close();
    },
  };
}

/**
 * キャラクター口調変換
 */
export async function rewriteWithCharacter(
  text: string,
  character: 'tsubechan' | 'geminny',
  language?: string
): Promise<string> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  const data = await apiRequest<{ success: boolean; rewritten: string; error?: string }>(
    API_ENDPOINTS.CHARACTER.REWRITE,
    {
      method: 'POST',
      body: JSON.stringify({ text, character, language }),
    }
  );

  if (!data.success) {
    throw new Error(data.error || 'キャラクター変換エラー');
  }

  return data.rewritten;
}

/**
 * ネガティブコメントのAI分析
 */
export async function analyzeNegativeComment(
  comment: string,
  language?: string
): Promise<string> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  const data = await apiRequest<{ success: boolean; reason: string; error?: string }>(
    API_ENDPOINTS.ANALYZE.NEGATIVE_REASON,
    {
      method: 'POST',
      body: JSON.stringify({ comment, language }),
    }
  );

  if (!data.success) {
    throw new Error(data.error || 'ネガティブコメント分析エラー');
  }

  return data.reason;
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
 * Proプランに購読（Stripe Checkout）
 */
export async function subscribeToPro(): Promise<{ success: boolean; url?: string; error?: string }> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  const data = await apiRequest<{ success: boolean; url: string; error?: string }>(
    API_ENDPOINTS.BILLING.SUBSCRIBE,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );

  if (!data.success) {
    throw new Error(data.error || 'サブスクリプション作成エラー');
  }

  return data;
}

/**
 * Stripeカスタマーポータルを開く
 */
export async function openBillingPortal(): Promise<{ success: boolean; url?: string; error?: string }> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    throw new Error('認証が必要です');
  }

  const data = await apiRequest<{ success: boolean; url: string; error?: string }>(
    API_ENDPOINTS.BILLING.PORTAL,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );

  if (!data.success) {
    throw new Error(data.error || 'ポータル作成エラー');
  }

  return data;
}
