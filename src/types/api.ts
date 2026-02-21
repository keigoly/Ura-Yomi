/**
 * API関連の型定義
 */

/**
 * ユーザープラン
 */
export type UserPlan = 'free' | 'pro';

/**
 * ユーザー情報
 */
export interface User {
  id: string;
  email: string;
  plan: UserPlan;
}

/**
 * 認証レスポンス
 */
export interface AuthResponse {
  success: boolean;
  sessionToken?: string;
  user?: User;
  error?: string;
}

/**
 * プラン情報レスポンス
 */
export interface PlanResponse {
  success: boolean;
  plan: UserPlan;
  dailyLimit: number | null;
  dailyUsed: number;
  dailyRemaining: number | null;
  commentLimit: number;
  error?: string;
}

/**
 * 解析リクエスト
 */
export interface AnalyzeRequest {
  videoId: string;
  commentLimit?: number;
  summaryLength?: SummaryLength;
}

/**
 * 解析レスポンス
 */
export interface AnalyzeResponse {
  success: boolean;
  result?: import('./analysis').AnalysisResult;
  comments?: import('./youtube').YouTubeCommentThread[];
  plan?: UserPlan;
  dailyRemaining?: number | null;
  error?: string;
}

/**
 * 要約の長さ
 */
export type SummaryLength = 'short' | 'medium' | 'long';
