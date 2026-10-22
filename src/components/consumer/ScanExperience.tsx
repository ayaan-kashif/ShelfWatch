"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Barcode, Camera, CameraOff, Check, CircleHelp, ImagePlus, Info, LoaderCircle, MapPin, ScanLine, ShieldCheck, ShieldQuestion, Upload, Flag, LockKeyhole } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { useT } from "../i18n";
import { Heading, PackagingAnalysis, Scan, VerdictBadge, brandName, dateLabel, productName, request, useRemote, ServiceState } from "./shared";

export function ScanExperience() {
  const t = useT();
  const [gtin, setGtin] = useState("");
  const [serial, setSerial] = useState("");
  const [batch, setBatch] = useState("");
  const [consent, setConsent] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [camera, setCamera] = useState<"idle" | "starting" | "active">("idle");
  const [cameraError, setCameraError] = useState("");
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ scan: Scan; pointsEarned: number } | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const generation = useRef(0);
  const submittedRequest = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => () => { generation.current++; controls.current?.stop(); }, []);

  function stopCamera() { generation.current++; controls.current?.stop(); controls.current = null; setCamera("idle"); }
  async function startCamera() {
    setCameraError(""); setDetected(false);
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError(t("Camera access needs HTTPS or localhost and a supported browser. You can enter the barcode below.")); return; }
    setCamera("starting");
    const current = ++generation.current;
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (!video.current || generation.current !== current) return;
      const reader = new BrowserMultiFormatReader();
      const activeControls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } }, audio: false }, video.current, (decoded, _, decoderControls) => {
        if (decoded && generation.current === current) {
          setGtin(decoded.getText()); setDetected(true); decoderControls.stop(); generation.current++; controls.current = null; setCamera("idle");
        }
      });
      if (generation.current !== current) { activeControls.stop(); return; }
      controls.current = activeControls; setCamera("active");
    } catch (reason) {
      if (generation.current !== current) return;
      const name = reason instanceof Error ? reason.name : "";
      setCameraError(name === "NotAllowedError" || name === "PermissionDeniedError" ? t("Camera permission was declined. Enable it in your browser, or enter the barcode below.") : name === "NotFoundError" ? t("No camera was found. You can enter the barcode below.") : t("The camera couldn’t start. Close other apps using it, then try again or enter the barcode below."));
      setCamera("idle");
    }
  }
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setLocationNote(""); stopCamera();
    let location: { lat: number; lng: number; accuracyM: number } | undefined;
    if (consent) {
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }));
          location = { lat: position.coords.latitude, lng: position.coords.longitude, accuracyM: position.coords.accuracy };
          setLocationNote(t("Location included with your permission."));
        } catch { setLocationNote(t("Location wasn’t available. Verification will continue without it.")); }
      } else setLocationNote(t("This browser doesn’t support location. Verification will continue without it."));
    }
    try {
      const signature = JSON.stringify([gtin.trim(), serial.trim(), batch.trim(), consent]);
      if (submittedRequest.current?.signature !== signature) submittedRequest.current = { signature, key: crypto.randomUUID() };
      const response = await request<{ scan: Scan; pointsEarned: number }>("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gtin: gtin.trim(), serial: serial.trim() || undefined, batch: batch.trim() || undefined, locationConsent: consent, location, idempotencyKey: submittedRequest.current!.key }) });
      stopCamera(); setResult(response);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("We couldn’t verify this code. Please try again.")); }
    finally { setBusy(false); }
  }
  return <>
    <Heading eyebrow={t("YOUR FIRST LINE OF CONFIDENCE")} title={t("Look closer. Shop smarter.")} description={t("Scan the code on your product to check its registry, unique serial, and available safety signals.")} />
    {result ? <div className="consumer-detail"><div className="consumer-detail-back"><button className="button secondary" onClick={() => { setResult(null); setGtin(""); setSerial(""); setBatch(""); setDetected(false); setLocationNote(""); setConsent(false); submittedRequest.current = null; }}><ScanLine size={17} aria-hidden="true" /> {t("Scan another product")}</button></div><ScanResult scan={result.scan} pointsEarned={result.pointsEarned} onUpdate={scan => setResult(value => value ? { ...value, scan } : null)} /></div> : <div className="consumer-grid">
      <section className="panel consumer-card" aria-labelledby="camera-title"><div className="consumer-inline-heading"><h2 id="camera-title">{t("Find the product code")}</h2><span className="consumer-privacy-pill"><LockKeyhole size={12} aria-hidden="true" /> {t("On-device reading")}</span></div>
        <div className="consumer-scan-stage" data-active={camera !== "idle"}><video ref={video} muted playsInline aria-label={t("Live barcode camera preview")} />{camera === "idle" && <div className="consumer-scan-idle"><Barcode size={68} strokeWidth={1.1} aria-hidden="true" /></div>}<div className="consumer-viewfinder" aria-hidden="true"><i/><i/><i/><i/><span className="consumer-scan-line" /></div><div className="consumer-scan-status">{camera === "starting" ? <><LoaderCircle className="spin" size={14} aria-hidden="true" /> {t("Starting your camera…")}</> : camera === "active" ? <><ScanLine size={14} aria-hidden="true" /> {t("Keep the code inside the frame")}</> : <><Camera size={14} aria-hidden="true" /> {t("Your camera is off")}</>}</div></div>
        <div className="consumer-scan-controls">{camera === "idle" ? <button className="button primary" disabled={busy} onClick={startCamera}><Camera size={17} aria-hidden="true" /> {t("Open camera")}</button> : <button className="button secondary" onClick={stopCamera}><CameraOff size={17} aria-hidden="true" /> {t("Stop camera")}</button>}<a className="button secondary" href="#barcode-input"><Barcode size={17} aria-hidden="true" /> {t("Enter manually")}</a></div>
        {cameraError && <p className="consumer-error" role="alert">{cameraError}</p>}{detected && <p className="consumer-detection" role="status"><Check size={14} aria-hidden="true" /> {t("Code detected. Review it, then verify below.")}</p>}
        <div className="consumer-tip"><Info size={16} aria-hidden="true" /><span>{t("Use the barcode or QR code on the packaging. Good lighting and a steady camera help us read it clearly.")}</span></div>
      </section>
      <section className="panel consumer-card" aria-labelledby="verify-title"><p className="consumer-kicker"><ShieldCheck size={15} aria-hidden="true" /> {t("A little check. More peace of mind.")}</p><h2 id="verify-title">{t("Ready to verify")}</h2><p className="consumer-muted">{t("A code is the beginning of the check. Add a unique serial if your product has one.")}</p><form className="consumer-form" onSubmit={verify}>
        <div className="field"><label htmlFor="barcode-input">{t("Barcode or product code")}</label><input className="input" id="barcode-input" disabled={busy} autoComplete="off" placeholder={t("Enter the code on your packaging")} value={gtin} onChange={event => setGtin(event.target.value)} required minLength={4} maxLength={128} /><small>{t("EAN, UPC, Code 128, or a supported product QR code.")}</small></div>
        <div className="consumer-form-row"><div className="field"><label htmlFor="scan-serial">{t("Serial")} <span className="consumer-muted">{t("(optional)")}</span></label><input className="input" id="scan-serial" disabled={busy} value={serial} onChange={event => setSerial(event.target.value)} autoComplete="off" maxLength={128} placeholder={t("Unique item code")} /></div><div className="field"><label htmlFor="scan-batch">{t("Batch")} <span className="consumer-muted">{t("(optional)")}</span></label><input className="input" id="scan-batch" disabled={busy} value={batch} onChange={event => setBatch(event.target.value)} autoComplete="off" maxLength={128} placeholder={t("Lot or batch number")} /></div></div>
        <label className="consumer-checkbox"><input type="checkbox" disabled={busy} checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{t("Include my location")}<small style={{ display: "block" }}>{t("Your location is shared with brands and administrators for counterfeit monitoring. You can verify without sharing it.")}</small></span></label>
        {locationNote && <p className="consumer-analysis-note" role="status"><MapPin size={13} aria-hidden="true" /> {locationNote}</p>}{error && <div className="consumer-error" role="alert">{error}</div>}
        <button className="button primary consumer-button-full" type="submit" disabled={busy || !gtin.trim()}>{busy ? <><LoaderCircle className="spin" size={18} aria-hidden="true" /> {t("Checking your product…")}</> : <><ShieldCheck size={18} aria-hidden="true" /> {t("Verify product")} <ArrowRight size={16} aria-hidden="true" /></>}</button>
      </form><div className="consumer-eyebrow-line"><ShieldQuestion size={14} aria-hidden="true" /> {t("A registered barcode alone cannot prove authenticity.")}</div></section>
    </div>}
  </>;
}

export function ScanDetail({ id }: { id: string }) {
  const t = useT();
  const remote = useRemote<{ scan: Scan }>(`/api/scan/${encodeURIComponent(id)}`);
  const [updated, setUpdated] = useState<Scan | null>(null);
  return <><Heading eyebrow={t("PRODUCT VERIFICATION")} title={t("The details behind the code.")} description={t("See what we checked, what we found, and the next steps you can take.")} /><div className="consumer-detail"><Link className="button ghost consumer-detail-back" href="/history"><ArrowLeft size={16} aria-hidden="true" /> {t("Back to history")}</Link><ServiceState {...remote} />{remote.data && !remote.error && <ScanResult scan={updated || remote.data.scan} onUpdate={setUpdated} />}</div></>;
}

export function ScanResult({ scan, pointsEarned = 0, onUpdate }: { scan: Scan; pointsEarned?: number; onUpdate: (value: Scan) => void }) {
  const t = useT();
  const verdict = scan.verdict || scan.status || "UNKNOWN";
  const analysis = scan.analysis || scan.analyses?.[0];
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoAuthError, setPhotoAuthError] = useState(false);
  const [analysisNote, setAnalysisNote] = useState("");
  const [reason, setReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState("");
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  async function analyze(event: React.FormEvent) {
    event.preventDefault(); setPhotoError(""); setPhotoAuthError(false); setAnalysisNote(""); setAnalyzing(true);
    const form = new FormData(); photos.forEach(file => form.append("photos", file));
    try { const response = await request<{ scan: Scan; analysis?: PackagingAnalysis; pointsEarned?: number }>(`/api/scan/${encodeURIComponent(scan.id)}/analyze`, { method: "POST", body: form }); onUpdate(response.scan); setAnalysisNote(response.analysis?.summary || t("Packaging review completed. The verification details have been updated.")); }
    catch (error) { if (error instanceof Error && "code" in error && error.code === "SIGN_IN_REQUIRED") { setPhotoAuthError(true); } else { setPhotoError(error instanceof Error ? error.message : t("Packaging review could not be completed. Please try again.")); } }
    finally { setAnalyzing(false); }
  }
  async function report(event: React.FormEvent) {
    event.preventDefault(); setReporting(true); setReportError("");
    try { await request(`/api/scan/${encodeURIComponent(scan.id)}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason.trim() }) }); setReported(true); }
    catch (error) { setReportError(error instanceof Error ? error.message : t("Your report couldn’t be saved. Please try again.")); }
    finally { setReporting(false); }
  }
  const descriptions: Record<string, string> = { GENUINE: "This item’s unique code matches the registry and the checks available to us.", SUSPICIOUS: "Some signals need a closer look. Check the reasons below and consider contacting the brand.", COUNTERFEIT: "The recorded evidence indicates this item may be counterfeit. Review the reasons and contact the brand before using it.", UNKNOWN: "There isn’t enough verified information to assess this item. An unknown result does not mean it is counterfeit." };
  return <><section className="panel consumer-result" aria-labelledby="result-title"><div className="consumer-result-header"><div className="consumer-result-symbol">{verdict === "GENUINE" ? <ShieldCheck size={27} aria-hidden="true" /> : <ShieldQuestion size={27} aria-hidden="true" />}</div><VerdictBadge verdict={verdict} /></div><h2 id="result-title">{t(productName(scan))}</h2>{brandName(scan.product) && <p className="consumer-result-brand">{brandName(scan.product)}</p>}<p className="consumer-muted">{t(descriptions[verdict] || descriptions.UNKNOWN)}</p><div className="consumer-result-meta"><span>{t("Code: {value}", { value: scan.gtin || scan.barcode || t("Unavailable") })}</span>{scan.serial && <span>{t("Serial: {value}", { value: scan.serial })}</span>}{scan.batch && <span>{t("Batch: {value}", { value: scan.batch })}</span>}<span>{dateLabel(scan.createdAt)}</span></div><hr className="consumer-divider" /><p className="consumer-kicker">{t("WHAT INFORMED THIS RESULT")}</p><ul className="consumer-reasons">{scan.reasons?.length ? scan.reasons.map((item, index) => <li key={index}><CircleHelp size={16} aria-hidden="true" /><span>{t(typeof item === "string" ? item : item.message || item.description || item.code || "")}</span></li>) : <li><Info size={16} aria-hidden="true" /><span>{t("No additional verification reasons were returned.")}</span></li>}</ul>{pointsEarned > 0 && <p className="consumer-success">{t("You earned {points} points for this contribution.", { points: pointsEarned })} <Link href="/rewards" className="consumer-text-link">{t("View rewards")}</Link></p>}<div className="consumer-tip"><LockKeyhole size={15} aria-hidden="true" /><span>{t("Your result is saved privately.")} <Link href="/history" className="consumer-text-link">{t("View scan history")}</Link></span></div></section>
  <div className="consumer-result-panels"><section className="panel consumer-card"><p className="consumer-kicker"><ImagePlus size={16} aria-hidden="true" /> {t("A closer look")}</p><h2>{t("Check the packaging")}</h2>{analysis && <div className="consumer-analysis-note"><p className="consumer-kicker">{t("LATEST PACKAGING REVIEW")}</p><div className="consumer-analysis-scores">{typeof analysis.authenticityScore === "number" && <div><span>{t("Visual similarity")}</span><strong>{Math.round(analysis.authenticityScore)}<small> / 100</small></strong></div>}{typeof analysis.confidence === "number" && <div><span>{t("Review confidence")}</span><strong>{Math.round(analysis.confidence * 100)}<small>%</small></strong></div>}</div>{analysis.createdAt && <p>{dateLabel(analysis.createdAt)}</p>}{!!analysis.findings?.length && <ul className="consumer-reasons">{analysis.findings.map((finding, index) => <li key={index}><Info size={15} aria-hidden="true" /><span>{finding}</span></li>)}</ul>}{!analysis.findings?.length && <p>{t("No specific visual findings were returned.")}</p>}{analysis.status === "NEEDS_REVIEW" && <p>{t("This review has limited confidence and needs further investigation.")}</p>}<p>{t("Visual similarity compares the packaging to available references. It does not prove the physical product’s authenticity.")}</p><hr className="consumer-divider" /></div>}{scan.userId ? <><p className="consumer-muted">{t("Packaging review requires a signed-in account. Upload clear photos of the front, label, and seal for an additional check.")}</p><form className="consumer-form" onSubmit={analyze}><div className="consumer-photo-input"><Upload size={24} aria-hidden="true" /><label htmlFor={`photos-${scan.id}`}>{t("Choose 1–3 packaging photos")}</label><input id={`photos-${scan.id}`} type="file" disabled={analyzing} multiple accept="image/jpeg,image/png,image/webp" onChange={event => { const selected = Array.from(event.target.files || []); if (selected.length > 3 || selected.some(file => file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setPhotoError(t("Choose up to 3 JPG, PNG, or WebP photos, each under 5 MB.")); setPhotos([]); setPreviews([]); } else { setPhotos(selected); setPreviews(selected.map(file => URL.createObjectURL(file))); setPhotoError(""); } }} /><small>{t("JPG, PNG, or WebP · up to 5 MB each")}</small></div>{previews.length > 0 && <div className="consumer-photo-preview">{previews.map((url, index) => <Image key={url} src={url} width={88} height={88} unoptimized alt={t("Selected packaging photo {index}", { index: index + 1 })} />)}</div>}{photoAuthError && <div className="consumer-error" role="alert"><p style={{ margin: "0 0 12px" }}>{t("Sign in, then scan this item again to review its packaging. Guest scans stay with your guest session and do not transfer into your account.")}</p><Link className="button secondary consumer-button-full" href="/login?next=/scan">{t("Sign in to review packaging")} <ArrowRight size={16} aria-hidden="true" /></Link></div>}{photoError && <p className="consumer-error" role="alert">{photoError}</p>}{analysisNote && <p className="consumer-success" role="status">{analysisNote}</p>}<button className="button secondary consumer-button-full" disabled={!photos.length || analyzing || photoAuthError}>{analyzing ? <><LoaderCircle className="spin" size={17} aria-hidden="true" /> {t("Reviewing packaging…")}</> : <><ImagePlus size={17} aria-hidden="true" /> {t("Review photos")}</>}</button><small>{t("Guest scans do not transfer when you sign in. Scan the item again from your account to use packaging review. Photos are uploaded privately; AI observations cannot independently prove that a product is counterfeit.")}</small></form></> : <div className="consumer-analysis-note"><p>{t("Packaging review is available to signed-in members. Sign in, then scan this product again to save a scan to your account.")}</p><p className="consumer-muted">{t("This guest scan stays private to this browser.")}</p><Link className="button secondary" href="/login?next=/scan">{t("Sign in to review packaging")} <ArrowRight size={16} aria-hidden="true" /></Link></div>}</section>
  <section className="panel consumer-card consumer-report"><p className="consumer-kicker"><Flag size={16} aria-hidden="true" /> {t("Make a difference")}</p><h2>{t("Something seems off?")}</h2><p className="consumer-muted">{t("Damaged seals, unusual printing, or a seller concern? Share what you noticed.")}</p>{reported ? <div className="consumer-success" role="status"><Check size={15} aria-hidden="true" /> {t("Your concern has been saved for review.")}</div> : <details><summary><Flag size={16} aria-hidden="true" /> {t("Report a concern")}</summary><form className="consumer-form" onSubmit={report}><div className="field"><label htmlFor={`report-${scan.id}`}>{t("What did you notice?")}</label><textarea className="input" id={`report-${scan.id}`} value={reason} onChange={event => setReason(event.target.value)} placeholder={t("Describe the packaging or product concern…")} minLength={10} maxLength={2000} required /></div>{reportError && <p className="consumer-error" role="alert">{reportError}</p>}<button className="button secondary" disabled={reporting || reason.trim().length < 10}>{reporting ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Flag size={16} aria-hidden="true" />} {reporting ? t("Saving report…") : t("Submit report")}</button></form></details>}<div className="consumer-tip"><Info size={15} aria-hidden="true" /><span>{t("If you’re concerned about a product’s safety, contact its manufacturer or seller before using it.")}</span></div></section></div></>;
}





