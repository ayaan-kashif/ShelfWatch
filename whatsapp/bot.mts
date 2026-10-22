/**
 * ShelfWatch WhatsApp bot (long-running worker, not part of the Next.js app).
 *
 * Uses Baileys, an unofficial WhatsApp Web client. WhatsApp may restrict or ban the linked number:
 * link a dedicated number, never a personal one. Run with:  npm run whatsapp
 *
 * Every reply comes from the same verification engine and database as the website. Senders are
 * stored only as salted hashes; no location is collected and no reward points are awarded.
 */
import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState, type WAMessage } from "baileys";
import qrcode from "qrcode-terminal";
import { ZodError } from "zod";
import { createScan } from "../src/lib/scanning";
import { rateLimit } from "../src/lib/data";
import { ApiError } from "../src/lib/errors";
import { translate } from "../src/lib/i18n/translate";
import { detectLocale, helpText, howText, invalidText, parseCommand, privacyText, resultText, senderKey } from "../src/lib/whatsapp/messages";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || "whatsapp/.auth";
const SALT = process.env.WHATSAPP_HASH_SALT || "";
const PAIRING_NUMBER = process.env.WHATSAPP_PAIRING_NUMBER?.replace(/\D/g, "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

if (SALT.length < 16) { console.error("Set WHATSAPP_HASH_SALT (16+ random characters) in .env.local before starting the bot."); process.exit(1); }
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set; the bot needs the ShelfWatch database."); process.exit(1); }

// Baileys is very chatty; keep only warnings and errors.
const quiet = { level: "warn", child() { return quiet; }, trace() {}, debug() {}, info() {}, warn(...args: unknown[]) { console.warn("[baileys]", ...args.map(String)); }, error(...args: unknown[]) { console.error("[baileys]", ...args.map(String)); } };

function messageText(message: WAMessage) {
  const content = message.message;
  return content?.conversation ?? content?.extendedTextMessage?.text ?? null;
}
// Private one-to-one chats only: no groups, broadcasts, status updates or channels.
function isDirectChat(jid: string) { return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"); }

async function reply(text: string, jid: string): Promise<string> {
  const locale = detectLocale(text);
  const command = parseCommand(text);
  if (command.kind === "help") return helpText(locale);
  if (command.kind === "how") return howText(locale);
  if (command.kind === "privacy") return privacyText(locale);
  if (command.kind === "invalid") return invalidText(locale);
  const guestHash = senderKey(jid, SALT);
  try {
    await rateLimit(`whatsapp:${guestHash}`, 20, 3600);
    const { scan } = await createScan({ gtin: command.gtin, serial: command.serial, batch: command.batch, locationConsent: false }, { user: null, guestHash, key: `guest:${guestHash}` });
    return resultText({ verdict: scan.verdict, productName: scan.product?.name, brand: scan.product?.brand, reasons: (scan.reasons as { message: string }[]) ?? [] }, locale, SITE_URL);
  } catch (error) {
    if (error instanceof ZodError) return invalidText(locale);
    if (error instanceof ApiError && error.status === 429) return translate(locale, "ShelfWatch is busy right now. Please try again in a minute.");
    console.error("WhatsApp verification failed", error instanceof Error ? error.name : "UnknownError");
    return translate(locale, "Verification is temporarily unavailable. Please try again later.");
  }
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({ auth: state, browser: Browsers.ubuntu("ShelfWatch"), logger: quiet as never, markOnlineOnConnect: false, syncFullHistory: false });
  let pairingRequested = false;
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr && !sock.authState.creds.registered) {
      if (PAIRING_NUMBER && !pairingRequested) { pairingRequested = true; console.log(`Pairing code: ${await sock.requestPairingCode(PAIRING_NUMBER)} (WhatsApp → Linked devices → Link with phone number)`); }
      else if (!PAIRING_NUMBER) { console.log("Scan this QR code in WhatsApp → Linked devices:"); qrcode.generate(qr, { small: true }); }
    }
    if (connection === "open") console.log("ShelfWatch WhatsApp bot is connected.");
    if (connection === "close") {
      const status = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      if (status === DisconnectReason.loggedOut) { console.error(`Logged out. Delete ${AUTH_DIR} and start again to relink.`); process.exit(1); }
      console.warn("Connection closed; reconnecting in 5 seconds.");
      setTimeout(() => { void start(); }, 5000);
    }
  });
  // Handle messages one at a time so a burst cannot overload the database.
  let queue = Promise.resolve();
  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      const jid = message.key.remoteJid; const text = messageText(message);
      if (message.key.fromMe || !jid || !isDirectChat(jid) || !text) continue;
      queue = queue.then(async () => { const answer = await reply(text, jid); await sock.sendMessage(jid, { text: answer }, { quoted: message }); }).catch(() => console.error("Could not send WhatsApp reply"));
    }
  });
}

void start();
