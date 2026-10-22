import "server-only";
import { db } from "./db";
import { settings } from "./data";
import { adminClient, storage } from "./storage";
import { personalPhotoPaths, retentionCutoff } from "./maintenance-policy";

const BATCH = 500;
const MAX_BATCHES = 20;

async function removePhotos(paths: string[]) {
  const personal = personalPhotoPaths(paths);
  if (!personal.length) return 0;
  const { error } = await storage().remove(personal);
  // Leave the database rows in place if storage refuses, so the photos are retried on the next run.
  if (error) throw new Error("Photo storage cleanup failed");
  return personal.length;
}

async function purgeRateLimits() {
  return (await db().rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } })).count;
}

async function applyRetention() {
  const cutoff = retentionCutoff(new Date(), (await settings()).retentionDays);
  let scans = 0, photos = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const rows = await db().scan.findMany({ where: { createdAt: { lt: cutoff } }, select: { id: true, analyses: { select: { imagePaths: true } } }, orderBy: { createdAt: "asc" }, take: BATCH });
    if (!rows.length) break;
    photos += await removePhotos(rows.flatMap(row => row.analyses.flatMap(item => item.imagePaths)));
    // Analyses, reports and alert memberships cascade with the scan.
    scans += (await db().scan.deleteMany({ where: { id: { in: rows.map(row => row.id) } } })).count;
    if (rows.length < BATCH) break;
  }
  return { cutoff: cutoff.toISOString(), scans, photos };
}

// Pending = a DELETION_REQUESTED event with no later DELETION_PROCESSED event for the same account.
async function pendingDeletionUserIds() {
  const events = await db().auditEvent.findMany({ where: { action: { in: ["DELETION_REQUESTED", "DELETION_PROCESSED"] } }, orderBy: { createdAt: "asc" }, select: { actorId: true, action: true } });
  const pending = new Set<string>();
  for (const event of events) { if (event.action === "DELETION_REQUESTED") pending.add(event.actorId); else pending.delete(event.actorId); }
  return [...pending];
}

async function processDeletion(userId: string) {
  const owned = await db().scan.findMany({ where: { userId }, select: { id: true, analyses: { select: { imagePaths: true } } } });
  await removePhotos(owned.flatMap(row => row.analyses.flatMap(item => item.imagePaths)));
  // Sign-in identity goes first: once removed, the account cannot be used even if a later step must be retried.
  const { error } = await adminClient("Account deletion").auth.admin.deleteUser(userId);
  if (error && error.status !== 404) throw new Error("Auth account deletion failed");
  await db().$transaction(async tx => {
    const scanIds = owned.map(row => row.id);
    await tx.packagingAnalysis.deleteMany({ where: { scanId: { in: scanIds } } });
    // Scans stay as anonymous counterfeit evidence, without the person or their location.
    await tx.scan.updateMany({ where: { userId }, data: { userId: null, guestHash: null, locationConsent: false, lat: null, lng: null, accuracyM: null, city: null } });
    await tx.report.updateMany({ where: { reporterKey: `user:${userId}` }, data: { reporterKey: `deleted:${userId}` } });
    // The points ledger is append-only and keeps an opaque id; the profile itself is emptied.
    await tx.user.update({ where: { id: userId }, data: { name: null, role: "CONSUMER" } });
    await tx.auditEvent.create({ data: { actorId: userId, action: "DELETION_PROCESSED", entityId: userId, details: { scans: scanIds.length } } });
  });
}

async function processDeletions() {
  const ids = await pendingDeletionUserIds();
  let processed = 0; const failed: string[] = [];
  for (const id of ids) { try { await processDeletion(id); processed++; } catch { failed.push(id); } }
  return { pending: ids.length, processed, failed: failed.length };
}

// Each phase runs independently so one unavailable service does not block the others.
async function phase<T>(task: () => Promise<T>): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  try { return { ok: true, result: await task() }; } catch (cause) { return { ok: false, error: cause instanceof Error ? cause.message : "Failed" }; }
}
export async function runMaintenance() {
  const startedAt = new Date().toISOString();
  const rateLimits = await phase(purgeRateLimits);
  const retention = await phase(applyRetention);
  const deletions = await phase(processDeletions);
  return { startedAt, finishedAt: new Date().toISOString(), rateLimits, retention, deletions, ok: rateLimits.ok && retention.ok && deletions.ok && deletions.result.failed === 0 };
}
