"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft, ArrowRight, CircleHelp, Eye, EyeOff, LoaderCircle, LockKeyhole, LogOut, MapPin, ShieldCheck, ShieldQuestion, Sparkles, UserRound } from "lucide-react";

import { ScanScene } from "../scan-scene";

import { Heading, ServiceState, request, useRemote } from "./shared";
import { useT } from "../i18n";
import { HumanCheck, humanCheckEnabled } from "./HumanCheck";
import { PhoneSignIn, phoneSignInEnabled } from "./PhoneSignIn";



type Account = { id: string; name?: string | null; email?: string; role?: string };

export function LoginExperience({ returnTo = "/dashboard", initialMode="login" }: { returnTo?: string; initialMode?: "login" | "signup" }) {
  const t = useT();

  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [visible, setVisible] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [humanToken, setHumanToken] = useState("");

  const [humanReset, setHumanReset] = useState(0);

  const onHumanToken = useCallback((value: string) => setHumanToken(value), []);

  async function submit(event: React.FormEvent) {

    event.preventDefault(); setBusy(true); setError(""); setMessage("");

    try {

      const response = await request<{ user?: Account; needsConfirmation?: boolean; requiresConfirmation?: boolean; confirmationRequired?: boolean; message?: string; session?: unknown }>(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), password, turnstileToken: humanToken || undefined, ...(mode === "signup" ? { name: name.trim() } : {}) }) });

      if (mode === "signup" && (response.needsConfirmation || response.requiresConfirmation || response.confirmationRequired)) { setMessage(response.message || t("Check your email to confirm your account, then come back to sign in.")); setPassword(""); }

      else { router.push(returnTo); router.refresh(); }

    } catch (reason) { setError(reason instanceof Error ? t(reason.message) : t("We couldn’t sign you in. Please try again.")); }

    finally { setBusy(false); setHumanReset(value => value + 1); }

  }

  function changeMode(next: "login" | "signup") { setMode(next); setError(""); setMessage(""); setPassword(""); }

  return <div className="auth-layout"><aside className="auth-story"><p className="landing-eyebrow">{t("KNOW MORE. CHOOSE BETTER.")}</p><h2>{t("A little check.")}<br/>{t("A world of clarity.")}</h2><p>{t("Your everyday product checks, saved in one place.")}<br/>{t("Build confidence with evidence that adds up.")}</p><ScanScene compact/><div className="auth-proof"><LockKeyhole size={14}/>{t("Private history. Optional location. You’re in control.")}</div></aside><div className="auth-form-side"><Link href="/" className="auth-back"><ArrowLeft size={16}/>{t("Back to ShelfWatch")}</Link><div className="consumer-auth"><div className="consumer-auth-banner"><ShieldCheck size={44} strokeWidth={1.4} aria-hidden="true" /><div><h1>{t("A safer shelf starts with you.")}</h1><p>{t("Keep your scans together and make your contributions count.")}</p></div></div><section className="panel consumer-card"><div className="consumer-auth-tabs" role="tablist" aria-label={t("Account access")} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "login" : event.key === "End" ? "signup" : mode === "login" ? "signup" : "login"; changeMode(next); event.currentTarget.querySelector<HTMLButtonElement>(`#${next}-tab`)?.focus(); } }}><button role="tab" id="login-tab" tabIndex={mode === "login" ? 0 : -1} aria-controls="auth-panel" aria-selected={mode === "login"} onClick={() => changeMode("login")}>{t("Sign in")}</button><button role="tab" id="signup-tab" tabIndex={mode === "signup" ? 0 : -1} aria-controls="auth-panel" aria-selected={mode === "signup"} onClick={() => changeMode("signup")}>{t("Create account")}</button></div><div id="auth-panel" role="tabpanel" aria-labelledby={mode === "login" ? "login-tab" : "signup-tab"}><h1>{mode === "login" ? t("Welcome back.") : t("Create your account.")}</h1><p className="consumer-muted">{mode === "login" ? t("Sign in to your ShelfWatch account.") : t("Create an account to save your checks and earn eligible points.")}</p><form className="consumer-form" onSubmit={submit}>{mode === "signup" && <div className="field"><label htmlFor="auth-name">{t("Your name")}</label><input className="input" id="auth-name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={100} placeholder={t("How should we call you?")} /></div>}<div className="field"><label htmlFor="auth-email">{t("Email address")}</label><input className="input" id="auth-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} placeholder="you@example.com" /></div><div className="field"><label htmlFor="auth-password">{t("Password")}</label><div style={{ display: "flex", gap: 8 }}><input className="input" id="auth-password" type={visible ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} maxLength={128} placeholder={mode === "signup" ? t("At least 8 characters") : t("Your password")} /><button className="button ghost" type="button" aria-label={visible ? t("Hide password") : t("Show password")} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div>{mode === "login" && <Link href="/login?mode=forgot" className="auth-forgot">{t("Forgot password?")}</Link>}{mode === "signup" && <small>{t("Use at least 8 characters. Longer, unique passwords keep your account safer.")}</small>}</div><HumanCheck onToken={onHumanToken} resetKey={humanReset} />{error && <div className="consumer-error" role="alert">{error}</div>}{message && <div className="consumer-success" role="status">{message}</div>}<button className="button primary consumer-button-full" disabled={busy || (humanCheckEnabled && !humanToken)}>{busy ? <><LoaderCircle className="spin" size={17} aria-hidden="true" /> {mode === "signup" ? t("Creating your account…") : t("Signing in…")}</> : <>{mode === "signup" ? t("Create account") : t("Sign in")}<ArrowRight size={17} aria-hidden="true" /></>}</button></form>{mode === "login" && phoneSignInEnabled && <PhoneSignIn returnTo={returnTo} />}</div><p className="consumer-auth-footer"><LockKeyhole size={12} style={{ verticalAlign: "middle", marginRight: 5 }} aria-hidden="true" /> {t("Your scan history belongs to you.")} <Link className="consumer-text-link" href="/how-it-works">{t("Learn how we handle your data.")}</Link></p></section><p className="consumer-auth-footer">{t("Just checking a product?")} <Link className="consumer-text-link" href="/scan">{t("Continue as a guest")}</Link></p></div></div></div>;

}



export function SettingsExperience() {
  const t = useT();

  const router = useRouter();

  const remote = useRemote<{ user: Account | null }>("/api/auth/me");

  const [reduced, setReduced] = useState(false);

  const [accountMessage, setAccountMessage] = useState("");

  const [savingName, setSavingName] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {

    const sync = () => { let saved = false; try { saved = localStorage.getItem("shelfwatch-motion") === "reduced"; } catch { /* Ignore unavailable browser storage. */ } setReduced(document.documentElement.dataset.motion === "reduced" || saved); };

    sync(); window.addEventListener("shelfwatch-motion-change", sync); return () => window.removeEventListener("shelfwatch-motion-change", sync);

  }, []);

  function setMotion(value: boolean) {

    setReduced(value); document.documentElement.dataset.motion = value ? "reduced" : "full";

    try { localStorage.setItem("shelfwatch-motion", value ? "reduced" : "full"); } catch { /* Browser storage can be disabled; apply preference for this page. */ }

    window.dispatchEvent(new Event("shelfwatch-motion-change"));

  }

  async function updateName(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault(); setSavingName(true); setError(""); setAccountMessage("");

    const name = String(new FormData(event.currentTarget).get("name") || "").trim();

    try { await request("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); setAccountMessage("Your name has been updated."); remote.reload(); router.refresh(); }

    catch (reason) { setError(reason instanceof Error ? reason.message : t("Your profile couldn’t be updated.")); }

    finally { setSavingName(false); }

  }

  async function requestDeletion() {

    setDeleting(true); setError(""); setAccountMessage("");

    try { const response = await request<{ message: string }>("/api/account/deletion-request", { method: "POST" }); setAccountMessage(response.message); }

    catch (reason) { setError(reason instanceof Error ? reason.message : t("Your request couldn’t be saved.")); }

    finally { setDeleting(false); }

  }

  async function logout() {

    setBusy(true); setError("");

    try { await request("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }

    catch (reason) { setError(reason instanceof Error ? reason.message : t("Sign out couldn’t be completed. Please try again.")); }

    finally { setBusy(false); }

  }

  return <><Heading eyebrow={t("YOUR SPACE, YOUR CHOICE")} title={t("Make ShelfWatch yours.")} description={t("Your account, your privacy, and a little control over how things move.")} /><div className="consumer-grid"><section className="panel consumer-card"><p className="consumer-kicker"><UserRound size={15} aria-hidden="true" /> {t("Your account")}</p><ServiceState {...remote} />{remote.data && !remote.error && (remote.data.user ? <><div className="consumer-profile"><div className="consumer-avatar" aria-hidden="true">{(remote.data.user.name || t("Member")).charAt(0).toUpperCase()}</div><div><h2>{remote.data.user.name || t("ShelfWatch member")}</h2>{remote.data.user.email && <p>{remote.data.user.email}</p>}<span className="badge">{(remote.data.user.role || t("Member")).replaceAll("_", " ")}</span></div></div><p className="consumer-muted">{t("Your personal scan history and earned points are linked to this account.")}</p><form className="consumer-form" onSubmit={updateName}><div className="field"><label htmlFor="profile-name">{t("Display name")}</label><input className="input" name="name" id="profile-name" autoComplete="name" defaultValue={remote.data.user.name || ""} minLength={1} maxLength={100} required /></div><button className="button secondary" disabled={savingName}>{savingName ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />} {savingName ? t("Saving…") : t("Save name")}</button></form><hr className="consumer-divider" /><div className="consumer-actions"><Link className="button secondary" href="/history">{t("View my scans")} <ArrowRight size={16} aria-hidden="true" /></Link>{["ADMIN", "SUPER_ADMIN"].includes(remote.data.user.role?.toUpperCase() || "") && <Link className="button secondary" href="/admin">{t("Open admin portal")} <ArrowRight size={16} aria-hidden="true" /></Link>}<button className="button ghost" disabled={busy} onClick={logout}>{busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <LogOut size={16} aria-hidden="true" />} {busy ? t("Signing out…") : t("Sign out")}</button></div>{error && <p className="consumer-error" role="alert">{error}</p>}{accountMessage && <p className="consumer-success" role="status">{accountMessage}</p>}<hr className="consumer-divider" /><details><summary className="consumer-label" style={{ cursor: "pointer", lineHeight: 1.8 }}>{t("Request account deletion")}</summary><p className="consumer-muted" style={{ fontSize: 13 }}>{t("This records a deletion request. At the next scheduled data cleanup your sign-in, profile name, packaging photos and scan locations are removed. Your account stays active until then.")}</p><button className="button secondary" disabled={deleting} onClick={requestDeletion}>{deleting ? t("Recording request…") : t("Send deletion request")}</button></details></> : <div className="consumer-empty"><ShieldQuestion size={34} aria-hidden="true" /><h2>{t("You’re browsing as a guest")}</h2><p>{t("Create an account for a personal scan journal and eligible contribution points.")}</p><Link className="button primary" href="/login">{t("Sign in or create account")} <ArrowRight size={16} aria-hidden="true" /></Link></div>)}</section>

  <div className="consumer-stack"><section className="panel consumer-card"><p className="consumer-kicker"><Sparkles size={15} aria-hidden="true" /> {t("Your experience")}</p><h2>{t("A little less motion")}</h2><p className="consumer-muted">{t("Pause decorative movement while keeping useful interaction feedback. Your device’s reduced motion setting is always respected.")}</p><label className="consumer-checkbox"><input type="checkbox" checked={reduced} onChange={event => setMotion(event.target.checked)} /><span>{t("Reduce decorative animation")}<small style={{ display: "block", color: "#a0b0a8", fontSize: 12 }}>{t("Saved only in this browser.")}</small></span></label></section>

  <section className="panel consumer-card"><p className="consumer-kicker"><LockKeyhole size={15} aria-hidden="true" /> {t("Privacy, by choice")}</p><h2>{t("You’re in control")}</h2><div className="consumer-settings-row"><div><strong>{t("Location is optional")}</strong><p>{t("We ask before every scan. Declining permission never prevents a code check.")}</p></div><MapPin size={19} aria-hidden="true" /></div><hr className="consumer-divider" /><div className="consumer-settings-row"><div><strong>{t("Photos are private")}</strong><p>{t("Packaging photos are sent for review only when you choose to upload them.")}</p></div><LockKeyhole size={19} aria-hidden="true" /></div><Link className="button ghost" href="/how-it-works"><CircleHelp size={16} aria-hidden="true" /> {t("How ShelfWatch works")} <ArrowRight size={16} aria-hidden="true" /></Link></section></div></div></>;

}








export function RecoveryExperience({reset=false}:{reset?:boolean}){const t=useT();
 const router=useRouter();const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[confirm,setConfirm]=useState("");const[visible,setVisible]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[message,setMessage]=useState("");const[humanToken,setHumanToken]=useState("");const[humanReset,setHumanReset]=useState(0);const onHumanToken=useCallback((value:string)=>setHumanToken(value),[]);
 async function submit(event:React.FormEvent){event.preventDefault();setError("");setMessage("");if(reset&&password!==confirm){setError(t("Your passwords do not match."));return;}setBusy(true);try{const data=await request<{message:string}>(`/api/auth/${reset?"update-password":"reset-password"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(reset?{password}:{email:email.trim(),turnstileToken:humanToken||undefined})});if(reset){router.push("/dashboard");router.refresh();}else setMessage(t(data.message));}catch(reason){setError(reason instanceof Error?t(reason.message):t("We couldn’t complete this request. Please try again."));}finally{setBusy(false);setHumanReset(value=>value+1);}}
 return <div className="auth-layout"><aside className="auth-story"><p className="landing-eyebrow">{t("YOUR ACCOUNT. YOUR CONFIDENCE.")}</p><h2>{t("Let’s get you")}<br/>{t("back to clarity.")}</h2><p>{t("Keep your checks and contributions together.")}<br/>{t("We’ll help you get back into your account.")}</p><ScanScene compact/><div className="auth-proof"><LockKeyhole size={14}/>{t("Your password is never shared with brand administrators.")}</div></aside><div className="auth-form-side"><Link className="auth-back" href="/login"><ArrowLeft size={16}/>{t("Back to sign in")}</Link><p className="landing-eyebrow">{t("ACCOUNT RECOVERY")}</p><h1 className="auth-recovery-title">{reset?t("Choose a new password."):t("Forgot your password?")}</h1><p className="consumer-muted">{reset?t("Use a new, unique password for your ShelfWatch account."):t("Enter your account email and we’ll send you a link to reset it.")}</p><form className="consumer-form" onSubmit={submit}>{!reset?<div className="field"><label htmlFor="recovery-email">{t("Email address")}</label><input id="recovery-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event=>setEmail(event.target.value)} maxLength={254} required/></div>:<><div className="field"><label htmlFor="recovery-password">{t("New password")}</label><div className="auth-password-row"><input id="recovery-password" type={visible?"text":"password"} autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} required/><button type="button" className="button ghost" aria-label={visible?t("Hide password"):t("Show password")} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div><div className="field"><label htmlFor="recovery-confirm">{t("Confirm password")}</label><input id="recovery-confirm" type={visible?"text":"password"} autoComplete="new-password" minLength={8} maxLength={128} value={confirm} onChange={event=>setConfirm(event.target.value)} required/></div></>}{!reset&&<HumanCheck onToken={onHumanToken} resetKey={humanReset}/>}{error&&<div className="consumer-error" role="alert">{error}</div>}{message&&<div className="consumer-success" role="status">{message}</div>}<button className="button consumer-button-full" disabled={busy||(!reset&&humanCheckEnabled&&!humanToken)}>{busy?<LoaderCircle className="spin" size={17}/>:<ArrowRight size={17}/>} {busy?t("Please wait…"):reset?t("Update password"):t("Send reset link")}</button></form><p className="consumer-auth-footer"><LockKeyhole size={12}/> {reset?t("A valid recovery session is required to update your password."):t("Open the email link in the browser where you requested it.")}</p></div></div>;
}
