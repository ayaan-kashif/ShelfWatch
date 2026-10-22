"use client";
import { createContext, useCallback, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALE_COOKIE, translate, type Locale, type T } from "@/lib/i18n/translate";
const LocaleContext = createContext<Locale>("en");
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) { return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>; }
export function useLocale() { return useContext(LocaleContext); }
export function useT(): T { const locale = useLocale(); return useCallback((text, vars) => translate(locale, text, vars), [locale]); }
export function LanguageToggle() {
  const locale = useLocale(); const router = useRouter(); const [pending, start] = useTransition(); const next: Locale = locale === "ur" ? "en" : "ur";
  function toggle() { document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`; start(() => router.refresh()); }
  return <button className="theme-toggle language-toggle" onClick={toggle} disabled={pending} lang={next} aria-label={next === "ur" ? "اردو میں دیکھیں" : "View in English"} title={next === "ur" ? "اردو" : "English"}><Languages size={17} aria-hidden="true" /><span>{next === "ur" ? "اردو" : "EN"}</span></button>;
}
