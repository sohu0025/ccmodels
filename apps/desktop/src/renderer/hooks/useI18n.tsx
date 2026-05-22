import { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react';
import { getMessages } from '@ccmodels/shared';
import type { Locale } from '@ccmodels/shared';
import { useSettings } from './useSettings';

type I18nContextType = {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
};

const I18nContext = createContext<I18nContextType>(null!);

function flatten(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      result[key] = v;
    } else if (v && typeof v === 'object') {
      Object.assign(result, flatten(v, key));
    }
  }
  return result;
}

function getFlat(locale: Locale): Record<string, string> {
  return flatten(getMessages(locale) as any);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const locale = (settings?.locale ?? 'zh-CN') as Locale;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const flat = getFlat(locale);
      let text = flat[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [locale],
  );

  const value = useMemo(() => ({ t, locale }), [t, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for HMR edge case or missing provider
    return { t: (key: string, params?: Record<string, string | number>) => {
      if (params) for (const [k, v] of Object.entries(params)) key = key.replace(`{${k}}`, String(v));
      return key;
    }, locale: 'zh-CN' };
  }
  return ctx;
}
