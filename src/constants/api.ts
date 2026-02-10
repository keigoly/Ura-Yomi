/**
 * API関連の定数
 */

/**
 * バックエンドAPIのベースURL
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * YouTube Data API のベースURL
 */
export const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * APIエンドポイント
 */
export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE: '/api/auth/google',
    VERIFY: '/api/auth/verify',
  },
  USER: {
    CREDITS: '/api/user/credits',
  },
  VIDEO: {
    INFO: '/api/video/info',
  },
  ANALYZE: {
    DEFAULT: '/api/analyze',
    NEGATIVE_REASON: '/api/analyze/negative-reason',
  },
  CHARACTER: {
    REWRITE: '/api/character/rewrite',
  },
  BILLING: {
    PURCHASE: '/api/billing/purchase',
    CREATE_CHECKOUT: '/api/billing/create-checkout-session',
  },
} as const;

/**
 * YouTube APIエンドポイント
 */
export const YOUTUBE_ENDPOINTS = {
  COMMENT_THREADS: `${YOUTUBE_API_BASE_URL}/commentThreads`,
  SEARCH: `${YOUTUBE_API_BASE_URL}/search`,
} as const;
