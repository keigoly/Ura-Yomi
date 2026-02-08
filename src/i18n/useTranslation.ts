/**
 * 多言語対応フック
 */

import { translations, type Language } from './translations';

const STORAGE_KEY = 'yt-gemini-language';

/**
 * 現在の言語を取得
 */
export function getLanguage(): Language {
  return (localStorage.getItem(STORAGE_KEY) as Language) || 'ja';
}

/**
 * 翻訳関数 + 言語を返すフック
 */
export function useTranslation() {
  const lang = getLanguage();
  const dict = translations[lang];

  /**
   * キーに対応する翻訳文字列を返す。
   * {key} 形式のプレースホルダを params で置換可能。
   */
  function t(key: string, params?: Record<string, string | number>): string {
    let text = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  }

  return { t, lang };
}
