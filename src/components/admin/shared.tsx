"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { ArrowUpRight, Database, Download, Printer, RefreshCw, ShieldCheck } from "lucide-react";

export type Product = { id: string; gtin: string; name: string; brand: string; category: string | null; status: string; referenceImages: string[]; attributes: Record<string, string> };
export type Scan = { id: string; gtin: string; serial: string | null; batch: string | null; verdict: string; riskScore: number; reasons: { code: string; message: string }[]; createdAt: string; city: string | null; lat: number | null; lng: number | null; locationConsent: boolean; product: Product | null; analyses?: { authenticityScore: number; confidence: number; findings: string[]; model: string; createdAt: string }[] };
const RoleContext = createContext(false);
export function AdminProvider({ role, children }: { role: string; children: ReactNode }) { return <RoleContext.Provider value={role === "SUPER_ADMIN"}>{children}</RoleContext.Provider>; }
export function useCanManage() { return useContext(RoleContext); }
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "We could not complete this request. Please try again.");
  return payload as T;
}
export function useAdminResource<T>(url: string, tables = "") {
  const [snapshot, setSnapshot] = useState<{ url: string; value: T } | null>(null); const [settledUrl, setSettledUrl] = useState<string | null>(null); const [failure, setFailure] = useState<{ url: string; message: string } | null>(null);
  const data = snapshot?.url === url ? snapshot.value : null; const loading = settledUrl !== url; const error = failure?.url === url ? failure.message : "";
  const [revision, setRevision] = useState(0); const refresh = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    const abort = new AbortController(); let active = true;
    request<T>(url, { signal: abort.signal }).then(value => { if (active) { setSnapshot({ url, value }); setFailure(null); } }).catch(cause => { if (active && cause.name !== "AbortError") setFailure({ url, message: cause.message }); }).finally(() => { if (active) setSettledUrl(url); });
    return () => { active = false; abort.abort(); };
  }, [url, revision]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30000);
    const onFocus = () => refresh(); window.addEventListener("focus", onFocus);
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let stop = () => {};
    if (projectUrl && key && tables) {
      const client = createBrowserClient(projectUrl, key); const channel = client.channel(`admin-${tables}-${Math.random().toString(36).slice(2)}`);
      for (const table of tables.split(",")) channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
      channel.subscribe(); stop = () => { void client.removeChannel(channel); };
    }
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); stop(); };
  }, [tables, refresh]);
  return { data, loading, error, refresh };
}
export function useSave() {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [failed, setFailed] = useState(false);
  const save = async (task: () => Promise<unknown>, success = "Changes saved.") => { setBusy(true); setMessage(""); setFailed(false); try { await task(); setMessage(success); return true; } catch (cause) { setFailed(true); setMessage(cause instanceof Error ? cause.message : "Please try again."); return false; } finally { setBusy(false); } };
  return { busy, message, failed, save, clear: () => setMessage("") };
}
export function Feedback({ message, failed }: { message: string; failed: boolean }) { return message ? <div className={`notice ad-feedback ${failed ? "ad-error" : ""}`} role={failed ? "alert" : "status"}>{message}</div> : null; }
export function AdminHeading({ eyebrow = "INTELLIGENCE WORKSPACE", title, description, refresh, children }: { eyebrow?: string; title: string; description: string; refresh?: () => void; children?: ReactNode }) {
  return <div className="ad-heading"><div><p className="eyebrow">{eyebrow}</p><h1 className="page-heading">{title}<span className="ad-heading-dot">.</span></h1><p className="muted">{description}</p></div><div className="ad-actions">{children}{refresh && <button className="button secondary" onClick={refresh}><RefreshCw size={16} aria-hidden="true" />Refresh</button>}</div></div>;
}
// CSV download is generated server-side from the same filters; "Save as PDF" uses the print stylesheet.
export function ExportActions({ kind, query = "" }: { kind: "scans" | "alerts" | "reports" | "redemptions"; query?: string }) {
  return <><a className="button secondary" href={`/api/admin/export/${kind}${query ? `?${query}` : ""}`} download><Download size={16} aria-hidden="true" />Export CSV</a><button className="button secondary ad-no-print" type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print / PDF</button></>;
}
export function ResourceState({ loading, error, refresh, empty, children }: { loading: boolean; error: string; refresh: () => void; empty?: boolean; children: ReactNode }) {
  if (loading) return <div className="panel ad-loading" role="status"><span className="ad-loading-line" /><p>Loading workspace data…</p></div>;
  if (error) return <div className="panel empty-state ad-empty"><Database size={32} aria-hidden="true" /><h2>Workspace data is unavailable</h2><p>{error}</p><button className="button secondary" onClick={refresh}>Try again</button></div>;
  if (empty) return <div className="ad-empty empty-state"><ShieldCheck size={32} aria-hidden="true" /><h3>No records yet</h3><p>New activity will appear here as products are registered and people scan them.</p></div>;
  return <>{children}</>;
}
export function Status({ value }: { value: string }) { return <span className="badge ad-status" data-status={value}>{value.replaceAll("_", " ").toLowerCase()}</span>; }
export function date(value: string) { return new Date(value).toLocaleString("en-PK", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" }); }
export function Count({ value }: { value: number | undefined }) { return <>{value === undefined ? "—" : value.toLocaleString("en-PK")}</>; }
export function ScanTable({ scans }: { scans: Scan[] }) {
  if (!scans.length) return <div className="ad-empty"><ShieldCheck size={28} aria-hidden="true" /><h3>No matching scans</h3><p>Try another filter, or check back after the first product scan.</p></div>;
  return <div className="ad-table-scroll"><table className="ad-table"><thead><tr><th>Product</th><th>Verdict</th><th>Risk score</th><th>Location</th><th>Scanned</th><th><span className="ad-sr-only">Details</span></th></tr></thead><tbody>{scans.map(scan => <tr key={scan.id}><td><strong>{scan.product?.name || "Unregistered product"}</strong><span className="ad-subtext">{scan.product?.brand || "Unknown brand"} · {scan.gtin}</span></td><td><Status value={scan.verdict} /></td><td><div className="ad-risk"><span>{scan.riskScore}/100</span><span className="ad-risk-track"><i style={{ width: `${scan.riskScore}%` }} /></span></div></td><td>{scan.city || (scan.locationConsent && scan.lat !== null ? "Coordinates shared" : "Not shared")}</td><td className="ad-nowrap">{date(scan.createdAt)}</td><td><Link className="button ad-icon-button" href={`/admin/scans/${scan.id}`} aria-label={`View ${scan.product?.name || scan.gtin} scan`}><ArrowUpRight size={18} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>;
}
