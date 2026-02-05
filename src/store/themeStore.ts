/**
 * テーマ管理（Zustand）
 */

import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * localStorageからテーマを読み込む
 */
const loadTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('youtube-comment-analyzer-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  } catch {
    return 'light';
  }
};

/**
 * localStorageにテーマを保存
 */
const saveTheme = (theme: Theme) => {
  try {
    localStorage.setItem('youtube-comment-analyzer-theme', theme);
  } catch {
    // localStorageが使えない場合は無視
  }
};

/**
 * テーマストア
 */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: loadTheme(),
  setTheme: (theme) => {
    saveTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      saveTheme(newTheme);
      return { theme: newTheme };
    }),
}));
