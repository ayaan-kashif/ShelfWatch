import "server-only";
import type { Scan } from "@prisma/client";
import { type Tx } from "./data";
import { type Settings } from "./validation";
import type { AlertEvent } from "./alert-notify-format";
// Returns an event when a cluster alert is created or escalates to CRITICAL, for post-commit notification.
export async function updateAlerts(tx: Tx, scan: Scan, rules: Settings): Promise<AlertEvent | null> {
  if (scan.lat === null || scan.lng === null || !scan.locationConsent || !(scan.verdict === "COUNTERFEIT" || (scan.verdict === "SUSPICIOUS" && scan.riskScore >= 80))) return null;
  await tx.$executeRaw`SET LOCAL search_path TO public, extensions`;
  // One short global lock makes overlapping cluster creation deterministic in the MVP.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(731049221)`;
  const neighbors = await tx.$queryRaw<{ id: string; productId: string | null; lat: number; lng: number }[]>`SELECT id,"productId",lat,lng FROM "Scan" WHERE "createdAt" >= NOW() - ${rules.alertWindowHours} * interval '1 hour' AND "locationConsent" = true AND lat IS NOT NULL AND lng IS NOT NULL AND (verdict='COUNTERFEIT' OR (verdict='SUSPICIOUS' AND "riskScore">=80)) AND ST_DWithin(ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography,ST_SetSRID(ST_MakePoint(${scan.lng},${scan.lat}),4326)::geography,${rules.alertRadiusKm * 1000})`;
  if (neighbors.length < rules.alertCount) return null;
  const existing = await tx.$queryRaw<{ id: string; productIds: string[]; severity: string }[]>`SELECT id,"productIds",severity FROM "Alert" WHERE status != 'RESOLVED' AND ST_DWithin(ST_SetSRID(ST_MakePoint("centerLng","centerLat"),4326)::geography,ST_SetSRID(ST_MakePoint(${scan.lng},${scan.lat}),4326)::geography,("radiusKm" + ${rules.alertRadiusKm}) * 1000) ORDER BY "createdAt" ASC`;
  const productIds = [...new Set(neighbors.flatMap(n => n.productId ? [n.productId] : []).concat(existing.flatMap(a => a.productIds)))];
  const severity = neighbors.length >= rules.alertCount * 2 ? "CRITICAL" : "HIGH";
  const alert = existing[0] ? await tx.alert.update({ where: { id: existing[0].id }, data: { productIds, severity } }) : await tx.alert.create({ data: { centerLat: scan.lat, centerLng: scan.lng, radiusKm: rules.alertRadiusKm, productIds, severity } });
  await tx.alertScan.createMany({ data: neighbors.map(n => ({ alertId: alert.id, scanId: n.id })), skipDuplicates: true });
  for (const duplicate of existing.slice(1)) {
    const memberships = await tx.alertScan.findMany({ where: { alertId: duplicate.id } });
    await tx.alertScan.createMany({ data: memberships.map(m => ({ alertId: alert.id, scanId: m.scanId })), skipDuplicates: true });
    await tx.alert.update({ where: { id: duplicate.id }, data: { status: "RESOLVED", notes: `Merged into ${alert.id}` } });
  }
  const kind = !existing[0] ? "CREATED" : existing[0].severity !== "CRITICAL" && severity === "CRITICAL" ? "ESCALATED" : null;
  if (!kind) return null;
  const scans = await tx.alertScan.count({ where: { alertId: alert.id } });
  return { alertId: alert.id, kind, severity, scans, centerLat: alert.centerLat, centerLng: alert.centerLng, radiusKm: alert.radiusKm };
}
