/**
 * YouTube関連のユーティリティ関数
 */

import type { YouTubeVideoInfo } from '../types';

// 型をre-export（後方互換性のため）
export type { YouTubeVideoInfo };

/**
 * 現在のタブからYouTube動画情報を取得
 */
export async function getCurrentYouTubeVideo(): Promise<YouTubeVideoInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url) {
    return null;
  }

  const url = new URL(tab.url);
  if (url.hostname !== 'www.youtube.com') {
    return null;
  }

  // 通常動画 (/watch?v=...)
  if (url.pathname === '/watch') {
    const videoId = url.searchParams.get('v');
    if (!videoId) return null;
    return { videoId, title: tab.title || undefined, url: tab.url };
  }

  // ショート動画 (/shorts/VIDEO_ID)
  const shortsMatch = url.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) {
    return { videoId: shortsMatch[1], title: tab.title || undefined, url: tab.url };
  }

  return null;
}

/**
 * YouTube動画URLからVideo IDを抽出
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // 標準のYouTube URL
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      // ショート動画 (/shorts/VIDEO_ID)
      const shortsMatch = urlObj.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        return shortsMatch[1];
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1];
      }
      if (urlObj.pathname.startsWith('/v/')) {
        return urlObj.pathname.split('/v/')[1];
      }
    }

    // 短縮URL
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * URLがYouTube動画URLかどうかを判定
 */
export function isYouTubeVideoUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}
