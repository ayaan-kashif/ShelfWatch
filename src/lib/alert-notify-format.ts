import { createHmac } from "node:crypto";
export type AlertEvent = { alertId: string; kind: "CREATED" | "ESCALATED"; severity: string; scans: number; centerLat: number; centerLng: number; radiusKm: number };

// Contains no personal data: cluster centre is rounded to ~100 m and no scan, user or photo identifiers are sent.
export function alertPayload(event: AlertEvent, siteUrl: string, sentAt = new Date()) {
  return {
    type: event.kind === "CREATED" ? "alert.created" : "alert.escalated",
    sentAt: sentAt.toISOString(),
    alert: { id: event.alertId, severity: event.severity, flaggedScans: event.scans, radiusKm: event.radiusKm, center: { lat: Math.round(event.centerLat * 1000) / 1000, lng: Math.round(event.centerLng * 1000) / 1000 } },
    url: `${siteUrl.replace(/\/$/, "")}/admin/alerts`,
  };
}
export function alertEmail(event: AlertEvent, siteUrl: string) {
  const payload = alertPayload(event, siteUrl);
  const subject = `ShelfWatch ${event.severity.toLowerCase()} alert: ${event.kind === "CREATED" ? "new" : "escalated"} counterfeit cluster (${event.scans} flagged scans)`;
  const text = [`A ${event.kind === "CREATED" ? "new" : "growing"} cluster of flagged scans needs review.`, `Severity: ${event.severity}`, `Flagged scans in cluster: ${event.scans}`, `Area: within ${event.radiusKm} km of ${payload.alert.center.lat}, ${payload.alert.center.lng}`, "", `Review it in the Alert center: ${payload.url}`, "", "This is an automated ShelfWatch notification. A cluster is a signal for investigation, not proof of counterfeiting."].join("\n");
  return { subject, text };
}
// Receivers verify: HMAC-SHA256(secret, `${timestamp}.${body}`) and reject stale timestamps.
export function signWebhook(body: string, secret: string, timestamp: number) { return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`; }
export function webhookUrlAllowed(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)); } catch { return false; }
}
