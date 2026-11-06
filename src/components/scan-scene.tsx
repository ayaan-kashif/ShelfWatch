"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Fingerprint, Camera, Globe2, Pause, Play } from "lucide-react";
import { useT } from "./i18n";
import { prefersStillMotion } from "./motion";

// Decorative bar pattern only; it does not encode a real product code.
const bars = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 4, 1, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 4, 1, 2, 1, 1, 3, 1, 2];
const stamps = [{ icon: Fingerprint, label: "Unique code check" }, { icon: Camera, label: "Packaging evidence" }, { icon: Globe2, label: "Community signals" }];

export function ScanScene({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => { node.dataset.active = String(entry.isIntersecting && !document.hidden); });
    observer.observe(node);
    const visibility = () => { node.dataset.active = String(!document.hidden); };
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  return <div ref={ref} data-progress className={`tag-scene ${compact ? "is-compact" : ""} ${paused ? "is-paused" : ""}`}
    onPointerMove={event => {
      if (prefersStillMotion()) return;
      const box = event.currentTarget.getBoundingClientRect();
      event.currentTarget.style.setProperty("--pointer-x", `${(event.clientX - box.left - box.width / 2) / 40}deg`);
      event.currentTarget.style.setProperty("--pointer-y", `${-(event.clientY - box.top - box.height / 2) / 50}deg`);
    }}
    onPointerLeave={event => { event.currentTarget.style.setProperty("--pointer-x", "0deg"); event.currentTarget.style.setProperty("--pointer-y", "0deg"); }}>
    <div className="tag-grid" aria-hidden="true" />
    <div className="tag-tilt" aria-hidden="true">
      <div className="tag-card">
        <span className="tag-hole" />
        <div className="tag-head"><span>SHELFWATCH</span><span>SPECIMEN</span></div>
        <strong className="tag-name">Every detail<br />matters.</strong>
        <div className="tag-barcode">{bars.map((width, index) => <i key={index} style={{ "--w": width, "--i": index } as CSSProperties} />)}<span className="tag-beam" /></div>
        <div className="tag-foot"><span>ILLUSTRATION</span><span>NOT A RESULT</span></div>
      </div>
      {stamps.map(({ icon: Icon, label }, index) => <div key={label} className={`tag-stamp stamp-${index + 1}`}><Icon size={17} strokeWidth={1.8} /><span><small>0{index + 1}</small>{t(label)}</span></div>)}
    </div>
    <div className="tag-caption"><span><i /> {t("Verification, illustrated")}</span><button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Play illustration animation" : "Pause illustration animation"} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />}</button></div>
  </div>;
}
