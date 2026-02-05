/**
 * YouTube関連の型定義
 */

/**
 * YouTubeコメント
 */
export interface YouTubeComment {
  id: string;
  text: string;
  author: string;
  authorProfileImageUrl?: string; // アバター画像URL
  likeCount: number;
  publishedAt: string;
  replyCount: number;
}

/**
 * YouTubeコメントスレッド（親コメント + 返信）
 */
export interface YouTubeCommentThread {
  id: string;
  topLevelComment: YouTubeComment;
  replies?: YouTubeComment[];
}

/**
 * YouTube動画情報
 */
export interface YouTubeVideoInfo {
  videoId: string;
  title?: string;
  url: string;
}
