/**
 * API関連の型定義
 */

/**
 * ユーザー情報
 */
export interface User {
  id: string;
  email: string;
  credits: number;
  subscription: UserSubscription | null;
}

/**
 * サブスクリプション情報
 */
export interface UserSubscription {
  type: string;
  startDate: string;
  creditsPerMonth: number;
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
 * クレジットバッチ（期限付きクレジット管理）
 */
export interface CreditBatch {
  id: string;
  amount: number;
  remaining: number;
  source: 'free' | 'purchase' | 'subscription';
  planId: string | null;
  grantedAt: string;
  expiresAt: string | null;
}

/**
 * 最も近い期限切れ情報
 */
export interface NearestExpiry {
  daysLeft: number;
  amount: number;
  expiresAt: string;
}

/**
 * クレジット残高レスポンス
 */
export interface CreditsResponse {
  success: boolean;
  credits?: number;
  subscription?: UserSubscription;
  creditBatches?: CreditBatch[];
  nearestExpiry?: NearestExpiry | null;
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
  creditsRemaining?: number;
  error?: string;
}

/**
 * 要約の長さ
 */
export type SummaryLength = 'short' | 'medium' | 'long';
