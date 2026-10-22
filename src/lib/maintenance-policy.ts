import { createHash, timingSafeEqual } from "node:crypto";
// Constant-time check of "Authorization: Bearer <secret>"; a missing or short secret never authorizes.
export function bearerMatches(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 32 || !header?.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(secret));
}
export function retentionCutoff(now: Date, retentionDays: number) { return new Date(now.getTime() - retentionDays * 86400000); }
// Only consumer packaging photos are personal evidence; brand reference images are never removed by retention.
export function personalPhotoPaths(paths: string[]) { return paths.filter(path => !path.startsWith("reference/")); }
