import type { Metadata, Viewport } from "next";
import { Noto_Nastaliq_Urdu } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { LocaleProvider } from "@/components/i18n";
import { getLocale } from "@/lib/i18n/server";
import { directionOf } from "@/lib/i18n/translate";
import "./globals.css";
import "./redesign.css";
import "./rtl.css";
const urduFont = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "600"], variable: "--font-urdu", display: "swap", preload: false });
export const metadata: Metadata = { title: { default: "ShelfWatch — A little check. A lot of clarity.", template: "%s | ShelfWatch" }, description: "Scan everyday products, review authenticity signals, and help make your community safer.", icons: { icon: "/icon.svg", apple: "/icons/apple-touch-icon.png" }, appleWebApp: { capable: true, title: "ShelfWatch", statusBarStyle: "default" } };
export const viewport: Viewport = { themeColor: [{media:"(prefers-color-scheme: light)",color:"#f8f9fc"},{media:"(prefers-color-scheme: dark)",color:"#0d1220"}], width: "device-width", initialScale: 1 };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const locale = await getLocale(); return <html lang={locale} dir={directionOf(locale)} className={urduFont.variable} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html: `try{document.documentElement.dataset.theme=localStorage.getItem("shelfwatch-theme")||"light";document.documentElement.dataset.motion=localStorage.getItem("shelfwatch-motion")||"full";}catch{document.documentElement.dataset.theme="light";}`}} /></head><body><LocaleProvider locale={locale}><AppShell>{children}</AppShell></LocaleProvider><PwaRegister /></body></html>; }
