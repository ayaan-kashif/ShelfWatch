import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { setupRequired } from "./errors";
import { runtimeConnection } from "./db-tls";
const globalDb = globalThis as unknown as { shelfwatchDb?: PrismaClient };
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) setupRequired("Database");
  if (!globalDb.shelfwatchDb) globalDb.shelfwatchDb = new PrismaClient({ adapter: new PrismaPg(runtimeConnection(url)) });
  return globalDb.shelfwatchDb;
}
