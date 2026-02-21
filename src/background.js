// Service Worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('ウラヨミ！ Powered by Google Gemini installed');
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
  } else if (message.type === 'GET_PLAN') {
    handleGetPlan()
      .then((planInfo) => {
        sendResponse({ success: true, ...planInfo });
      })
      .catch((error) => {
        console.error('[BG] GET_PLAN error:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを許可
  } else if (message.type === 'OPEN_RESULT_WINDOW') {
    // サイドパネルからの新しいウィンドウ作成リクエスト
    const url = chrome.runtime.getURL('sidepanel.html') + '?restore=1';
    chrome.windows.create({ url, type: 'popup', width: 420, height: 720 })
      .then((win) => {
        // 新しいウィンドウが開いたら元のサイドパネルを閉じる
        if (message.windowId && chrome.sidePanel?.close) {
          chrome.sidePanel.close({ windowId: message.windowId }).catch(() => {});
        }
        sendResponse({ success: true, windowId: win?.id });
      })
      .catch((error) => {
        console.error('[BG] Failed to create result window:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (message.type === 'SYNC_TOKEN') {
    // Popup/SidePanelからトークンとAPI URLを受け取りchrome.storage.localに保存
    const token = message.token;
    const dataToSet = {};
    if (token) {
      dataToSet.sessionToken = token;
    }
    if (message.apiBaseUrl) {
      dataToSet.apiBaseUrl = message.apiBaseUrl;
    }

    if (token) {
      chrome.storage.local.set(dataToSet).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('[BG] Token sync failed:', error);
        sendResponse({ success: false });
      });
    } else {
      chrome.storage.local.remove(['sessionToken']).then(() => {
        sendResponse({ success: true });
      }).catch(() => sendResponse({ success: false }));
    }
    return true;
  }
});

/**
 * 解析を開始する処理
 */
async function handleStartAnalysis(videoId, title, windowId) {
  try {
    // Side Panelを開く（ユーザージェスチャーチェーンを維持するため最初に呼ぶ）
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
 * プラン情報を取得する処理
 */
async function handleGetPlan() {
  try {
    // chrome.storageからセッショントークンとAPI URLを取得
    const storage = await chrome.storage.local.get(['sessionToken', 'apiBaseUrl']);
    const sessionToken = storage.sessionToken;

    if (!sessionToken) {
      return null; // 認証されていない場合はnullを返す
    }

    // APIからプラン情報を取得
    const apiBaseUrl = storage.apiBaseUrl || 'https://api.keigoly.jp';
    const response = await fetch(`${apiBaseUrl}/api/user/plan`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    });

    if (response.status === 401) {
      // トークンが無効 → 古いトークンを削除
      console.warn('[BG] Session token expired (401), clearing stale token');
      await chrome.storage.local.remove(['sessionToken']);
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success) {
      return {
        plan: data.plan,
        dailyLimit: data.dailyLimit,
        dailyUsed: data.dailyUsed,
        dailyRemaining: data.dailyRemaining,
        commentLimit: data.commentLimit,
      };
    } else {
      throw new Error(data.error || 'プラン情報取得エラー');
    }
  } catch (error) {
    console.error('[BG] Error in handleGetPlan:', error);
    throw error;
  }
}
