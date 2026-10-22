import { ur } from "./ur";
export type Locale = "en" | "ur";
export const LOCALE_COOKIE = "shelfwatch-locale";
export function parseLocale(value: string | undefined | null): Locale { return value === "ur" ? "ur" : "en"; }
export const directionOf = (locale: Locale) => (locale === "ur" ? "rtl" : "ltr");
// English source text is the key; anything without an Urdu entry falls back to English rather than breaking.
export function translate(locale: Locale, text: string, vars?: Record<string, string | number>) {
  const template = locale === "ur" ? ur[text] ?? text : text;
  return vars ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : template;
}
export type T = (text: string, vars?: Record<string, string | number>) => string;
export const dateLocale = (locale: Locale) => (locale === "ur" ? "ur-PK" : "en-PK");
