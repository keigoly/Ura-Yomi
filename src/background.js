// Service Worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTubeコメントwith Gemini installed');
});

// Content Scriptからのメッセージを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_ANALYSIS') {
    handleStartAnalysis(message.videoId, message.title, sender.tab?.windowId)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error starting analysis:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを許可
  } else if (message.type === 'GET_CREDITS') {
    handleGetCredits()
      .then((credits) => {
        sendResponse({ success: true, credits });
      })
      .catch((error) => {
        console.error('Error getting credits:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを許可
  }
});

/**
 * 解析を開始する処理
 */
async function handleStartAnalysis(videoId, title, windowId) {
  try {
    // Side Panelを開く
    if (windowId !== undefined) {
      await chrome.sidePanel.open({ windowId });
    } else {
      // windowIdが取得できない場合は、現在のアクティブなタブから取得
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.windowId !== undefined) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } else {
        throw new Error('ウィンドウIDを取得できませんでした');
      }
    }

    // chrome.storageを使用してSide Panelに解析開始を通知
    await chrome.storage.local.set({
      pendingAnalysis: {
        videoId,
        title: title || '',
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error in handleStartAnalysis:', error);
    throw error;
  }
}

/**
 * クレジット数を取得する処理
 */
async function handleGetCredits() {
  try {
    // chrome.storageからセッショントークンを取得
    const storage = await chrome.storage.local.get(['sessionToken']);
    const sessionToken = storage.sessionToken;
    
    if (!sessionToken) {
      return null; // 認証されていない場合はnullを返す
    }

    // APIからクレジット数を取得
    // API_BASE_URLは環境変数から取得する必要があるが、background.jsでは直接取得できないため、
    // デフォルト値を使用
    const apiBaseUrl = 'http://localhost:3000';
    const response = await fetch(`${apiBaseUrl}/api/user/credits`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success && data.credits !== undefined) {
      return data.credits;
    } else {
      throw new Error(data.error || 'クレジット取得エラー');
    }
  } catch (error) {
    console.error('Error in handleGetCredits:', error);
    throw error;
  }
}

// 注意: default_popupが設定されている場合、onClickedは発火しません
// popup.htmlが表示されるように、onClickedリスナーは削除または条件付きにします
// YouTubeページでない場合のみ、Side Panelを開く処理を実行
// (popup.html内でSide Panelを開く処理が実装されているため)
