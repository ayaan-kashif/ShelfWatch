import "server-only";
import { ApiError } from "./errors";
import { balance, lockUser, settings, type Tx } from "./data";
import { type Settings } from "./validation";
export async function awardScan(tx: Tx, userId: string | undefined, codeKey: string, scanId: string, eligible: boolean, rules: Settings) {
  if (!userId || !eligible || rules.scanPoints <= 0) return 0;
  await lockUser(tx, userId);
  if (await tx.rewardClaim.findUnique({ where: { userId_codeKey: { userId, codeKey } } })) return 0;
  const today = new Date(); today.setUTCHours(0,0,0,0);
  if (await tx.rewardClaim.count({ where: { userId, createdAt: { gte: today } } }) >= rules.dailyScanCap) return 0;
  await tx.rewardClaim.create({ data: { userId, codeKey, scanId } });
  await tx.rewardTransaction.create({ data: { userId, scanId, points: rules.scanPoints, reason: "VALID_SCAN", eventKey: `scan:${scanId}` } });
  return rules.scanPoints;
}
export async function awardBonus(tx: Tx, userId: string | null, scanId: string, reason: "PACKAGING_CHECK" | "CONFIRMED_REPORT", points: number) {
  if (!userId || points <= 0) return 0;
  await lockUser(tx, userId);
  let claim = await tx.rewardClaim.findFirst({ where: { userId, scanId } });
  if (!claim && reason === "CONFIRMED_REPORT") {
    const scan = await tx.scan.findUniqueOrThrow({ where: { id: scanId } });
    if (await tx.rewardClaim.findUnique({ where: { userId_codeKey: { userId, codeKey: scan.codeKey } } })) return 0;
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const rules = await settings(tx);
    if (await tx.rewardClaim.count({ where: { userId, createdAt: { gte: today } } }) >= rules.dailyScanCap) return 0;
    claim = await tx.rewardClaim.create({ data: { userId, codeKey: scan.codeKey, scanId } });
  }
  if (!claim) return 0;
  const eventKey = `${reason}:${scanId}`;
  if (await tx.rewardTransaction.findUnique({ where: { eventKey } })) return 0;
  await tx.rewardTransaction.create({ data: { userId, scanId, points, reason, eventKey } }); return points;
}
export async function redeem(tx: Tx, userId: string, rewardId: string, requestKey: string) {
  await lockUser(tx, userId);
  const prior = await tx.redemption.findUnique({ where: { requestKey }, include: { reward: true } }); if (prior) return prior;
  await tx.$queryRaw`SELECT id FROM "RewardItem" WHERE id=${rewardId}::uuid FOR UPDATE`;
  const reward = await tx.rewardItem.findUnique({ where: { id: rewardId } });
  if (!reward || !reward.active) throw new ApiError(404, "Reward is unavailable.", "NOT_FOUND");
  if (reward.stock !== null && reward.stock <= 0) throw new ApiError(409, "This reward is out of stock.", "OUT_OF_STOCK");
  if (await balance(userId, tx) < reward.pointsCost) throw new ApiError(409, "You need more points to redeem this reward.", "INSUFFICIENT_POINTS");
  const redemption = await tx.redemption.create({ data: { userId, rewardId, requestKey, pointsCost: reward.pointsCost }, include: { reward: true } });
  await tx.rewardTransaction.create({ data: { userId, points: -reward.pointsCost, reason: "REDEMPTION", eventKey: `redemption:${redemption.id}` } });
  if (reward.stock !== null) await tx.rewardItem.update({ where: { id: reward.id }, data: { stock: { decrement: 1 } } });
  return redemption;
}
// Fulfil or cancel a pending redemption. Cancelling refunds through a new ledger entry (the ledger is append-only) and restores stock.
export async function resolveRedemption(tx: Tx, redemptionId: string, status: "FULFILLED" | "CANCELLED") {
  const locked = await tx.$queryRaw<{ userId: string }[]>`SELECT "userId" FROM "Redemption" WHERE id=${redemptionId}::uuid FOR UPDATE`;
  if (!locked[0]) throw new ApiError(404, "Redemption not found.", "NOT_FOUND");
  await lockUser(tx, locked[0].userId);
  const redemption = await tx.redemption.findUniqueOrThrow({ where: { id: redemptionId }, include: { reward: true } });
  if (redemption.status !== "PENDING") throw new ApiError(409, "This redemption has already been resolved.", "CONFLICT");
  if (status === "CANCELLED") {
    await tx.rewardTransaction.create({ data: { userId: redemption.userId, points: redemption.pointsCost, reason: "REDEMPTION_REFUND", eventKey: `redemption-refund:${redemption.id}` } });
    if (redemption.reward.stock !== null) await tx.rewardItem.update({ where: { id: redemption.rewardId }, data: { stock: { increment: 1 } } });
  }
  return tx.redemption.update({ where: { id: redemption.id }, data: { status }, include: { reward: true } });
}
