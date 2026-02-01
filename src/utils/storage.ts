/**
 * Chrome Storage関連のユーティリティ関数
 */

export interface AppSettings {
  youtubeApiKey?: string;
  geminiApiKey?: string;
  commentLimit?: number;
  summaryLength?: 'short' | 'medium' | 'long';
}

const DEFAULT_SETTINGS: AppSettings = {
  commentLimit: 10000,
  summaryLength: 'medium',
};

/**
 * 設定を取得
 */
export async function getSettings(): Promise<AppSettings> {
  const result = await chrome.storage.local.get(['settings']);
  return { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
}

/**
 * 設定を保存
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ settings: updated });
}

/**
 * API Keyを取得
 */
export async function getApiKeys(): Promise<{ youtubeApiKey?: string; geminiApiKey?: string }> {
  const settings = await getSettings();
  return {
    youtubeApiKey: settings.youtubeApiKey,
    geminiApiKey: settings.geminiApiKey,
  };
}
