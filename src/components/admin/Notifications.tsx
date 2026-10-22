"use client";
import { useState } from "react";
import { BellRing, Send } from "lucide-react";
import { Feedback, ResourceState, Status, request, useAdminResource, useSave } from "./shared";
type Outcome = { channel: "webhook" | "email"; status: "sent" | "failed" | "not_configured"; detail?: string };
const label = { webhook: "Signed webhook", email: "Email (Resend)" } as const;
export default function Notifications({ canManage }: { canManage: boolean }) {
  const resource = useAdminResource<{ channels: { webhook: boolean; email: boolean } }>("/api/admin/notifications"); const saving = useSave(); const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  async function test() { await saving.save(async () => { const result = await request<{ outcomes: Outcome[] }>("/api/admin/notifications/test", { method: "POST", body: "{}" }); setOutcomes(result.outcomes); }, "Test notification attempted. Results are shown below."); }
  const channels = resource.data?.channels;
  return <section className="panel ad-section"><div className="ad-section-head"><div><h2 className="ad-title-icon"><BellRing size={19} aria-hidden="true" />Alert notifications</h2><p>New and escalated cluster alerts are sent to the channels configured on the server.</p></div>{canManage && <button className="button secondary" onClick={test} disabled={saving.busy || !channels || (!channels.webhook && !channels.email)}><Send size={16} aria-hidden="true" />{saving.busy ? "Sending…" : "Send test"}</button>}</div><Feedback {...saving} /><ResourceState {...resource}>{channels && <>{(["webhook", "email"] as const).map(channel => <div className="ad-product-row" key={channel}><div><strong>{label[channel]}</strong><span className="ad-subtext">{channel === "webhook" ? "ALERT_WEBHOOK_URL (HTTPS) and ALERT_WEBHOOK_SECRET (32+ characters)" : "RESEND_API_KEY, ALERT_EMAIL_FROM and ALERT_EMAIL_TO"}</span>{outcomes.filter(item => item.channel === channel).map(item => <span className="ad-subtext" key={item.status}>Last test: {item.status.replaceAll("_", " ")}{item.detail ? ` (${item.detail})` : ""}</span>)}</div><Status value={channels[channel] ? "ACTIVE" : "INACTIVE"} /></div>)}{!channels.webhook && !channels.email && <p className="ad-body-note">No notification channel is configured, so alerts appear only in the Alert center.</p>}</>}</ResourceState></section>;
}
