/**
 * LIVE, rollback-only integration check. Never seeds or commits operational records.
 * Run explicitly with:
 * node --conditions=react-server --import tsx --env-file=.env.local scripts/database-check.ts
 * This verifies transaction behavior serially; it does not validate concurrent requests.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { balance, type Tx } from "../src/lib/data";
import { awardScan, awardBonus, redeem, resolveRedemption } from "../src/lib/rewards";
import { updateAlerts } from "../src/lib/alerts";
import { settingsInput } from "../src/lib/validation";
import { rewardCodeKey } from "../src/lib/verification";
import { ApiError } from "../src/lib/errors";

class RollbackOnlyCheck extends Error { constructor() { super("Intentional rollback after live integration assertions"); this.name = "RollbackOnlyCheck"; } }
const rollback = new RollbackOnlyCheck();
const marker = `ROLLBACK-ONLY-SELF-TEST:${randomUUID()}`;
const ids = { user: randomUUID(), product: randomUUID(), reward: randomUUID(), expensiveReward: randomUUID(), scans: [] as string[], alerts: [] as string[], redemptions: [] as string[] };
const checks: string[] = [];
let step = "connect";

async function main() {
  const client = db();
  let assertionsPassed = false;
  let transactionError: unknown;
  try {
    await client.$transaction(async tx => {
      step = "create rollback-only fixtures";
      await tx.user.create({ data: { id: ids.user, name: marker } });
      const product = await tx.product.create({ data: { id: ids.product, gtin: marker, name: marker, brand: marker } });
      const rules = settingsInput.parse({ dailyScanCap: 2, scanPoints: 10, analysisPoints: 5, alertCount: 5, alertRadiusKm: 0.1, alertWindowHours: 1 });
      async function scan(serial: string, location?: { lat: number; lng: number }) {
        const id = randomUUID(); ids.scans.push(id);
        return tx.scan.create({ data: {
          id, userId: ids.user, requestKey: `${marker}:${id}`, codeKey: rewardCodeKey(product.gtin, serial),
          gtin: product.gtin, serial, productId: product.id,
          verdict: location ? "COUNTERFEIT" : "GENUINE", riskScore: location ? 95 : 0,
          reasons: [{ code: "ROLLBACK_ONLY_TEST", message: marker }],
          locationConsent: !!location, lat: location?.lat, lng: location?.lng, accuracyM: location ? 5 : undefined,
        } });
      }
      const first = await scan("issued-a");
      const duplicate = await scan("issued-a");
      const second = await scan("issued-b");
      const capped = await scan("issued-c");
      step = "duplicate reward exclusion and daily cap";
      assert.equal(await awardScan(tx, ids.user, first.codeKey, first.id, true, rules), 10);
      assert.equal(await awardScan(tx, ids.user, duplicate.codeKey, duplicate.id, true, rules), 0);
      assert.equal(await awardScan(tx, ids.user, second.codeKey, second.id, true, rules), 10);
      assert.equal(await awardScan(tx, ids.user, capped.codeKey, capped.id, true, rules), 0);
      assert.equal(await tx.rewardClaim.count({ where: { userId: ids.user } }), 2);
      assert.equal(await balance(ids.user, tx), 20);
      checks.push("duplicate earning excluded", "daily reward cap enforced");

      step = "bonus idempotency";
      assert.equal(await awardBonus(tx, ids.user, first.id, "PACKAGING_CHECK", 5), 5);
      assert.equal(await awardBonus(tx, ids.user, first.id, "PACKAGING_CHECK", 5), 0);
      assert.equal(await awardBonus(tx, ids.user, duplicate.id, "PACKAGING_CHECK", 5), 0);
      assert.equal(await balance(ids.user, tx), 25);
      checks.push("bonus awarded once per eligible scan");

      step = "redemption debit, stock and idempotency";
      await tx.rewardItem.create({ data: { id: ids.reward, name: marker, description: marker, pointsCost: 20, stock: 1 } });
      const requestKey = `${marker}:redeem-once`;
      const redemption = await redeem(tx, ids.user, ids.reward, requestKey);
      ids.redemptions.push(redemption.id);
      const repeated = await redeem(tx, ids.user, ids.reward, requestKey);
      assert.equal(repeated.id, redemption.id);
      assert.equal(await balance(ids.user, tx), 5);
      assert.equal((await tx.rewardItem.findUniqueOrThrow({ where: { id: ids.reward } })).stock, 0);
      assert.equal(await tx.rewardTransaction.count({ where: { userId: ids.user, reason: "REDEMPTION" } }), 1);
      // These are application rejections, not SQL errors; they do not abort PostgreSQL's transaction.
      await assert.rejects(() => redeem(tx, ids.user, ids.reward, `${marker}:out-of-stock`), (error: unknown) => error instanceof ApiError && error.code === "OUT_OF_STOCK");
      await tx.rewardItem.create({ data: { id: ids.expensiveReward, name: marker, description: marker, pointsCost: 6, stock: null } });
      await assert.rejects(() => redeem(tx, ids.user, ids.expensiveReward, `${marker}:insufficient`), (error: unknown) => error instanceof ApiError && error.code === "INSUFFICIENT_POINTS");
      checks.push("redemption debits once and consumes stock atomically", "out-of-stock and insufficient-balance requests rejected");

      step = "redemption cancel refunds once and restores stock";
      const cancelled = await resolveRedemption(tx, redemption.id, "CANCELLED");
      assert.equal(cancelled.status, "CANCELLED");
      assert.equal(await balance(ids.user, tx), 25);
      assert.equal((await tx.rewardItem.findUniqueOrThrow({ where: { id: ids.reward } })).stock, 1);
      await assert.rejects(() => resolveRedemption(tx, redemption.id, "CANCELLED"), (error: unknown) => error instanceof ApiError && error.code === "CONFLICT");
      await assert.rejects(() => resolveRedemption(tx, redemption.id, "FULFILLED"), (error: unknown) => error instanceof ApiError && error.code === "CONFLICT");
      assert.equal(await balance(ids.user, tx), 25);
      const fulfilled = await redeem(tx, ids.user, ids.reward, `${marker}:redeem-fulfil`);
      ids.redemptions.push(fulfilled.id);
      assert.equal((await resolveRedemption(tx, fulfilled.id, "FULFILLED")).status, "FULFILLED");
      assert.equal(await balance(ids.user, tx), 5);
      checks.push("cancelled redemption refunds exactly once and restores stock; resolved redemptions cannot change");

      step = "find isolated PostGIS check area";
      await tx.$executeRaw`SET LOCAL search_path TO public, extensions`;
      const baselineAlertIds = new Set((await tx.alert.findMany({ select: { id: true } })).map(item => item.id));
      const center = await emptyCheckArea(tx);
      const clusterScans = [];
      for (let index = 0; index < 5; index++) {
        const record = await scan(`cluster-${index}`, { lat: center.lat + index * 0.00008, lng: center.lng });
        clusterScans.push(record);
        step = `PostGIS cluster scan ${index + 1} of 5`;
        await updateAlerts(tx, record, rules);
        if (index < 4) assert.equal(await tx.alertScan.count({ where: { scanId: { in: clusterScans.map(item => item.id) } } }), 0);
      }
      const clusterIds = clusterScans.map(item => item.id);
      const related = await tx.alert.findMany({ where: { status: { not: "RESOLVED" }, scans: { some: { scanId: { in: clusterIds } } } } });
      assert.equal(related.length, 1);
      for (const alert of related) if (!baselineAlertIds.has(alert.id)) ids.alerts.push(alert.id);
      assert.equal(await tx.alertScan.count({ where: { alertId: related[0].id, scanId: { in: clusterIds } } }), 5);
      step = "repeat cluster evaluation without duplicate alert or members";
      await updateAlerts(tx, clusterScans[4], rules);
      await updateAlerts(tx, clusterScans[0], rules);
      assert.equal(await tx.alert.count({ where: { status: { not: "RESOLVED" }, scans: { some: { scanId: { in: clusterIds } } } } }), 1);
      assert.equal(await tx.alertScan.count({ where: { alertId: related[0].id, scanId: { in: clusterIds } } }), 5);
      checks.push("five located high-risk scans create one PostGIS alert", "repeated cluster checks preserve unique alert membership");
      step = "intentional rollback";
      throw rollback; // Mandatory: there is no successful/committing return path.
    }, { timeout: 60000, maxWait: 10000 });
  } catch (error) {
    if (error === rollback) assertionsPassed = true;
    else transactionError = error;
  }

  const failedStep = step;
  step = "verify all fixture records were rolled back";
  const residual = await Promise.all([
    client.user.count({ where: { id: ids.user } }),
    client.product.count({ where: { id: ids.product } }),
    client.scan.count({ where: { id: { in: ids.scans } } }),
    client.rewardClaim.count({ where: { userId: ids.user } }),
    client.rewardTransaction.count({ where: { userId: ids.user } }),
    client.rewardItem.count({ where: { id: { in: [ids.reward, ids.expensiveReward] } } }),
    client.redemption.count({ where: { userId: ids.user } }),
    client.alert.count({ where: { id: { in: ids.alerts } } }),
    client.alertScan.count({ where: { scanId: { in: ids.scans } } }),
  ]);
  assert.ok(residual.every(count => count === 0), "Rollback verification failed: fixture records remain");
  if (transactionError) { step = failedStep; throw transactionError; }
  assert.ok(assertionsPassed, "Transaction did not finish through its rollback sentinel");
  console.log(JSON.stringify({ status: "passed", checks, rollbackVerified: true, remainingFixtureRecords: 0, concurrencyTested: false }, null, 2));
}

async function emptyCheckArea(tx: Tx) {
  // Isolate assertions from existing operational data; no real records are read into output.
  for (let attempt = 0; attempt < 8; attempt++) {
    const lat = -60 + Math.random() * 5, lng = -150 + Math.random() * 5;
    const occupied = await tx.$queryRaw<{ occupied: boolean }[]>`SELECT EXISTS (SELECT 1 FROM "Scan" WHERE lat IS NOT NULL AND lng IS NOT NULL AND ST_DWithin(ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography,ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography,1000)) OR EXISTS (SELECT 1 FROM "Alert" WHERE status != 'RESOLVED' AND ST_DWithin(ST_SetSRID(ST_MakePoint("centerLng","centerLat"),4326)::geography,ST_SetSRID(ST_MakePoint(${lng},${lat}),4326)::geography,("radiusKm" + 1) * 1000)) AS occupied`;
    if (!occupied[0].occupied) return { lat, lng };
  }
  throw new Error("No isolated check area found; no assertions ran against existing clusters");
}

main().catch(error => {
  // Do not print database errors, connection strings, or environment values.
  console.error(JSON.stringify({ status: "failed", step, errorType: error instanceof Error ? error.name : "UnknownError", code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined }));
  process.exitCode = 1;
}).finally(async () => { await db().$disconnect(); });
