import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runtimeConnection, migrationUrl, stripTlsParams, bundledCaPath, SUPABASE_ROOT_CA } from "../src/lib/db-tls";

const remote = "postgresql://user:pw@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

test("remote runtime connections always verify the certificate against the bundled root",()=>{const c=runtimeConnection(remote);assert.ok(c.ssl);assert.equal(c.ssl.rejectUnauthorized,true);assert.match(c.ssl.ca,/BEGIN CERTIFICATE/);});
test("URL TLS parameters cannot weaken verification",()=>{const c=runtimeConnection(remote+"&sslmode=no-verify&sslaccept=accept_invalid_certs");assert.doesNotMatch(c.connectionString,/ssl/);assert.match(c.connectionString,/pgbouncer=true/);assert.equal(c.ssl?.rejectUnauthorized,true);});
test("migrations use strict TLS with the trusted root",()=>{const u=new URL(migrationUrl(remote+"&sslmode=disable"));assert.equal(u.searchParams.get("sslmode"),"require");assert.equal(u.searchParams.get("sslaccept"),"strict");assert.equal(u.searchParams.get("sslrootcert"),bundledCaPath);});
test("embedded runtime CA matches the certificate file used by migrations",()=>{assert.equal(SUPABASE_ROOT_CA,readFileSync(bundledCaPath,"utf8").trim());});
test("local development databases are left without TLS",()=>{const local="postgresql://postgres:postgres@localhost:5432/shelfwatch";assert.equal(runtimeConnection(local).ssl,undefined);assert.equal(migrationUrl(local),local);assert.equal(stripTlsParams(local),local);});
