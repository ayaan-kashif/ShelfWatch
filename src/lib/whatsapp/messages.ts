import { createHash } from "node:crypto";
import { translate, type Locale } from "../i18n/translate";

export type BotCommand =
  | { kind: "help" }
  | { kind: "how" }
  | { kind: "privacy" }
  | { kind: "check"; gtin: string; serial?: string; batch?: string }
  | { kind: "invalid" };

const CODE = /^[A-Za-z0-9._:/-]{4,128}$/;
const PART = /^[A-Za-z0-9._:/-]{1,128}$/;
const HELP_WORDS = new Set(["hi", "hello", "salam", "help", "menu", "start", "مدد", "سلام", "مینو"]);
const HOW_WORDS = new Set(["how", "info", "about", "کیسے", "معلومات"]);
const PRIVACY_WORDS = new Set(["privacy", "data", "رازداری"]);

// Arabic-script text gets Urdu replies; everything else English.
export function detectLocale(text: string): Locale { return /[؀-ۿ]/.test(text) ? "ur" : "en"; }

// "check <barcode> [serial] [batch]", or a message that is only a code (optionally followed by serial and batch).
export function parseCommand(raw: string): BotCommand {
  const text = raw.trim().replace(/\s+/g, " ").slice(0, 500);
  const words = text.split(" ");
  const first = words[0]?.toLowerCase() ?? "";
  if (!text || HELP_WORDS.has(first)) return { kind: "help" };
  if (HOW_WORDS.has(first)) return { kind: "how" };
  if (PRIVACY_WORDS.has(first)) return { kind: "privacy" };
  const args = ["check", "verify", "scan", "جانچ", "چیک"].includes(first) ? words.slice(1) : words;
  const [gtin, serial, batch] = args;
  if (!gtin || args.length > 3 || !CODE.test(gtin) || (serial && !PART.test(serial)) || (batch && !PART.test(batch))) return { kind: "invalid" };
  return { kind: "check", gtin, ...(serial ? { serial } : {}), ...(batch ? { batch } : {}) };
}

// Sender identity is never stored: only a salted hash, scoped to the WhatsApp channel.
export function senderKey(jid: string, salt: string) { return createHash("sha256").update(`whatsapp:${salt}:${jid}`).digest("hex"); }

export function helpText(locale: Locale) {
  const t = (s: string) => translate(locale, s);
  return [t("*ShelfWatch* — check a product’s code."), "", t("Send the barcode, optionally followed by the serial and batch:"), "  8964000123456", "  8964000123456 SN12345 B42", "", t("Other messages:"), t("• *how* — how verification works"), t("• *privacy* — what we store"), "", t("A barcode alone cannot prove a product is genuine.")].join("\n");
}
export function howText(locale: Locale) {
  const t = (s: string) => translate(locale, s);
  return [t("*How ShelfWatch checks a product*"), "", t("1. The barcode is matched against the brand registry."), t("2. A unique serial issued by the brand is a stronger signal than a barcode."), t("3. Codes seen too often or far apart are flagged for review."), "", t("Results: Genuine, Suspicious, Counterfeit or Unknown. Unknown means there is not enough verified information. It does not mean counterfeit.")].join("\n");
}
export function privacyText(locale: Locale) {
  const t = (s: string) => translate(locale, s);
  return [t("*Privacy*"), "", t("Your phone number is not stored. We keep a one-way code so limits work, plus the codes you send and the result."), t("WhatsApp checks never use your location and do not earn reward points.")].join("\n");
}
export function invalidText(locale: Locale) { return translate(locale, "That doesn’t look like a product code. Send the barcode digits, or *help* for instructions."); }

export type ScanSummary = { verdict: string; productName?: string | null; brand?: string | null; reasons: { message: string }[] };
const VERDICT_ICON: Record<string, string> = { GENUINE: "✅", SUSPICIOUS: "⚠️", COUNTERFEIT: "⛔", UNKNOWN: "❔" };
export function resultText(scan: ScanSummary, locale: Locale, siteUrl?: string) {
  const t = (s: string, vars?: Record<string, string | number>) => translate(locale, s, vars);
  const lines = [`${VERDICT_ICON[scan.verdict] ?? "❔"} *${t(scan.verdict)}*`];
  lines.push(scan.productName ? `${scan.productName}${scan.brand ? ` · ${scan.brand}` : ""}` : t("Unregistered product"));
  if (scan.reasons.length) { lines.push("", t("Why:")); for (const reason of scan.reasons.slice(0, 3)) lines.push(`• ${t(reason.message)}`); }
  lines.push("", t("A barcode alone cannot prove a product is genuine."));
  if (siteUrl) lines.push(t("For photo checks and history, scan at {url}", { url: `${siteUrl.replace(/\/$/, "")}/scan` }));
  return lines.join("\n");
}
