/**
 * 設定関連の型定義
 */

import type { SummaryLength } from './api';

/**
 * アプリケーション設定
 */
export interface AppSettings {
  youtubeApiKey?: string;
  geminiApiKey?: string;
  commentLimit?: number;
  summaryLength?: SummaryLength;
}

/**
 * デフォルト設定値
 */
export const DEFAULT_SETTINGS: AppSettings = {
  commentLimit: 10000,
  summaryLength: 'medium',
};
