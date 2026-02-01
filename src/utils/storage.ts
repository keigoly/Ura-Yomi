/**
 * Chrome Storage関連のユーティリティ関数
 */

import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

// 型をre-export（後方互換性のため）
export type { AppSettings };

/**
 * ストレージキー
 */
const STORAGE_KEYS = {
  SETTINGS: 'settings',
} as const;

/**
 * 設定を取得
 */
export async function getSettings(): Promise<AppSettings> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) };
}

/**
 * 設定を保存
 */
export async function saveSettings(
  settings: Partial<AppSettings>
): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
}

/**
 * API Keyを取得
 */
export async function getApiKeys(): Promise<{
  youtubeApiKey?: string;
  geminiApiKey?: string;
}> {
  const settings = await getSettings();
  return {
    youtubeApiKey: settings.youtubeApiKey,
    geminiApiKey: settings.geminiApiKey,
  };
}

/**
 * 設定をリセット
 */
export async function resetSettings(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
}
