"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { translateText, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  if (!locale) throw new Error("useI18n must be used inside LocaleProvider.");
  const t = useCallback((text: string) => translateText(locale, text), [locale]);
  return { locale, t };
}
