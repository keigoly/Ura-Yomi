// Service Worker for Chrome Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('TubeInsight AI installed');
});

// Side Panelを開く処理
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('youtube.com/watch')) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
