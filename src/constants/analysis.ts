/**
 * 解析関連の定数
 */

/**
 * Geminiモデル名
 * gemini-2.5-flash: 安定版のFlashモデル（推奨）
 * その他の利用可能なモデル: gemini-2.5-pro, gemini-flash-latest, gemini-3-flash-preview
 */
export const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * 要約の長さマッピング
 */
export const SUMMARY_LENGTH_MAP = {
  short: '3-5行',
  medium: '5-10行',
  long: '10-20行',
} as const;

/**
 * Freeプランの1日の解析回数上限
 */
export const FREE_DAILY_LIMIT = 3;

/**
 * Freeプランのコメント取得上限
 */
export const FREE_COMMENT_LIMIT = 100;

/**
 * Proプランのコメント取得上限
 */
export const PRO_COMMENT_LIMIT = 2000;

/**
 * デフォルトのコメント取得上限
 */
export const DEFAULT_COMMENT_LIMIT = 2000;

/**
 * 1回のAPIリクエストで取得するコメント数の上限
 */
export const YOUTUBE_API_MAX_RESULTS = 100;

/**
 * APIレートリミット対策の待機時間（ミリ秒）
 */
export const RATE_LIMIT_DELAY_MS = 100;
