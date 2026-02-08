/**
 * デザイン設定管理（Zustand）
 * フォントサイズ・背景モードを管理
 */

import { create } from 'zustand';

export type BgMode = 'default' | 'darkblue' | 'black';
export type FontSize = 13 | 14 | 15 | 16 | 18;

const STORAGE_KEYS = {
  FONT_SIZE: 'yt-gemini-fontSize',
  BG_MODE: 'yt-gemini-bgMode',
} as const;

/** 背景モード → 背景色のマッピング */
export const BG_COLORS: Record<BgMode, string> = {
  default: '#ffffff',
  darkblue: '#273340',
  black: '#000000',
};

/** ライトモード判定ヘルパー */
export const isLightMode = (bgMode: BgMode): boolean => bgMode === 'default';

interface DesignState {
  fontSize: FontSize;
  bgMode: BgMode;
  setFontSize: (size: FontSize) => void;
  setBgMode: (mode: BgMode) => void;
}

const loadFontSize = (): FontSize => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
    return saved ? (Number(saved) as FontSize) : 15;
  } catch {
    return 15;
  }
};

const loadBgMode = (): BgMode => {
  try {
    return (localStorage.getItem(STORAGE_KEYS.BG_MODE) as BgMode) || 'default';
  } catch {
    return 'default';
  }
};

export const useDesignStore = create<DesignState>((set) => ({
  fontSize: loadFontSize(),
  bgMode: loadBgMode(),
  setFontSize: (size) => {
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, String(size));
    set({ fontSize: size });
  },
  setBgMode: (mode) => {
    localStorage.setItem(STORAGE_KEYS.BG_MODE, mode);
    set({ bgMode: mode });
  },
}));
