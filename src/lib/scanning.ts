import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { hash, type Actor } from "./auth";
import { scanInput } from "./validation";
import { rateLimit, scanInclude, settings } from "./data";
import { verify, rewardCodeKey, distanceKm, isValidRewardScan, activeRegistryProduct } from "./verification";
import { awardScan } from "./rewards";
import { updateAlerts } from "./alerts";
export async function createScan(input: unknown, who: Actor, headerKey?: string | null) {
  const body = scanInput.parse(input);
  const idempotencyKey = body.idempotencyKey || headerKey || randomUUID();
  if (idempotencyKey.length > 128) throw new Error("Invalid idempotency key");
  await rateLimit(`scan:${who.key}`, 30);
  const requestKey = hash(`${who.key}:${idempotencyKey}`), codeKey = rewardCodeKey(body.gtin, body.serial);
  return db().$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${codeKey}, 0))`;
    const existing = await tx.scan.findUnique({ where: { requestKey }, include: scanInclude });
    if (existing) { const ledger = await tx.rewardTransaction.findUnique({ where: { eventKey: `scan:${existing.id}` } }); return { scan: existing, pointsEarned: ledger?.points ?? 0, alertEvent: null }; }
    const product = await tx.product.findUnique({ where: { gtin: body.gtin } });
    const activeProduct = activeRegistryProduct(product);
    const code = activeProduct && body.serial ? await tx.issuedCode.findUnique({ where: { productId_serial: { productId: activeProduct.id, serial: body.serial } } }) : null;
    const previous = body.serial ? await tx.scan.findMany({ where: { codeKey, createdAt: { gte: new Date(Date.now()-86400000) } }, orderBy: { createdAt: "desc" }, take: 100 }) : [];
    const location = body.locationConsent ? body.location : undefined;
    const distantDuplicate = !!location && (location.accuracyM ?? Infinity) <= 1000 && previous.some(p => p.lat !== null && p.lng !== null && (p.accuracyM ?? Infinity) <= 1000 && distanceKm(location, { lat: p.lat, lng: p.lng }) > 100 && Date.now()-p.createdAt.getTime() < 3600000);
    const verdict = verify({ productFound: !!activeProduct, serialProvided: !!body.serial, issuedCode: code, suppliedBatch: body.batch, recentCount: previous.length, distantDuplicate });
    const scan = await tx.scan.create({ data: { gtin: body.gtin, serial: body.serial, batch: body.batch, codeKey, requestKey, userId: who.user?.id, guestHash: who.guestHash, productId: activeProduct?.id, ...verdict, reasons: verdict.reasons, locationConsent: body.locationConsent, lat: location?.lat, lng: location?.lng, accuracyM: location?.accuracyM }, include: scanInclude });
    if (code) await tx.issuedCode.update({ where: { id: code.id }, data: { scanCount: { increment: 1 }, firstScannedAt: code.firstScannedAt ?? scan.createdAt } });
    const rules = await settings(tx);
    const pointsEarned = await awardScan(tx, who.user?.id, codeKey, scan.id, isValidRewardScan(!!activeProduct, code, body.batch), rules);
    const alertEvent = await updateAlerts(tx, scan, rules);
    return { scan, pointsEarned, alertEvent };
  }, { timeout: 15000 });
}
