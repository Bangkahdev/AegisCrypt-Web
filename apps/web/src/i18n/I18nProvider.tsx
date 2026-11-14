import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Locale, TranslationKey, translations } from "./translations";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "aegiscrypt-locale";
const I18nContext = createContext<I18nValue | null>(null);

export const detectLocale = (): Locale => {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "id") return stored;
  } catch {
    /* storage can be unavailable */
  }
  const language = navigator.language?.toLowerCase() ?? "en";
  return language.startsWith("id") ? "id" : "en";
};

const translate = (
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string => {
  const template: string = translations[locale][key] ?? translations.en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage failures */
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "id" : "en");
  }, [locale, setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "meta.title");
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = translate(locale, "meta.description");
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale, toggleLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nValue => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
};
