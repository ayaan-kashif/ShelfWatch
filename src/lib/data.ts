import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ApiError } from "./errors";
import { settingsInput } from "./validation";
import { actor, ownerWhere, type Actor } from "./auth";
export type Tx = Prisma.TransactionClient;
export const scanInclude = { product: true, analyses: { orderBy: { createdAt: "desc" as const }, take: 1 } };
export async function settings(tx: Tx = db()) { const row = await tx.setting.findUnique({ where: { key: "app" } }); return settingsInput.parse(row?.value ?? {}); }
export async function balance(userId: string, tx: Tx = db()) { return (await tx.rewardTransaction.aggregate({ where: { userId }, _sum: { points: true } }))._sum.points ?? 0; }
export async function lockUser(tx: Tx, id: string) { await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id}::uuid FOR UPDATE`; }
export async function rateLimit(key: string, limit: number, seconds = 60) {
  const rows = await db().$queryRaw<{ count: number }[]>`INSERT INTO "RateLimit" (key,count,"expiresAt") VALUES (${key},1,NOW() + ${seconds} * interval '1 second') ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN 1 ELSE "RateLimit".count + 1 END, "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN NOW() + ${seconds} * interval '1 second' ELSE "RateLimit"."expiresAt" END RETURNING count`;
  if (rows[0].count > limit) throw new ApiError(429, "Too many requests. Please wait a moment and try again.", "RATE_LIMITED");
}
export async function ownedScan(id: string, who: Actor, adminAllowed = true) {
  const isAdmin = who.user && ["ADMIN", "SUPER_ADMIN"].includes(who.user.role);
  const scan = await db().scan.findFirst({ where: { id, ...(adminAllowed && isAdmin ? {} : ownerWhere(who)) }, include: scanInclude });
  if (!scan) throw new ApiError(404, "Scan not found.", "NOT_FOUND"); return scan;
}
export function safeScan<T extends { guestHash?: string | null; requestKey?: string; codeKey?: string }>(scan: T) { const { guestHash: _guest, requestKey: _request, codeKey: _code, ...safe } = scan; void _guest; void _request; void _code; return safe; }
export async function audit(who: Actor, action: string, entityId?: string, details: Prisma.InputJsonValue = {}, tx: Tx = db()) { if (who.user) await tx.auditEvent.create({ data: { actorId: who.user.id, action, entityId, details } }); }
export async function currentUser() { return (await actor()).user; }
