// Verifies the runtime database connection uses certificate-verified TLS.
import { existsSync } from "node:fs";
import { Client } from "pg";
import { runtimeConnection } from "../src/lib/db-tls";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
async function main() {
for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const url = process.env[name];
  if (!url) { console.log(`${name}: not set`); continue; }
  const client = new Client(runtimeConnection(url));
  try {
    await client.connect();
    const tls = (client as unknown as { connection: { stream: { encrypted?: boolean; authorized?: boolean; getProtocol?: () => string } } }).connection.stream;
    await client.query("select 1");
    console.log(`${name}: connected, encrypted=${Boolean(tls.encrypted)}, certificateVerified=${Boolean(tls.authorized)}, protocol=${tls.getProtocol?.()}`);
  } catch (error) {
    console.log(`${name}: FAILED ${(error as Error).message}`);
    process.exitCode = 1;
  } finally { await client.end().catch(() => {}); }
}
}
void main();
