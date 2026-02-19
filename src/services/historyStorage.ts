/**
 * 解析履歴の保存・取得・削除ユーティリティ（localStorage）
 */

import type { AnalysisResult, VideoInfo, YouTubeCommentThread } from '../types';

const STORAGE_KEY = 'yt-gemini-history';
const MAX_ENTRIES = 30;

export interface HistoryEntry {
  id: string;
  videoId: string;
  videoTitle: string;
  analyzedAt: string;
  result: AnalysisResult;
  comments: YouTubeCommentThread[];
  videoInfo: VideoInfo | null;
}

export type HistoryListItem = Pick<HistoryEntry, 'id' | 'videoId' | 'videoTitle' | 'analyzedAt'>;

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    // localStorage容量超過時は古いエントリを削除してリトライ
    console.warn('[historyStorage] writeAll failed, trimming old entries:', e);
    const trimmed = entries.slice(0, Math.max(1, Math.floor(entries.length / 2)));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // それでも失敗する場合は最新1件のみ
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 1)));
    }
  }
}

/** 履歴を保存（最大20件、古いものから自動削除） */
export function saveHistory(entry: HistoryEntry): void {
  const entries = readAll();
  // 同じIDがあれば上書き
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.unshift(entry);
  }
  // 最大件数を超えたら古いものを削除
  writeAll(entries.slice(0, MAX_ENTRIES));
}

/** 一覧取得（result/commentsを含めない軽量版） */
export function getHistoryList(): HistoryListItem[] {
  return readAll().map(({ id, videoId, videoTitle, analyzedAt }) => ({
    id,
    videoId,
    videoTitle,
    analyzedAt,
  }));
}

/** 1件の完全データ取得 */
export function getHistoryEntry(id: string): HistoryEntry | null {
  return readAll().find((e) => e.id === id) ?? null;
}

/** 1件削除 */
export function deleteHistoryEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}

/** 全削除 */
export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
