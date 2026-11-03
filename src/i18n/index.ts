import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { zh } from './zh';
import { en } from './en';

export const LANGS = ['zh', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_STORAGE_KEY = 'portfolio.lang';

export const HTML_LANG: Record<Lang, string> = {
  zh: 'zh-CN',
  en: 'en',
};

const isLang = (value: unknown): value is Lang => value === 'zh' || value === 'en';

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* 隐私模式下 localStorage 不可用，退回浏览器语言 */
  }
  const nav = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

export const syncDocumentLang = (lang: Lang) => {
  document.documentElement.lang = HTML_LANG[lang];
  document.body.dataset.lang = lang;
};

const initial = detectLang();

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'zh',
  supportedLngs: [...LANGS],
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on('languageChanged', (lng) => {
  if (isLang(lng)) {
    syncDocumentLang(lng);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lng);
    } catch {
      /* 忽略写入失败 */
    }
  }
});

syncDocumentLang(initial);

export default i18n;
