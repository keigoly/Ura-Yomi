/**
 * YouTube Data API v3 クライアント
 */

import type { YouTubeComment, YouTubeCommentThread } from '../types';
import {
  YOUTUBE_ENDPOINTS,
  YOUTUBE_API_MAX_RESULTS,
  DEFAULT_COMMENT_LIMIT,
  RATE_LIMIT_DELAY_MS,
} from '../constants';

// 型をre-export（後方互換性のため）
export type { YouTubeComment, YouTubeCommentThread };

/**
 * 進捗コールバック
 */
type ProgressCallback = (current: number, total: number) => void;

/**
 * APIレスポンスからコメントスレッドを変換
 */
function mapApiResponseToThread(item: any): YouTubeCommentThread {
  const snippet = item.snippet.topLevelComment.snippet;

  const thread: YouTubeCommentThread = {
    id: item.id,
    topLevelComment: {
      id: item.snippet.topLevelComment.id,
      text: snippet.textDisplay || snippet.textOriginal,
      author: snippet.authorDisplayName,
      authorProfileImageUrl: snippet.authorProfileImageUrl || undefined,
      likeCount: snippet.likeCount || 0,
      publishedAt: snippet.publishedAt,
      replyCount: item.snippet.totalReplyCount || 0,
    },
  };

  // 返信がある場合
  if (item.replies?.comments) {
    thread.replies = item.replies.comments.map((reply: any) => ({
      id: reply.id,
      text: reply.snippet.textDisplay || reply.snippet.textOriginal,
      author: reply.snippet.authorDisplayName,
      authorProfileImageUrl: reply.snippet.authorProfileImageUrl || undefined,
      likeCount: reply.snippet.likeCount || 0,
      publishedAt: reply.snippet.publishedAt,
      replyCount: 0,
    }));
  }

  return thread;
}

/**
 * YouTubeコメントを取得
 */
export async function fetchYouTubeComments(
  videoId: string,
  apiKey: string,
  maxResults: number = DEFAULT_COMMENT_LIMIT,
  onProgress?: ProgressCallback
): Promise<YouTubeCommentThread[]> {
  const allComments: YouTubeCommentThread[] = [];
  let pageToken: string | undefined = undefined;
  let totalFetched = 0;

  while (totalFetched < maxResults) {
    const url = new URL(YOUTUBE_ENDPOINTS.COMMENT_THREADS);
    url.searchParams.set('part', 'snippet,replies');
    url.searchParams.set('videoId', videoId);
    url.searchParams.set('maxResults', String(YOUTUBE_API_MAX_RESULTS));
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('key', apiKey);

    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `YouTube API Error: ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    // コメントデータを変換
    const comments: YouTubeCommentThread[] = (data.items || []).map(
      mapApiResponseToThread
    );

    allComments.push(...comments);
    totalFetched += comments.length;

    // 進捗を更新
    if (onProgress) {
      onProgress(totalFetched, maxResults);
    }

    // 次のページがあるかチェック
    pageToken = data.nextPageToken;
    if (!pageToken || totalFetched >= maxResults) {
      break;
    }

    // Rate Limit対策: 100件取得ごとに少し待機
    if (totalFetched % YOUTUBE_API_MAX_RESULTS === 0) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
  }

  return allComments.slice(0, maxResults);
}

/**
 * API Keyの接続テスト
 */
export async function testYouTubeApiKey(apiKey: string): Promise<boolean> {
  try {
    const url = new URL(YOUTUBE_ENDPOINTS.SEARCH);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', 'test');
    url.searchParams.set('maxResults', '1');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    return response.ok;
  } catch {
    return false;
  }
}
