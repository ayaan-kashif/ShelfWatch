"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Coins, Gift, LoaderCircle, ScanLine, Sparkles, Trophy } from "lucide-react";
import { Heading, ServiceState, dateLabel, request, useRemote } from "./shared";
import { useT } from "../i18n";

type Reward = { id: string; name: string; description?: string | null; pointsCost: number; stock?: number | null; active?: boolean };
type Transaction = { id: string; points: number; reason: string; createdAt: string };
type Rewards = { items: Reward[]; transactions: Transaction[]; pointsBalance: number; tier: string; redemptions?: { id: string; status?: string; createdAt?: string; reward?: { name?: string }; rewardName?: string }[] };

export function RewardsExperience() {
  const t = useT();
  const remote = useRemote<Rewards>("/api/rewards");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<Reward | null>(null);
  const [message, setMessage] = useState("");
  async function redeem(reward: Reward) {
    setBusy(reward.id); setError(""); setMessage("");
    try { await request("/api/rewards/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rewardId: reward.id }) }); setMessage(t("Your {name} redemption has been saved. Check its status below.", { name: reward.name })); setConfirmation(null); remote.reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("This reward couldn’t be redeemed. Please try again.")); }
    finally { setBusy(""); }
  }
  return <><Heading eyebrow={t("GOOD CHECKS. GOOD THINGS.")} title={t("Confidence has its rewards.")} description={t("Earn points through eligible contributions that help keep the community informed.")} /><ServiceState {...remote} />{remote.data && !remote.error && <>
    <section className="panel consumer-wallet" aria-label={t("Your points balance")}><div><div className="consumer-wallet-label">{t("YOUR POINTS BALANCE")}</div><div className="consumer-wallet-balance">{remote.data.pointsBalance.toLocaleString()}<span>{t("points")}</span></div><span className="badge"><Trophy size={13} aria-hidden="true" /> {t(remote.data.tier || "Member")}</span></div><div className="consumer-wallet-orbit" aria-hidden="true"><Coins size={46} strokeWidth={1.2} /></div></section>
    <div className="consumer-tip"><Sparkles size={16} aria-hidden="true" /><span>{t("Points are awarded by the service for eligible contributions. Repeat scans and daily limits may affect what you earn.")}</span></div>
    {message && <p className="consumer-success" role="status">{message}</p>}{error && <p className="consumer-error" role="alert">{error}</p>}
    {confirmation && <section className="panel consumer-card consumer-section" aria-labelledby="redemption-confirmation"><h2 id="redemption-confirmation">{t("Redeem {name}?", { name: confirmation.name })}</h2><p className="consumer-muted">{t("This will use {points} points from your balance.", { points: confirmation.pointsCost.toLocaleString() })}</p><div className="consumer-actions"><button className="button primary" disabled={!!busy} onClick={() => redeem(confirmation)}>{busy ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Gift size={16} aria-hidden="true" />}{busy ? t("Redeeming…") : t("Confirm redemption")}</button><button className="button secondary" disabled={!!busy} onClick={() => { setConfirmation(null); setError(""); }}>{t("Cancel")}</button></div></section>}
    <section className="consumer-section" aria-labelledby="reward-catalog-title"><div className="consumer-inline-heading"><h2 id="reward-catalog-title">{t("A little something for you")}</h2><span className="consumer-muted" style={{ fontSize: 12 }}>{t("Rewards catalog")}</span></div>{remote.data.items.length ? <div className="consumer-reward-grid">{remote.data.items.map(item => <article className="panel consumer-reward" key={item.id}><div className="consumer-reward-art"><Gift size={27} strokeWidth={1.5} aria-hidden="true" /></div><h3>{item.name}</h3><p>{item.description || t("A reward for your eligible ShelfWatch contributions.")}</p><span className="consumer-reward-cost">{t("{points} points", { points: item.pointsCost.toLocaleString() })}</span><button className="button secondary consumer-button-full" disabled={remote.data!.pointsBalance < item.pointsCost || item.stock === 0 || item.active === false || !!busy} onClick={() => { setConfirmation(item); setError(""); setMessage(""); }}>{item.stock === 0 ? t("Currently unavailable") : remote.data!.pointsBalance < item.pointsCost ? t("More points needed") : t("Redeem reward")}<ArrowRight size={15} aria-hidden="true" /></button></article>)}</div> : <div className="panel consumer-empty"><Gift size={36} aria-hidden="true" /><h2>{t("The catalog is getting ready")}</h2><p>{t("Available rewards will appear here when they’re added. Your recorded points stay in your account.")}</p><Link className="button secondary" href="/scan"><ScanLine size={16} aria-hidden="true" /> {t("Check a product")}</Link></div>}</section>
    <section className="panel consumer-card consumer-section" aria-labelledby="points-activity"><div className="consumer-inline-heading"><h2 id="points-activity">{t("Your points activity")}</h2><Coins size={20} className="consumer-muted" aria-hidden="true" /></div>{remote.data.transactions.length ? <div className="consumer-transaction-wrap"><table className="consumer-ledger"><thead><tr><th scope="col">{t("Contribution")}</th><th scope="col">{t("Points")}</th></tr></thead><tbody>{remote.data.transactions.map(item => <tr key={item.id}><td>{t(item.reason)}<small>{dateLabel(item.createdAt)}</small></td><td className={item.points >= 0 ? "consumer-positive" : "consumer-negative"}>{item.points > 0 ? "+" : ""}{item.points.toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="consumer-muted">{t("Your eligible contributions and redemptions will appear here.")}</p>}</section>
    {!!remote.data.redemptions?.length && <section className="panel consumer-card consumer-section"><h2>{t("Your redemptions")}</h2><div className="consumer-transaction-wrap"><table className="consumer-ledger"><thead><tr><th scope="col">{t("Reward")}</th><th scope="col">{t("Status")}</th></tr></thead><tbody>{remote.data.redemptions.map(item => <tr key={item.id}><td>{item.reward?.name || item.rewardName || t("Reward redemption")}{item.createdAt && <small>{dateLabel(item.createdAt)}</small>}</td><td>{t(item.status || "Recorded")}</td></tr>)}</tbody></table></div></section>}
  </>}</>;
}
