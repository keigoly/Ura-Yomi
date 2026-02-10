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
  DEEPDIVE_CACHE: 'yt-gemini-deepdive-cache',
  NEGATIVE_REASON_CACHE: 'yt-gemini-negative-reason-cache',
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
  /** 深掘りタブ用キャッシュ（元テキスト → 変換済みテキスト） */
  deepdiveCache: Map<string, string>;
  /** ネガティブコメントAI分析キャッシュ（コメントテキスト → 分析結果） */
  negativeReasonCache: Map<string, string>;
  setSummaryCharacterMode: (enabled: boolean) => void;
  setDeepdiveCharacterMode: (enabled: boolean) => void;
  /** キャッシュに変換済みテキストを保存（localStorage永続化） */
  cacheSummary: (original: string, rewritten: string) => void;
  /** キャッシュから変換済みテキストを取得 */
  getCachedSummary: (original: string) => string | undefined;
  /** 深掘りタブ用キャッシュに変換済みテキストを保存 */
  cacheDeepdive: (original: string, rewritten: string) => void;
  /** 深掘りタブ用キャッシュから変換済みテキストを取得 */
  getCachedDeepdive: (original: string) => string | undefined;
  /** ネガティブコメントAI分析をキャッシュに保存 */
  cacheNegativeReason: (commentText: string, reason: string) => void;
  /** ネガティブコメントAI分析をキャッシュから取得 */
  getCachedNegativeReason: (commentText: string) => string | undefined;
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
function loadCache(storageKey: string): Map<string, string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Map();
    const entries: CacheEntry[] = JSON.parse(raw);
    return new Map(entries.map((e) => [e.original, e.rewritten]));
  } catch {
    return new Map();
  }
}

/** キャッシュをlocalStorageに保存 */
function persistCache(cache: Map<string, string>, storageKey: string): void {
  try {
    const entries: CacheEntry[] = [];
    for (const [original, rewritten] of cache) {
      entries.push({ original, rewritten });
    }
    // 上限を超えたら古い方（先頭）を切り捨て
    const trimmed = entries.slice(-MAX_CACHE_ENTRIES);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  } catch {
    // localStorage容量超過時は無視
  }
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  summaryCharacterMode: loadBool(STORAGE_KEYS.SUMMARY, false),
  deepdiveCharacterMode: loadBool(STORAGE_KEYS.DEEPDIVE, false),
  summaryCache: loadCache(STORAGE_KEYS.CACHE),
  deepdiveCache: loadCache(STORAGE_KEYS.DEEPDIVE_CACHE),
  negativeReasonCache: loadCache(STORAGE_KEYS.NEGATIVE_REASON_CACHE),
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
    persistCache(cache, STORAGE_KEYS.CACHE);
    set({ summaryCache: cache });
  },
  getCachedSummary: (original) => {
    return get().summaryCache.get(original);
  },
  cacheDeepdive: (original, rewritten) => {
    const cache = new Map(get().deepdiveCache);
    cache.set(original, rewritten);
    persistCache(cache, STORAGE_KEYS.DEEPDIVE_CACHE);
    set({ deepdiveCache: cache });
  },
  getCachedDeepdive: (original) => {
    return get().deepdiveCache.get(original);
  },
  cacheNegativeReason: (commentText, reason) => {
    const cache = new Map(get().negativeReasonCache);
    cache.set(commentText, reason);
    persistCache(cache, STORAGE_KEYS.NEGATIVE_REASON_CACHE);
    set({ negativeReasonCache: cache });
  },
  getCachedNegativeReason: (commentText) => {
    return get().negativeReasonCache.get(commentText);
  },
}));
