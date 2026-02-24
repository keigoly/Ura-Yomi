/**
 * 解析結果に関する型定義
 */

/**
 * Hidden Gem（隠れた価値あるコメント）
 */
export interface HiddenGem {
  comment: string;
  author: string;
  likeCount: number;
  reason: string;
}

/**
 * 議論のあるポイント
 */
export interface Controversy {
  topic: string;
  description: string;
}

/**
 * 感情分析結果
 */
export interface SentimentAnalysis {
  positive: number;
  negative: number;
  neutral: number;
}

/**
 * ニュートラルコメント（Geminiが選択）
 */
export interface NeutralComment {
  comment: string;
  author: string;
  likeCount: number;
  id?: string;
  reason?: string;
  reason_en?: string;
}

/**
 * ネガティブコメント（サーバーが人気順全件から特定した最下位コメント）
 * DeepDiveタブで表示するために必要なメタデータを含む
 */
export interface NegativeCommentData {
  text: string;
  author: string;
  likeCount: number;
  id?: string;
  authorProfileImageUrl?: string | null;
  publishedAt?: string;
}

/**
 * AI解析結果
 */
export interface AnalysisResult {
  summary: string;
  summary_en?: string;
  sentiment: SentimentAnalysis;
  topics: string[];
  topics_en?: string[];
  hiddenGems: HiddenGem[];
  controversy: Controversy[];
  keywords: string[];
  positiveComment?: NeutralComment;
  neutralComment?: NeutralComment;
  // ネガティブコメント: サーバーがyt-dlp全件（slice前）の人気順最下位から特定
  negativeComment?: NegativeCommentData;
  negativeCommentReason?: string;
  negativeCommentReason_en?: string;
}

/**
 * 解析の進行状態
 */
export type AnalysisStage = 'fetching' | 'analyzing' | 'complete';

/**
 * 解析進捗
 */
export interface AnalysisProgress {
  stage: AnalysisStage;
  current: number;
  total: number;
  message: string;
}

/**
 * 動画情報
 */
export interface VideoInfo {
  videoId: string;
  title?: string;
}
