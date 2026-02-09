/**
 * キャラクターモード設定管理（Zustand）
 * 要約タブ・深掘りタブのキャラクターモードON/OFFを管理
 * キャラクター変換済みテキストのキャッシュも管理（localStorage永続化）
 */

import { create } from 'zustand';

const STORAGE_KEYS = {
  SUMMARY: 'yt-gemini-summary-character',
  DEEPDIVE: 'yt-gemini-deepdive-character',
  CACHE: 'yt-gemini-character-cache',
} as const;

const MAX_CACHE_ENTRIES = 30;

interface CacheEntry {
  original: string;
  rewritten: string;
}

interface CharacterState {
  summaryCharacterMode: boolean;
  deepdiveCharacterMode: boolean;
  /** キャラクター変換済みテキストのキャッシュ（元テキスト → 変換済みテキスト） */
  summaryCache: Map<string, string>;
  setSummaryCharacterMode: (enabled: boolean) => void;
  setDeepdiveCharacterMode: (enabled: boolean) => void;
  /** キャッシュに変換済みテキストを保存（localStorage永続化） */
  cacheSummary: (original: string, rewritten: string) => void;
  /** キャッシュから変換済みテキストを取得 */
  getCachedSummary: (original: string) => string | undefined;
}

const loadBool = (key: string, defaultValue: boolean): boolean => {
  try {
    const saved = localStorage.getItem(key);
    return saved !== null ? saved === 'true' : defaultValue;
  } catch {
    return defaultValue;
  }
};

/** localStorageからキャッシュを読み込み */
function loadCache(): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHE);
    if (!raw) return new Map();
    const entries: CacheEntry[] = JSON.parse(raw);
    return new Map(entries.map((e) => [e.original, e.rewritten]));
  } catch {
    return new Map();
  }
}

/** キャッシュをlocalStorageに保存 */
function persistCache(cache: Map<string, string>): void {
  try {
    const entries: CacheEntry[] = [];
    for (const [original, rewritten] of cache) {
      entries.push({ original, rewritten });
    }
    // 上限を超えたら古い方（先頭）を切り捨て
    const trimmed = entries.slice(-MAX_CACHE_ENTRIES);
    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(trimmed));
  } catch {
    // localStorage容量超過時は無視
  }
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  summaryCharacterMode: loadBool(STORAGE_KEYS.SUMMARY, false),
  deepdiveCharacterMode: loadBool(STORAGE_KEYS.DEEPDIVE, false),
  summaryCache: loadCache(),
  setSummaryCharacterMode: (enabled) => {
    localStorage.setItem(STORAGE_KEYS.SUMMARY, String(enabled));
    set({ summaryCharacterMode: enabled });
  },
  setDeepdiveCharacterMode: (enabled) => {
    localStorage.setItem(STORAGE_KEYS.DEEPDIVE, String(enabled));
    set({ deepdiveCharacterMode: enabled });
  },
  cacheSummary: (original, rewritten) => {
    const cache = new Map(get().summaryCache);
    cache.set(original, rewritten);
    persistCache(cache);
    set({ summaryCache: cache });
  },
  getCachedSummary: (original) => {
    return get().summaryCache.get(original);
  },
}));
