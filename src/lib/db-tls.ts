import path from "node:path";

// Supabase pooler certificates chain to this public root (official download, SHA-256 80:70:25:AD…CA:FA).
// Embedded for the runtime (no filesystem read, so Next.js tracing stays narrow); certs/ holds the same PEM for the Prisma CLI.
export const SUPABASE_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;
export const bundledCaPath = path.join(process.cwd(), "certs", "supabase-root-2021.crt");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLocalDatabase(url: string) {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}

// CA file for the Prisma CLI, which takes a path rather than PEM text.
export function caPath() {
  return process.env.DATABASE_CA_CERT_PATH || bundledCaPath;
}

// PEM from DATABASE_CA_CERT (hosting secrets often escape newlines), otherwise the embedded Supabase root.
export function databaseCa() {
  const inline = process.env.DATABASE_CA_CERT?.trim();
  return inline ? inline.replace(/\\n/g, "\n") : SUPABASE_ROOT_CA;
}

// Drop URL TLS parameters so the explicit verified configuration cannot be weakened by them.
export function stripTlsParams(url: string) {
  const parsed = new URL(url);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "sslaccept", "ssl", "uselibpqcompat"]) parsed.searchParams.delete(key);
  return parsed.toString();
}

// Runtime (node-postgres): certificate chain and hostname are always verified for non-local hosts.
export function runtimeConnection(url: string) {
  const connectionString = stripTlsParams(url);
  if (isLocalDatabase(url)) return { connectionString };
  return { connectionString, ssl: { ca: databaseCa(), rejectUnauthorized: true } };
}

// Prisma CLI (migrations): strict certificate validation against the same trusted root.
export function migrationUrl(url: string) {
  if (isLocalDatabase(url)) return url;
  const parsed = new URL(stripTlsParams(url));
  parsed.searchParams.set("sslmode", "require");
  parsed.searchParams.set("sslaccept", "strict");
  parsed.searchParams.set("sslrootcert", caPath());
  return parsed.toString();
}
