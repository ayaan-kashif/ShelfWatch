"use client";
import { useEffect, useRef } from "react";
import { useLocale } from "../i18n";
type Turnstile = { render: (el: HTMLElement, options: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
let loader: Promise<void> | null = null;
function loadScript() {
  loader ??= new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.onload = () => resolve(); script.onerror = () => { loader = null; reject(new Error("Turnstile failed to load")); }; document.head.appendChild(script); });
  return loader;
}
export const humanCheckEnabled = !!SITE_KEY;
// Renders Cloudflare Turnstile only when a site key is configured; tokens are single-use, so bump `resetKey` after each attempt.
export function HumanCheck({ onToken, resetKey = 0 }: { onToken: (token: string) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null); const widget = useRef<string | null>(null); const locale = useLocale();
  useEffect(() => {
    if (!SITE_KEY) return; let cancelled = false;
    loadScript().then(() => { if (cancelled || !box.current || !window.turnstile) return; widget.current = window.turnstile.render(box.current, { sitekey: SITE_KEY, theme: "auto", language: locale === "ur" ? "ur" : "en", callback: (token: string) => onToken(token), "expired-callback": () => onToken(""), "error-callback": () => onToken("") }); }).catch(() => onToken(""));
    return () => { cancelled = true; if (widget.current) window.turnstile?.remove(widget.current); widget.current = null; };
  }, [locale, onToken]);
  useEffect(() => { if (resetKey && widget.current) { window.turnstile?.reset(widget.current); onToken(""); } }, [resetKey, onToken]);
  return SITE_KEY ? <div ref={box} className="human-check" /> : null;
}
