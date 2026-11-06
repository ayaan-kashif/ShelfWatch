"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, ScanLine, Fingerprint, ShieldCheck, ShieldQuestion, ShieldAlert, ShieldX, Gift, LockKeyhole, Plus, MapPinned } from "lucide-react";
import { ScanScene } from "./scan-scene";
import { useT } from "./i18n";
import { useScrollMotion } from "./motion";

const steps = [
  { number: "01", icon: ScanLine, title: "Point. Scan. Start here.", copy: "Scan the barcode with your camera, or enter it manually. Add a unique serial if the pack has one." },
  { number: "02", icon: Fingerprint, title: "Look beyond the label.", copy: "Check brand registry and issued-code evidence. Add packaging photos for an optional AI second opinion." },
  { number: "03", icon: ShieldCheck, title: "Know your next move.", copy: "Read the reasons behind your result, report a concern, and earn points for eligible contributions." },
];
const verdicts = [
  { code: "GENUINE", icon: ShieldCheck, copy: "An active, brand-issued unique code matched. Strong evidence, not a physical guarantee." },
  { code: "UNKNOWN", icon: ShieldQuestion, copy: "Not enough verified information yet. Unknown never means fake." },
  { code: "SUSPICIOUS", icon: ShieldAlert, copy: "Some signals don’t add up. Take a closer look before you buy." },
  { code: "COUNTERFEIT", icon: ShieldX, copy: "Brand-confirmed evidence, such as a revoked code or a confirmed report." },
];
const signals = ["Unique codes", "Packaging evidence", "Community signals", "Real evidence. Clear explanations.", "No app download"];
const questions = [
  { q: "Can a barcode prove a product is genuine?", a: "No. A barcode identifies the product it claims to be and can be copied. ShelfWatch combines registry data, issued unique codes, packaging evidence and scan patterns. If evidence is missing, we say so." },
  { q: "Do I need an account to scan?", a: "You can check a code as a guest. Sign in to keep your scan history together, earn eligible reward points and submit packaging photos for analysis." },
  { q: "Who sees my location and photos?", a: "Location sharing is optional and is explained before each scan. If you consent, brand administrators can use the coordinates for counterfeit monitoring. Packaging photos are private and are submitted for analysis only when you choose." },
  { q: "How do brands use ShelfWatch?", a: "Authorized brand administrators maintain the trusted product registry and unique codes, investigate reports, monitor located scans and manage cluster alerts in a protected workspace." },
];
const i = (index: number) => ({ "--i": index } as CSSProperties);

export function Landing() {
  const t = useT();
  const root = useScrollMotion<HTMLDivElement>();
  const ticker = signals.map(item => t(item));
  return <div ref={root} className="lx">
    <div className="lx-progress" aria-hidden="true" />
    <section className="lx-hero" data-progress>
      <div className="lx-hero-copy">
        <p className="lx-kicker"><span /> {t("A LITTLE CHECK. A LOT OF CLARITY.")}</p>
        <h1 className="lx-title"><span className="lx-line"><span>{t("Know what’s")}</span></span><span className="lx-line"><span>{t("in your")} <mark>{t("hands.")}</mark></span></span></h1>
        <p className="lx-lede">{t("A smarter way to check everyday products.")} {t("Scan a code, understand the evidence, and")} {t("shop with a little more confidence.")}</p>
        <div className="lx-cta">
          <Link href="/scan" className="lx-button">{t("Scan a product")} <ArrowUpRight size={20} /></Link>
          <Link href="#how-it-works" className="lx-link">{t("See how it works")} <ArrowRight size={18} /></Link>
        </div>
        <ul className="lx-assure"><li><LockKeyhole size={15} /> {t("Your privacy, your choice")}</li><li><ScanLine size={15} /> {t("No app download")}</li></ul>
      </div>
      <ScanScene />
    </section>

    <section className="lx-ticker" data-progress aria-label={t("CONFIDENCE IS BUILT ON")}>
      {[0, 1].map(row => <div key={row} className={`lx-ticker-row row-${row}`} aria-hidden={row === 1}>
        <div className="lx-ticker-track">{[...ticker, ...ticker].map((item, index) => <span key={index}>{item}<b>✦</b></span>)}</div>
      </div>)}
    </section>

    <section id="how-it-works" className="lx-steps" data-progress data-steps={steps.length} data-step="0">
      <div className="lx-steps-stick">
        <div className="lx-steps-head">
          <p className="lx-kicker"><span /> {t("FROM SHELF TO CLARITY")}</p>
          <h2>{t("Three steps.")}<br /><em>{t("A clearer picture.")}</em></h2>
          <div className="lx-counter" aria-hidden="true"><div>{steps.map(step => <span key={step.number}>{step.number}</span>)}</div><small>/ 03</small></div>
          <div className="lx-steps-bar" aria-hidden="true"><span /></div>
        </div>
        <ol className="lx-step-list">
          {steps.map(({ number, icon: Icon, title, copy }, index) => <li key={number} className="lx-step" data-reveal="up" style={i(index)}>
            <div className="lx-step-top"><span>{number}</span><Icon size={28} strokeWidth={1.4} /></div>
            <h3>{t(title)}</h3><p>{t(copy)}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <section className="lx-verdicts">
      <div className="lx-section-head" data-reveal="wipe">
        <p className="lx-kicker"><span /> {t("WHAT A RESULT MEANS")}</p>
        <h2>{t("Four honest answers.")}</h2>
        <p>{t("Every scan ends in one of these. Each comes with the reasons behind it.")}</p>
      </div>
      <div className="lx-deck">
        {verdicts.map(({ code, icon: Icon, copy }, index) => <article key={code} className={`lx-verdict v-${code.toLowerCase()}`} data-reveal="deal" style={i(index)}>
          <Icon size={30} strokeWidth={1.4} />
          <span className="lx-stamp">{t(code)}</span>
          <p>{t(copy)}</p>
        </article>)}
      </div>
    </section>

    <section className="lx-split">
      <article className="lx-panel lx-rewards" data-reveal="left">
        <div className="lx-coupon" aria-hidden="true"><Gift size={44} strokeWidth={1.3} /><span /><span /></div>
        <p className="lx-kicker"><span /> {t("SMALL CHECKS. SHARED IMPACT.")}</p>
        <h2>{t("Your curiosity")} {t("can be rewarding.")}</h2>
        <p>{t("Earn points for eligible scans and useful contributions. Explore rewards managed by the community’s brands.")}</p>
        <Link href="/rewards" className="lx-link">{t("Explore rewards")} <ArrowRight size={18} /></Link>
      </article>
      <article id="for-brands" className="lx-panel lx-brands" data-reveal="right">
        <svg className="lx-map" viewBox="0 0 400 220" aria-hidden="true">
          <path pathLength={1} d="M20 170 C 90 120, 120 190, 190 130 S 300 60, 380 90" />
          <path pathLength={1} d="M40 60 C 110 90, 150 40, 210 80 S 320 170, 370 150" />
          <path pathLength={1} d="M70 200 C 120 150, 180 160, 220 120 S 260 40, 330 30" />
          {[[190, 130], [210, 80], [220, 120], [96, 146], [330, 30], [370, 150]].map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r={6} style={i(index)} />)}
        </svg>
        <span className="lx-map-label"><MapPinned size={14} /> {t("CONNECT THE SIGNALS")}</span>
        <p className="lx-kicker"><span /> {t("FOR BRANDS & INVESTIGATORS")}</p>
        <h2>{t("See the pattern.")} {t("Protect the bigger picture.")}</h2>
        <p>{t("Turn real scan evidence into a clearer view of risk. Monitor hotspots, investigate reports and keep your registry trusted.")}</p>
        <Link href="/admin" className="lx-link">{t("Open brand workspace")} <ArrowUpRight size={18} /></Link>
      </article>
    </section>

    <section id="questions" className="lx-faq">
      <div className="lx-section-head lx-faq-head" data-reveal="wipe">
        <p className="lx-kicker"><span /> {t("A FEW GOOD QUESTIONS")}</p>
        <h2>{t("Clarity starts")} <em>{t("with honesty.")}</em></h2>
        <p>{t("Here’s what a scan can tell you.")} {t("And where the evidence has limits.")}</p>
      </div>
      <div className="lx-faq-list">{questions.map((item, index) => <details key={item.q} data-reveal="left" style={i(index)}><summary>{t(item.q)}<Plus size={20} /></summary><p>{t(item.a)}</p></details>)}</div>
    </section>

    <section className="lx-final" data-progress>
      <div className="lx-giant" aria-hidden="true"><span>LOOK CLOSER ✦ LOOK CLOSER ✦ LOOK CLOSER ✦</span></div>
      <div className="lx-final-body" data-reveal="up">
        <p className="lx-kicker"><span /> {t("THE NEXT PRODUCT IS IN YOUR HANDS")}</p>
        <h2>{t("A better choice")} {t("starts with a little check.")}</h2>
        <Link href="/scan" className="lx-button">{t("Make your first scan")} <ArrowUpRight size={20} /></Link>
      </div>
    </section>

    <footer className="lx-footer">
      <Link href="/" className="public-brand"><span><ScanLine size={22} /></span>ShelfWatch<span className="brand-period">.</span></Link>
      <p>{t("Know more. Choose better.")}</p>
      <div><Link href="/how-it-works">{t("Privacy & evidence")}</Link><Link href="/login">{t("Your account")} <ArrowUpRight size={14} /></Link></div>
      <small>© {new Date().getFullYear()} ShelfWatch</small>
    </footer>
  </div>;
}
