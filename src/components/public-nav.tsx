"use client";
import Link from "next/link";
import { ScanLine, ArrowUpRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { LanguageToggle, useT } from "./i18n";
export function PublicNav(){const t=useT();return <header className="public-header"><nav className="public-nav" aria-label={t("Main navigation")}><Link href="/" className="public-brand"><span><ScanLine size={23}/></span>ShelfWatch<span className="brand-period">.</span></Link><div className="public-links"><Link href="/#how-it-works">{t("How it works")}</Link><Link href="/#for-brands">{t("For brands")}</Link><Link href="/#questions">{t("FAQs")}</Link></div><div className="public-actions"><LanguageToggle/><ThemeToggle/><Link className="public-signin" href="/login">{t("Sign in")}</Link><Link className="button public-getstarted" href="/login?mode=signup">{t("Get started")} <ArrowUpRight size={16}/></Link></div></nav></header>;}
