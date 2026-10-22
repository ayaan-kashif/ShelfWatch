import { z } from "zod";
const dailyLimit = z.coerce.number().int().min(0).max(10000);
export function analysisBudget(rawLimit: string | undefined, now = new Date()) {
  const limit = dailyLimit.parse(rawLimit?.trim() || "50");
  const nextDay = new Date(now); nextDay.setUTCHours(24, 0, 0, 0);
  return { limit, key: `analysis-budget:${now.toISOString().slice(0, 10)}`, seconds: Math.max(1, Math.ceil((nextDay.getTime() - now.getTime()) / 1000)) };
}
