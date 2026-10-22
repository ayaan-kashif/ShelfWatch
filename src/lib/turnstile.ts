import "server-only";
import { ApiError } from "./errors";

// Optional Cloudflare Turnstile check for unauthenticated auth endpoints. Disabled until TURNSTILE_SECRET_KEY is set.
export async function verifyHuman(request: Request, token: string | undefined) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (!token) throw new ApiError(400, "Please complete the human check and try again.", "BOT_CHECK_REQUIRED");
  const form = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.set("remoteip", ip);
  let outcome: { success?: boolean } = {};
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(8000) });
    outcome = await response.json();
  } catch { throw new ApiError(503, "The human check is temporarily unavailable. Please try again.", "BOT_CHECK_UNAVAILABLE"); }
  if (!outcome.success) throw new ApiError(400, "The human check could not be confirmed. Please try again.", "BOT_CHECK_FAILED");
}
