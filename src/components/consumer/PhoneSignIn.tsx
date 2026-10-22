"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Smartphone } from "lucide-react";
import { useT } from "../i18n";
import { request } from "./shared";
import { HumanCheck, humanCheckEnabled } from "./HumanCheck";
export const phoneSignInEnabled = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";
// SMS one-time-code sign-in through Supabase Auth. Needs an SMS provider configured in the Supabase project.
export function PhoneSignIn({ returnTo }: { returnTo: string }) {
  const t = useT(); const router = useRouter();
  const [phone, setPhone] = useState(""); const [code, setCode] = useState(""); const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [token, setToken] = useState(""); const [resetKey, setResetKey] = useState(0); const onToken = useCallback((value: string) => setToken(value), []);
  async function send(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { const response = await request<{ message: string }>("/api/auth/phone-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, turnstileToken: token || undefined }) }); setSent(true); setMessage(t(response.message)); }
    catch (reason) { setError(reason instanceof Error ? t(reason.message) : t("We couldn’t complete this request. Please try again.")); }
    finally { setBusy(false); setResetKey(value => value + 1); }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request("/api/auth/phone-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) }); router.push(returnTo); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? t(reason.message) : t("We couldn’t sign you in. Please try again.")); }
    finally { setBusy(false); }
  }
  return <details className="phone-signin"><summary><Smartphone size={16} aria-hidden="true" /> {t("Sign in with your mobile number")}</summary>
    {!sent ? <form className="consumer-form" onSubmit={send}><div className="field"><label htmlFor="auth-phone">{t("Mobile number")}</label><input className="input" id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={event => setPhone(event.target.value)} required maxLength={20} placeholder="+92 300 1234567" /><small>{t("Include your country code. Standard SMS charges may apply.")}</small></div><HumanCheck onToken={onToken} resetKey={resetKey} />{error && <div className="consumer-error" role="alert">{error}</div>}<button className="button secondary consumer-button-full" disabled={busy || !phone.trim() || (humanCheckEnabled && !token)}>{busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : null}{t("Send code")}</button></form>
    : <form className="consumer-form" onSubmit={verify}>{message && <div className="consumer-success" role="status">{message}</div>}<div className="field"><label htmlFor="auth-code">{t("6-digit code")}</label><input className="input" id="auth-code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required minLength={6} maxLength={6} /></div>{error && <div className="consumer-error" role="alert">{error}</div>}<button className="button primary consumer-button-full" disabled={busy || code.length !== 6}>{busy ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : null}{t("Verify and sign in")}</button><button className="button ghost" type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); setError(""); }}>{t("Use a different number")}</button></form>}
  </details>;
}
