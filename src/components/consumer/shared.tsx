"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, RefreshCw, ServerCog, ShieldQuestion } from "lucide-react";
import "./consumer.css";
import { useT } from "../i18n";

export type Product = { id?: string; name?: string; brand?: string | { name?: string }; category?: string; manufacturer?: string };
export type PackagingAnalysis = { id?: string; summary?: string; observations?: string[]; findings?: string[]; confidence?: number; authenticityScore?: number; status?: string; createdAt?: string; imageUrls?: string[] };
export type Scan = { id: string; userId?: string | null; gtin?: string; barcode?: string; serial?: string | null; batch?: string | null; verdict?: string; status?: string; confidence?: number | null; reasons?: (string | { message?: string; description?: string; code?: string })[]; createdAt: string; product?: Product | null; analysis?: PackagingAnalysis | null; analyses?: PackagingAnalysis[]; locationConsent?: boolean };
export type Remote<T> = { data: T | null; error: string; code: string; loading: boolean; reload: () => void };

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "Something went wrong. Please try again."), { code: body.code || String(response.status) });
  return body as T;
}
export function useRemote<T>(url: string): Remote<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => { setLoading(true); setVersion(v => v + 1); }, []);
  useEffect(() => {
    const abort = new AbortController();
    request<T>(url, { signal: abort.signal }).then(value => { if (!abort.signal.aborted) { setData(value); setError(""); setCode(""); } }).catch((reason) => {
      if (reason.name !== "AbortError") { setError(reason.message); setCode(reason.code || ""); }
    }).finally(() => { if (!abort.signal.aborted) { setLoading(false); setResolvedUrl(url); } });
    return () => abort.abort();
  }, [url, version]);
  const current = resolvedUrl === url;
  return { data: current ? data : null, error: current ? error : "", code: current ? code : "", loading: loading || !current, reload };
}
export function ServiceState({ loading, error, code, reload, data }: Pick<Remote<unknown>, "loading" | "error" | "code" | "reload"> & { data?: unknown }) {
  const t = useT();
  if (loading && !data) return <div className="consumer-state" role="status"><LoaderCircle className="spin" size={24} aria-hidden="true" /><p>{t("Connecting to ShelfWatch…")}</p></div>;
  if (!error) return null;
  const setup = code === "SETUP_REQUIRED";
  const auth = code === "UNAUTHORIZED" || code === "401" || code === "AUTH_REQUIRED" || code === "SIGN_IN_REQUIRED";
  return <div className="consumer-state panel" role="status">{setup ? <ServerCog size={32} aria-hidden="true" /> : <ShieldQuestion size={32} aria-hidden="true" />}<h2>{setup ? t("Live service is being connected") : auth ? t("Your account keeps it personal") : t("We couldn’t load this yet")}</h2><p>{setup ? t("The database connection still needs to be completed. Your scans and rewards will appear here once it is ready.") : auth ? t("Sign in to view your personal scan history and rewards.") : error}</p>{auth ? <Link className="button primary" href="/login">{t("Sign in")} <ArrowRight size={16} aria-hidden="true" /></Link> : <button className="button secondary" onClick={reload}><RefreshCw size={16} aria-hidden="true" /> {t("Try again")}</button>}</div>;
}
export function VerdictBadge({ verdict }: { verdict?: string }) {
  const t = useT();
  const label = verdict || "UNKNOWN";
  return <span className={`verdict-badge verdict-${label.toLowerCase()}`}>{t(label)}</span>;
}
export function productName(scan: Scan) { return scan.product?.name || "Unregistered product"; }
export function brandName(product?: Product | null) { return typeof product?.brand === "object" ? product.brand?.name : product?.brand; }
export function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
export function Heading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-heading consumer-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p className="muted">{description}</p></div>{action}</header>;
}





