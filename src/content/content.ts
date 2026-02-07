/**
 * Content Script for YouTube Comment Analyzer
 * YouTubeページに「解析を開始」ボタンを追加
 */

// YouTubeのコメントセクションにボタンを追加する関数
function addAnalyzeButton() {
  // 既にボタンが追加されている場合はスキップ
  if (document.getElementById('youtube-comment-analyzer-btn')) {
    return;
  }

  // コメントセクションのヘッダーを探す
  const commentsSection = document.getElementById('comments');
  if (!commentsSection) {
    return;
  }

  // ヘッダー部分を探す（複数のパターンを試す）
  let headerElement: HTMLElement | null = null;
  
  // パターン1: #header を直接探す
  headerElement = commentsSection.querySelector('#header') as HTMLElement;
  
  // パターン2: 「並べ替え」テキストを含む要素を探す
  if (!headerElement) {
    const sortButton = Array.from(document.querySelectorAll('*')).find(
      (el) => {
        const text = el.textContent?.trim();
        return text === '並べ替え' || text === 'Sort by' || 
               (text?.includes('並べ替え') && text.length < 20) ||
               (text?.includes('Sort by') && text.length < 20);
      }
    );
    if (sortButton) {
      // 並べ替えボタンの親要素を探す
      let parent = sortButton.parentElement;
      while (parent && parent !== commentsSection) {
        if (parent.classList.toString().includes('header') || 
            parent.id?.includes('header') ||
            parent.getAttribute('class')?.includes('header')) {
          headerElement = parent;
          break;
        }
        parent = parent.parentElement;
      }
      if (!headerElement && sortButton.parentElement) {
        headerElement = sortButton.parentElement;
      }
    }
  }

  // パターン3: コメント数表示の近くを探す
  if (!headerElement) {
    const commentCountElement = Array.from(document.querySelectorAll('*')).find(
      (el) => {
        const text = el.textContent?.trim();
        return text?.match(/^\d+\s*件のコメント$/) || 
               text?.match(/^\d+\s*comments?$/i) ||
               text?.match(/^\d+[\s,]\d*\s*件のコメント$/);
      }
    );
    if (commentCountElement) {
      let parent = commentCountElement.parentElement;
      // 親要素を3階層まで探す
      for (let i = 0; i < 3 && parent; i++) {
        if (parent.querySelector('button, ytd-button-renderer, yt-button-shape')) {
          headerElement = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }
  }

  if (!headerElement) {
    console.log('[YouTube Comment Analyzer] Header element not found, retrying...');
    return;
  }

  // ボタンを作成
  const button = document.createElement('button');
  button.id = 'youtube-comment-analyzer-btn';
  button.title = '解析を開始する';

  // ボタンの内部構造を作成
  const buttonContent = document.createElement('div');
  buttonContent.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    background: #0f0f0f;
    border-radius: 16px;
    padding: 6px 14px;
    line-height: 1;
  `;
  
  // Geminiアイコンを追加
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/gemini-icon.png');
  icon.alt = 'Gemini';
  icon.style.cssText = `
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    vertical-align: middle;
    display: block;
  `;
  buttonContent.appendChild(icon);
  
  // テキスト部分
  const textSpan = document.createElement('span');
  textSpan.textContent = '解析を開始';
  textSpan.id = 'youtube-comment-analyzer-text';
  textSpan.style.cssText = `
    line-height: 1;
    display: flex;
    align-items: center;
  `;
  buttonContent.appendChild(textSpan);
  
  // クレジット数表示部分
  const creditsSpan = document.createElement('span');
  creditsSpan.id = 'youtube-comment-analyzer-credits';
  creditsSpan.style.cssText = `
    font-size: 12px;
    font-weight: 600;
    opacity: 0.9;
    line-height: 1;
    display: flex;
    align-items: center;
  `;
  buttonContent.appendChild(creditsSpan);
  
  button.appendChild(buttonContent);
  
  button.style.cssText = `
    margin-left: 0;
    padding: 2px;
    background: conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF);
    color: white;
    border: none;
    border-radius: 19px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.2s, box-shadow 0.2s;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    flex-shrink: 0;
  `;
  
  // クレジット数を取得して表示
  updateCreditsDisplay(creditsSpan);
  
  // 定期的にクレジット数を更新（30秒ごと）
  setInterval(() => {
    updateCreditsDisplay(creditsSpan);
  }, 30000);

  // ホバー効果 + 親要素のaria-labelツールチップ抑制
  let savedAriaLabel: string | null = null;
  button.addEventListener('mouseenter', () => {
    button.style.filter = 'brightness(1.3)';
    button.style.boxShadow = '0 0 12px 2px rgba(100, 100, 255, 0.5)';
    // 親のtp-yt-paper-buttonのaria-labelを一時的に除去してツールチップを抑制
    const parentLabel = button.closest('#trigger')?.querySelector('[aria-label]') as HTMLElement | null;
    if (parentLabel) {
      savedAriaLabel = parentLabel.getAttribute('aria-label');
      parentLabel.removeAttribute('aria-label');
    }
  });
  button.addEventListener('mouseleave', () => {
    button.style.filter = 'none';
    button.style.boxShadow = 'none';
    // 親のaria-labelを復元
    const parentLabel = button.closest('#trigger')?.querySelector('tp-yt-paper-button') as HTMLElement | null;
    if (parentLabel && savedAriaLabel) {
      parentLabel.setAttribute('aria-label', savedAriaLabel);
      savedAriaLabel = null;
    }
  });

  // クリックイベント
  button.addEventListener('click', async () => {
    button.disabled = true;
    const textSpan = button.querySelector('#youtube-comment-analyzer-text') as HTMLElement;
    if (textSpan) {
      textSpan.textContent = '解析中...';
    }
    button.style.opacity = '0.7';
    button.style.cursor = 'wait';

    // 動画IDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (!videoId) {
      alert('動画IDを取得できませんでした');
      button.disabled = false;
      const textSpan = button.querySelector('#youtube-comment-analyzer-text') as HTMLElement;
      if (textSpan) {
        textSpan.textContent = '解析を開始';
      }
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      return;
    }

    // 動画タイトルを取得
    const videoTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer yt-formatted-string')?.textContent || 
                       document.querySelector('h1[class*="title"]')?.textContent || 
                       '';

    // バックグラウンドスクリプトにメッセージを送信
    try {
      chrome.runtime.sendMessage({
        type: 'START_ANALYSIS',
        videoId,
        title: videoTitle,
      }, (response) => {
        button.disabled = false;
        const textSpan = button.querySelector('#youtube-comment-analyzer-text') as HTMLElement;
        if (textSpan) {
          textSpan.textContent = '解析を開始';
        }
        button.style.opacity = '1';
        button.style.cursor = 'pointer';

        if (chrome.runtime.lastError) {
          console.error('[YouTube Comment Analyzer] Error:', chrome.runtime.lastError);
          alert('解析の開始に失敗しました: ' + chrome.runtime.lastError.message);
        } else if (response?.success) {
          console.log('[YouTube Comment Analyzer] Analysis started');
        } else {
          console.error('[YouTube Comment Analyzer] Failed to start analysis:', response?.error);
          alert(response?.error || '解析の開始に失敗しました');
        }
      });
    } catch (error) {
      console.error('[YouTube Comment Analyzer] Error sending message:', error);
      alert('解析の開始に失敗しました');
      button.disabled = false;
      const textSpan = button.querySelector('#youtube-comment-analyzer-text') as HTMLElement;
      if (textSpan) {
        textSpan.textContent = '解析を開始';
      }
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  });

  // ヘッダーにボタンを追加
  // 「並べ替え」ボタンの右隣に追加する
  const sortButton = Array.from(headerElement.querySelectorAll('button, ytd-button-renderer, yt-button-shape, [role="button"]')).find(
    (el) => {
      const text = el.textContent?.trim();
      return text === '並べ替え' || text === 'Sort by' || 
             (text?.includes('並べ替え') && text.length < 20) ||
             (text?.includes('Sort by') && text.length < 20);
    }
  );

  if (sortButton) {
    // 並べ替えボタンの親要素を取得
    let container = sortButton.parentElement;
    
    // 親要素がflexboxでない場合は、flexboxを適用する
    if (container) {
      const computedStyle = window.getComputedStyle(container);
      const display = computedStyle.display;
      
      // flexboxでない場合は、flexboxを適用
      if (display !== 'flex' && display !== 'inline-flex') {
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '8px';
      }
      
      // 並べ替えボタンの直後に挿入（右隣に配置）
      if (sortButton.nextSibling) {
        container.insertBefore(button, sortButton.nextSibling);
      } else {
        container.appendChild(button);
      }
    } else {
      // 親要素が見つからない場合は、並べ替えボタンの後に直接挿入を試みる
      // ただし、これは通常発生しない
      headerElement.appendChild(button);
    }
  } else {
    // 見つからない場合はヘッダーの最後に追加
    headerElement.appendChild(button);
  }
}

// ページ読み込み時に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // 少し遅延させてYouTubeの動的コンテンツが読み込まれるのを待つ
    setTimeout(addAnalyzeButton, 1000);
  });
} else {
  setTimeout(addAnalyzeButton, 1000);
}

// YouTubeはSPAなので、URL変更を監視
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // URLが変更されたら少し待ってからボタンを追加
    setTimeout(addAnalyzeButton, 1500);
  }
}).observe(document, { subtree: true, childList: true });

// クレジット数を取得して表示する関数
function updateCreditsDisplay(creditsSpan: HTMLElement) {
  chrome.runtime.sendMessage(
    { type: 'GET_CREDITS' },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[YouTube Comment Analyzer] Error getting credits:', chrome.runtime.lastError);
        creditsSpan.textContent = '';
        return;
      }
      
      if (response?.success && response.credits !== null && response.credits !== undefined) {
        creditsSpan.textContent = `${response.credits}`;
      } else {
        creditsSpan.textContent = '';
      }
    }
  );
}

// 定期的にボタンの存在を確認（YouTubeの動的コンテンツに対応）
setInterval(() => {
  if (!document.getElementById('youtube-comment-analyzer-btn')) {
    addAnalyzeButton();
  } else {
    // ボタンが存在する場合は、クレジット数を更新
    const creditsSpan = document.getElementById('youtube-comment-analyzer-credits');
    if (creditsSpan) {
      updateCreditsDisplay(creditsSpan);
    }
  }
}, 2000);
