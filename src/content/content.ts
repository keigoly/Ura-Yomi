/**
 * Content Script for YouTube Comment Analyzer
 * YouTubeページ（通常動画 + ショート動画）に「解析を開始」ボタンを追加
 */

// ---- 多言語対応 ----

type ContentLanguage = 'ja' | 'en';

/** 現在の言語（chrome.storage.localから非同期で取得、デフォルトja） */
let currentLang: ContentLanguage = 'ja';

/** コンテンツスクリプト用の翻訳辞書 */
const CONTENT_TRANSLATIONS: Record<ContentLanguage, Record<string, string>> = {
  ja: {
    'btn.title': '解析を開始する',
    'btn.analyzing': '解析中...',
    'btn.defaultText': '解析を開始',
    'btn.errorNoVideoId': '動画IDを取得できませんでした',
    'btn.errorFailed': '解析の開始に失敗しました',
  },
  en: {
    'btn.title': 'Start Analysis',
    'btn.analyzing': 'Analyzing...',
    'btn.defaultText': 'Start Analysis',
    'btn.errorNoVideoId': 'Could not get video ID',
    'btn.errorFailed': 'Failed to start analysis',
  },
};

/** ボタンに表示するユウちゃんの顔画像とセリフの組み合わせ（言語別） */
const YUCHAN_BUTTON_VARIANTS: Record<ContentLanguage, { image: string; text: string }[]> = {
  ja: [
    { image: 'yuchan-btn-1.png', text: '解析してみよう！' },
    { image: 'yuchan-btn-2.png', text: '解析してね！' },
    { image: 'yuchan-btn-3.png', text: '解析しちゃおっか♪' },
  ],
  en: [
    { image: 'yuchan-btn-1.png', text: "Let's analyze!" },
    { image: 'yuchan-btn-2.png', text: 'Analyze this!' },
    { image: 'yuchan-btn-3.png', text: 'Ready to analyze?' },
  ],
};

function ct(key: string): string {
  return CONTENT_TRANSLATIONS[currentLang][key] ?? key;
}

/** chrome.storage.localから言語を読み込む */
function loadLanguage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['language'], (result) => {
      if (result.language === 'en' || result.language === 'ja') {
        currentLang = result.language;
      }
      resolve();
    });
  });
}

// 言語変更を監視してボタンを再生成
chrome.storage.onChanged.addListener((changes) => {
  if (changes.language?.newValue && changes.language.newValue !== currentLang) {
    currentLang = changes.language.newValue as ContentLanguage;
    // 既存ボタンを削除して再生成（新しい言語のテキストで）
    const existingBtn = document.getElementById('youtube-comment-analyzer-btn');
    if (existingBtn) existingBtn.closest('div[style]')?.remove() || existingBtn.remove();
    tryAddButton();
  }
});

// ---- ユーティリティ ----

/** 現在のURLがショート動画かどうか */
function isShorts(): boolean {
  return window.location.pathname.startsWith('/shorts/');
}

/** 動画IDを取得（通常動画 + ショート動画対応） */
function getVideoId(): string | null {
  if (isShorts()) {
    const match = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
  return new URLSearchParams(window.location.search).get('v');
}

/** 動画タイトルを取得 */
function getVideoTitle(): string {
  if (isShorts()) {
    // ショート動画のタイトル取得
    const titleEl =
      document.querySelector('ytd-reel-video-renderer[is-active] h2 yt-formatted-string') ||
      document.querySelector('ytd-reel-video-renderer[is-active] .ytShortsVideoTitleViewModelShortsVideoTitle') ||
      document.querySelector('#overlay .title');
    return titleEl?.textContent?.trim() || '';
  }
  return (
    document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.ytd-video-primary-info-renderer yt-formatted-string')?.textContent ||
    document.querySelector('h1[class*="title"]')?.textContent ||
    ''
  );
}

// ---- ユウちゃんボタンバリエーション ----

/** ランダムにバリエーションを選択 */
function pickButtonVariant() {
  const variants = YUCHAN_BUTTON_VARIANTS[currentLang];
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx];
}

// ---- ボタン作成（共通） ----

/**
 * 解析ボタンのHTML要素を作成する（通常動画・ショート動画共通）
 * @param compact true の場合、ショート動画向けのコンパクトサイズ
 */
function createAnalyzeButton(compact: boolean): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = 'youtube-comment-analyzer-btn';
  button.title = ct('btn.title');

  const iconSize = compact ? 26 : 30;
  const innerRadius = Math.ceil(iconSize / 2);

  const buttonContent = document.createElement('div');
  buttonContent.style.cssText = `
    display: flex;
    align-items: center;
    gap: ${compact ? '6px' : '8px'};
    background: #0f0f0f;
    border-radius: ${innerRadius}px;
    padding: ${compact ? '0 10px 0 0' : '0 12px 0 0'};
    line-height: 1;
  `;

  // ユウちゃんアイコン + セリフ
  const variant = pickButtonVariant();

  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL(`icons/${variant.image}`);
  icon.alt = 'Yu-chan';
  icon.style.cssText = `
    width: ${iconSize}px;
    height: ${iconSize}px;
    flex-shrink: 0;
    display: block;
    border-radius: 50%;
    object-fit: cover;
  `;
  buttonContent.appendChild(icon);

  // テキスト（セリフ）- 文字数に応じてフォントサイズを調整
  const textLen = variant.text.length;
  const baseFontSize = compact ? 12 : 13;
  const fontSize = textLen > 8 ? baseFontSize - 1 : baseFontSize;

  const textSpan = document.createElement('span');
  textSpan.textContent = variant.text;
  textSpan.id = 'youtube-comment-analyzer-text';
  textSpan.dataset.defaultText = variant.text;
  textSpan.style.cssText = `
    line-height: 1;
    display: flex;
    align-items: center;
    font-size: ${fontSize}px;
  `;
  buttonContent.appendChild(textSpan);

  // クレジット数
  const creditsSpan = document.createElement('span');
  creditsSpan.id = 'youtube-comment-analyzer-credits';
  creditsSpan.textContent = '';
  creditsSpan.style.cssText = `
    font-size: ${compact ? '11px' : '12px'};
    font-weight: 700;
    opacity: 0.9;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    color: white;
  `;
  buttonContent.appendChild(creditsSpan);

  button.appendChild(buttonContent);

  button.style.cssText = `
    margin-left: 0;
    padding: 2px;
    background: conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF);
    color: white;
    border: none;
    border-radius: ${innerRadius + 2}px;
    font-size: ${compact ? '12px' : '13px'};
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

  // ホバー効果
  let savedAriaLabel: string | null = null;
  button.addEventListener('mouseenter', () => {
    button.style.filter = 'brightness(1.3)';
    button.style.boxShadow = '0 0 12px 2px rgba(100, 100, 255, 0.5)';
    const parentLabel = button.closest('#trigger')?.querySelector('[aria-label]') as HTMLElement | null;
    if (parentLabel) {
      savedAriaLabel = parentLabel.getAttribute('aria-label');
      parentLabel.removeAttribute('aria-label');
    }
  });
  button.addEventListener('mouseleave', () => {
    button.style.filter = 'none';
    button.style.boxShadow = 'none';
    const parentLabel = button.closest('#trigger')?.querySelector('tp-yt-paper-button') as HTMLElement | null;
    if (parentLabel && savedAriaLabel) {
      parentLabel.setAttribute('aria-label', savedAriaLabel);
      savedAriaLabel = null;
    }
  });

  // クリックイベント（並べ替えメニューへのバブリングを防止）
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    button.disabled = true;
    const txt = button.querySelector('#youtube-comment-analyzer-text') as HTMLElement;
    if (txt) txt.textContent = ct('btn.analyzing');
    button.style.opacity = '0.7';
    button.style.cursor = 'wait';

    const videoId = getVideoId();
    if (!videoId) {
      alert(ct('btn.errorNoVideoId'));
      resetButton(button);
      return;
    }

    const videoTitle = getVideoTitle();

    try {
      chrome.runtime.sendMessage(
        { type: 'START_ANALYSIS', videoId, title: videoTitle },
        (response) => {
          resetButton(button);
          if (chrome.runtime.lastError) {
            console.error('[YouTube Comment Analyzer] Error:', chrome.runtime.lastError);
            alert(ct('btn.errorFailed') + ': ' + chrome.runtime.lastError.message);
          } else if (response?.success) {
            console.log('[YouTube Comment Analyzer] Analysis started');
          } else {
            console.error('[YouTube Comment Analyzer] Failed:', response?.error);
            alert(response?.error || ct('btn.errorFailed'));
          }
        }
      );
    } catch (error) {
      console.error('[YouTube Comment Analyzer] Error sending message:', error);
      alert(ct('btn.errorFailed'));
      resetButton(button);
    }
  });

  return button;
}

/** ボタンを初期状態に戻す */
function resetButton(button: HTMLButtonElement) {
  button.disabled = false;
  const txt = button.querySelector('#youtube-comment-analyzer-text') as HTMLElement;
  if (txt) txt.textContent = txt.dataset.defaultText || ct('btn.defaultText');
  button.style.opacity = '1';
  button.style.cursor = 'pointer';
}

// ---- 通常動画向けボタン追加 ----

function addAnalyzeButton() {
  if (document.getElementById('youtube-comment-analyzer-btn')) return;
  if (isShorts()) return;

  // コメントセクションのヘッダーを探す
  const commentsSection = document.getElementById('comments');
  if (!commentsSection) return;

  let headerElement: HTMLElement | null = null;

  // パターン1: #header を直接探す
  headerElement = commentsSection.querySelector('#header') as HTMLElement;

  // パターン2: 「並べ替え」テキストを含む要素を探す
  if (!headerElement) {
    const sortButton = Array.from(document.querySelectorAll('*')).find((el) => {
      const text = el.textContent?.trim();
      return (
        text === '並べ替え' || text === 'Sort by' ||
        (text?.includes('並べ替え') && text.length < 20) ||
        (text?.includes('Sort by') && text.length < 20)
      );
    });
    if (sortButton) {
      let parent = sortButton.parentElement;
      while (parent && parent !== commentsSection) {
        if (
          parent.classList.toString().includes('header') ||
          parent.id?.includes('header') ||
          parent.getAttribute('class')?.includes('header')
        ) {
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
    const commentCountElement = Array.from(document.querySelectorAll('*')).find((el) => {
      const text = el.textContent?.trim();
      return (
        text?.match(/^\d+\s*件のコメント$/) ||
        text?.match(/^\d+\s*comments?$/i) ||
        text?.match(/^\d+[\s,]\d*\s*件のコメント$/)
      );
    });
    if (commentCountElement) {
      let parent = commentCountElement.parentElement;
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

  const button = createAnalyzeButton(false);

  // 「並べ替え」のドロップダウン全体を探す（yt-sort-filter-sub-menu-renderer が最適）
  const sortRenderer = headerElement.querySelector('yt-sort-filter-sub-menu-renderer') as HTMLElement | null;

  if (sortRenderer) {
    // sortRenderer の直接の親要素内で、sortRenderer の右隣に独立ラッパーを挿入
    // ドロップダウンの内部には入れず、兄弟要素として配置
    const sortParent = sortRenderer.parentElement!;

    // 親要素をflex化して横並びにする
    sortParent.style.display = 'flex';
    sortParent.style.alignItems = 'center';
    sortParent.style.gap = '8px';
    sortParent.style.flexWrap = 'nowrap';

    // 独立ラッパーで囲んでバブリングを完全に遮断
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: inline-flex; align-items: center; margin-left: 12px;';
    wrapper.addEventListener('click', (e) => e.stopPropagation());
    wrapper.appendChild(button);

    // sortRendererの直後に挿入
    if (sortRenderer.nextSibling) {
      sortParent.insertBefore(wrapper, sortRenderer.nextSibling);
    } else {
      sortParent.appendChild(wrapper);
    }
  } else {
    // フォールバック: 並べ替えテキストを持つ要素を探す
    const sortEl = Array.from(headerElement.querySelectorAll('*')).find(
      (el) => {
        const text = el.textContent?.trim();
        return (
          (text === '並べ替え' || text === 'Sort by') &&
          (el.tagName.includes('-') || el.matches('button, [role="button"]'))
        );
      }
    );

    if (sortEl) {
      // 最も近い行レベルの親を探す（flexまたはinline要素）
      let rowParent = sortEl.parentElement;
      while (rowParent && rowParent !== headerElement) {
        const display = window.getComputedStyle(rowParent).display;
        if (display === 'flex' || display === 'inline-flex') break;
        rowParent = rowParent.parentElement;
      }

      const target = rowParent || sortEl.parentElement;
      if (target) {
        target.style.display = 'flex';
        target.style.alignItems = 'center';
        target.style.gap = '8px';

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: inline-flex; align-items: center;';
        wrapper.addEventListener('click', (e) => e.stopPropagation());
        wrapper.appendChild(button);
        target.appendChild(wrapper);
      } else {
        headerElement.appendChild(button);
      }
    } else {
      headerElement.appendChild(button);
    }
  }
}

// ---- ショート動画向けボタン追加 ----

function addAnalyzeButtonForShorts() {
  if (document.getElementById('youtube-comment-analyzer-btn')) return;
  if (!isShorts()) return;

  // ショート動画のコメントパネルを探す
  const commentsPanel = document.querySelector(
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]'
  ) as HTMLElement;
  if (!commentsPanel) return;

  // パネル内のヘッダーを探す
  const header = commentsPanel.querySelector('#header') as HTMLElement;
  if (!header) return;

  // 並べ替えボタン（ソートアイコン）を探す
  // ショート動画のコメントパネルでは yt-sort-filter-sub-menu-renderer や
  // yt-icon-button[aria-label] で並べ替えアイコンを見つける
  let sortElement: Element | null = null;

  // パターン1: yt-sort-filter-sub-menu-renderer
  sortElement = header.querySelector('yt-sort-filter-sub-menu-renderer');

  // パターン2: #sort-menu 内のボタン
  if (!sortElement) {
    sortElement = header.querySelector('#sort-menu');
  }

  // パターン3: aria-labelで探す
  if (!sortElement) {
    sortElement = header.querySelector('[aria-label="並べ替え"], [aria-label="Sort comments"]');
  }

  // パターン4: テキストで探す
  if (!sortElement) {
    const allButtons = header.querySelectorAll('button, yt-icon-button, ytd-button-renderer, yt-button-shape, [role="button"]');
    for (const btn of allButtons) {
      const label = btn.getAttribute('aria-label') || btn.textContent?.trim() || '';
      if (label.includes('並べ替え') || label.includes('Sort') || label.includes('filter')) {
        sortElement = btn;
        break;
      }
    }
  }

  // パターン5: ヘッダー内のアクションボタン領域から探す（閉じるボタンの左隣の要素）
  if (!sortElement) {
    const actionButtons = header.querySelector('#action-buttons, .action-buttons') as HTMLElement;
    if (actionButtons && actionButtons.firstElementChild) {
      sortElement = actionButtons.firstElementChild;
    }
  }

  const button = createAnalyzeButton(true);

  if (sortElement) {
    const container = sortElement.parentElement;
    if (container) {
      const computedStyle = window.getComputedStyle(container);
      const display = computedStyle.display;
      if (display !== 'flex' && display !== 'inline-flex') {
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.gap = '4px';
      }
      // 並べ替えボタンの左隣に挿入
      container.insertBefore(button, sortElement);
    } else {
      header.appendChild(button);
    }
  } else {
    // ソートボタンが見つからない場合はヘッダーに追加
    header.appendChild(button);
  }
}

// ---- クレジット表示 ----

function updateCreditsDisplay(creditsSpan: HTMLElement) {
  chrome.runtime.sendMessage({ type: 'GET_CREDITS' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[YCA] GET_CREDITS lastError:', chrome.runtime.lastError.message);
      creditsSpan.textContent = '';
      return;
    }
    if (response?.success && response.credits !== null && response.credits !== undefined) {
      creditsSpan.textContent = `${response.credits}`;
    } else {
      creditsSpan.textContent = '';
    }
  });
}

// ---- 初期化 ----

function tryAddButton() {
  if (isShorts()) {
    addAnalyzeButtonForShorts();
  } else {
    addAnalyzeButton();
  }
}

// 言語を読み込んでからボタンを追加
async function init() {
  await loadLanguage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(tryAddButton, 1000);
    });
  } else {
    setTimeout(tryAddButton, 1000);
  }
}

init();

// YouTubeはSPAなので、URL変更 + DOM変更を監視
let lastUrl = location.href;
let buttonCheckTimer: number | null = null;

new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // URL変更時は既存ボタンを削除してから再追加（ショート⇔通常切替対応）
    const existingBtn = document.getElementById('youtube-comment-analyzer-btn');
    if (existingBtn) existingBtn.remove();
    if (buttonCheckTimer !== null) {
      clearTimeout(buttonCheckTimer);
      buttonCheckTimer = null;
    }
    setTimeout(tryAddButton, 1500);
    return;
  }

  // 並べ替えクリック等でボタンが消えた場合、素早く再挿入（デバウンス300ms）
  if (buttonCheckTimer === null) {
    buttonCheckTimer = window.setTimeout(() => {
      buttonCheckTimer = null;
      if (!document.getElementById('youtube-comment-analyzer-btn')) {
        tryAddButton();
      }
    }, 300);
  }
}).observe(document, { subtree: true, childList: true });

// 定期的にボタンの存在を確認（フォールバック + クレジット更新）
setInterval(() => {
  if (!document.getElementById('youtube-comment-analyzer-btn')) {
    tryAddButton();
  } else {
    const creditsSpan = document.getElementById('youtube-comment-analyzer-credits');
    if (creditsSpan) {
      updateCreditsDisplay(creditsSpan);
    }
  }
}, 3000);
