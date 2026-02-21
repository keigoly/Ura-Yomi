/**
 * 解析結果のお気に入り＆履歴ストレージサービス（chrome.storage.local）
 */

import type { AnalysisResult, VideoInfo, YouTubeCommentThread } from '../types';

// ---- 型定義 ----

export interface FavoriteEntry {
  id: string;
  videoId: string;
  videoTitle: string;
  savedAt: string;
  analyzedAt: string;
  result: AnalysisResult;
  comments: YouTubeCommentThread[];
  videoInfo: VideoInfo | null;
}

export interface HistoryEntry {
  id: string;
  videoId: string;
  videoTitle: string;
  analyzedAt: string;
  result: AnalysisResult;
  comments: YouTubeCommentThread[];
  videoInfo: VideoInfo | null;
}

export type FavoriteListItem = Pick<FavoriteEntry, 'id' | 'videoId' | 'videoTitle' | 'savedAt' | 'analyzedAt'>;
export type HistoryListItem = Pick<HistoryEntry, 'id' | 'videoId' | 'videoTitle' | 'analyzedAt'>;

export type FullEntry = (FavoriteEntry | HistoryEntry) & { source: 'favorite' | 'history' };

// ---- 定数 ----

const FAVORITES_KEY = 'yt-gemini-favorites';
const HISTORY_KEY = 'yt-gemini-history-v2';
const MIGRATION_DONE_KEY = 'yt-gemini-migration-done';
const MAX_FAVORITES = 30;

// ---- お気に入り ----

export async function getFavorites(): Promise<FavoriteEntry[]> {
  const data = await chrome.storage.local.get(FAVORITES_KEY);
  return data[FAVORITES_KEY] || [];
}

export async function getFavoritesList(): Promise<FavoriteListItem[]> {
  const entries = await getFavorites();
  return entries.map(({ id, videoId, videoTitle, savedAt, analyzedAt }) => ({
    id, videoId, videoTitle, savedAt, analyzedAt,
  }));
}

export async function addFavorite(entry: Omit<FavoriteEntry, 'savedAt'>): Promise<void> {
  const entries = await getFavorites();
  // 同じIDがあれば上書き
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = { ...entry, savedAt: new Date().toISOString() };
  } else {
    if (entries.length >= MAX_FAVORITES) {
      throw new Error('FAVORITES_FULL');
    }
    entries.unshift({ ...entry, savedAt: new Date().toISOString() });
  }
  await chrome.storage.local.set({ [FAVORITES_KEY]: entries });
}

export async function removeFavorite(id: string): Promise<void> {
  const entries = await getFavorites();
  await chrome.storage.local.set({ [FAVORITES_KEY]: entries.filter((e) => e.id !== id) });
}

export async function isFavorite(id: string): Promise<boolean> {
  const entries = await getFavorites();
  return entries.some((e) => e.id === id);
}

// ---- 履歴 ----

export async function getHistory(): Promise<HistoryEntry[]> {
  const data = await chrome.storage.local.get(HISTORY_KEY);
  return data[HISTORY_KEY] || [];
}

export async function getHistoryList(): Promise<HistoryListItem[]> {
  const entries = await getHistory();
  return entries.map(({ id, videoId, videoTitle, analyzedAt }) => ({
    id, videoId, videoTitle, analyzedAt,
  }));
}

export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const entries = await getHistory();
  // 同じIDがあれば上書き
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.unshift(entry);
  }
  // 容量超過時は古いものから削除してリトライ
  let toSave = entries;
  while (toSave.length > 0) {
    try {
      await chrome.storage.local.set({ [HISTORY_KEY]: toSave });
      return;
    } catch {
      // 容量超過: 古い半分を削除してリトライ
      if (toSave.length <= 1) {
        // 1件でも入らない場合はあきらめる
        console.warn('[analysisStorage] Cannot save even 1 history entry');
        return;
      }
      toSave = toSave.slice(0, Math.ceil(toSave.length / 2));
    }
  }
}

export async function removeFromHistory(id: string): Promise<void> {
  const entries = await getHistory();
  await chrome.storage.local.set({ [HISTORY_KEY]: entries.filter((e) => e.id !== id) });
}

export async function clearAllHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_KEY);
}

// ---- データ取得 ----

export async function getEntryById(id: string): Promise<FullEntry | null> {
  // お気に入りから検索
  const favorites = await getFavorites();
  const fav = favorites.find((e) => e.id === id);
  if (fav) return { ...fav, source: 'favorite' };

  // 履歴から検索
  const history = await getHistory();
  const hist = history.find((e) => e.id === id);
  if (hist) return { ...hist, source: 'history' };

  return null;
}

// ---- マイグレーション ----

const OLD_STORAGE_KEY = 'yt-gemini-history';

export async function migrateFromLocalStorage(): Promise<void> {
  // 既にマイグレーション済みかチェック
  const done = await chrome.storage.local.get(MIGRATION_DONE_KEY);
  if (done[MIGRATION_DONE_KEY]) return;

  try {
    const raw = localStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) {
      await chrome.storage.local.set({ [MIGRATION_DONE_KEY]: true });
      return;
    }

    const oldEntries = JSON.parse(raw) as Array<{
      id: string;
      videoId: string;
      videoTitle: string;
      analyzedAt: string;
      result: AnalysisResult;
      comments: YouTubeCommentThread[];
      videoInfo: VideoInfo | null;
    }>;

    if (oldEntries.length === 0) {
      await chrome.storage.local.set({ [MIGRATION_DONE_KEY]: true });
      localStorage.removeItem(OLD_STORAGE_KEY);
      return;
    }

    // 既存の履歴に追加（重複チェック付き）
    const existing = await getHistory();
    const existingIds = new Set(existing.map((e) => e.id));
    const newEntries = oldEntries.filter((e) => !existingIds.has(e.id));

    if (newEntries.length > 0) {
      const merged = [...existing, ...newEntries];
      await chrome.storage.local.set({ [HISTORY_KEY]: merged });
    }

    // マイグレーション完了
    await chrome.storage.local.set({ [MIGRATION_DONE_KEY]: true });
    localStorage.removeItem(OLD_STORAGE_KEY);
    console.log(`[analysisStorage] Migrated ${newEntries.length} entries from localStorage`);
  } catch (e) {
    console.error('[analysisStorage] Migration failed:', e);
    // 失敗してもマイグレーション済みとしてマーク（無限リトライ防止）
    await chrome.storage.local.set({ [MIGRATION_DONE_KEY]: true });
  }
}
