import "server-only";
import { after } from "next/server";
import { alertEmail, alertPayload, signWebhook, webhookUrlAllowed, type AlertEvent } from "./alert-notify-format";

type Outcome = { channel: "webhook" | "email"; status: "sent" | "failed" | "not_configured"; detail?: string };
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export function notificationChannels() {
  const webhookSecret = process.env.ALERT_WEBHOOK_SECRET || "";
  return {
    webhook: !!process.env.ALERT_WEBHOOK_URL && webhookUrlAllowed(process.env.ALERT_WEBHOOK_URL) && webhookSecret.length >= 32,
    email: !!(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_FROM && process.env.ALERT_EMAIL_TO),
  };
}

async function sendWebhook(event: AlertEvent): Promise<Outcome> {
  if (!notificationChannels().webhook) return { channel: "webhook", status: "not_configured" };
  const body = JSON.stringify(alertPayload(event, site())), timestamp = Math.floor(Date.now() / 1000);
  try {
    const response = await fetch(process.env.ALERT_WEBHOOK_URL!, { method: "POST", redirect: "error", signal: AbortSignal.timeout(8000), headers: { "Content-Type": "application/json", "X-ShelfWatch-Timestamp": String(timestamp), "X-ShelfWatch-Signature": signWebhook(body, process.env.ALERT_WEBHOOK_SECRET!, timestamp) }, body });
    return response.ok ? { channel: "webhook", status: "sent" } : { channel: "webhook", status: "failed", detail: `HTTP ${response.status}` };
  } catch { return { channel: "webhook", status: "failed", detail: "Unreachable" }; }
}

async function sendEmail(event: AlertEvent): Promise<Outcome> {
  if (!notificationChannels().email) return { channel: "email", status: "not_configured" };
  const { subject, text } = alertEmail(event, site());
  const to = process.env.ALERT_EMAIL_TO!.split(",").map(item => item.trim()).filter(Boolean).slice(0, 20);
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `${event.alertId}:${event.kind}:${event.severity}` }, body: JSON.stringify({ from: process.env.ALERT_EMAIL_FROM, to, subject, text }) });
    return response.ok ? { channel: "email", status: "sent" } : { channel: "email", status: "failed", detail: `HTTP ${response.status}` };
  } catch { return { channel: "email", status: "failed", detail: "Unreachable" }; }
}

export async function deliverAlert(event: AlertEvent) {
  const outcomes = await Promise.all([sendWebhook(event), sendEmail(event)]);
  for (const outcome of outcomes) if (outcome.status === "failed") console.error("ShelfWatch alert notification failed", outcome.channel, outcome.detail);
  return outcomes;
}

// Called only after the transaction that created or escalated the alert has committed.
export function queueAlertNotification(event: AlertEvent | null | undefined) {
  if (!event) return;
  const channels = notificationChannels();
  if (!channels.webhook && !channels.email) return;
  after(() => deliverAlert(event).then(() => undefined));
}
