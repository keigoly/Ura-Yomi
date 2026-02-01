/**
 * YouTube関連のユーティリティ関数
 */

export interface YouTubeVideoInfo {
  videoId: string;
  title?: string;
  url: string;
}

/**
 * 現在のタブからYouTube動画情報を取得
 */
export async function getCurrentYouTubeVideo(): Promise<YouTubeVideoInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url) {
    return null;
  }

  const url = new URL(tab.url);
  if (url.hostname !== 'www.youtube.com' || url.pathname !== '/watch') {
    return null;
  }

  const videoId = url.searchParams.get('v');
  if (!videoId) {
    return null;
  }

  return {
    videoId,
    title: tab.title || undefined,
    url: tab.url,
  };
}

/**
 * YouTube動画URLからVideo IDを抽出
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
      if (urlObj.pathname === '/watch') {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1];
      }
      if (urlObj.pathname.startsWith('/v/')) {
        return urlObj.pathname.split('/v/')[1];
      }
    }
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}
