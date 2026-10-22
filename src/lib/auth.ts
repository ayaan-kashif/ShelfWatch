import "server-only";
import { createServerClient } from "@supabase/ssr";
import { verifyCredentials } from "@supabase/server/core";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError, setupRequired } from "./errors";
import type { User } from "@prisma/client";
export function authConfigured() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export async function supabase(readOnly = false) {
  if (!authConfigured()) setupRequired("Sign-in");
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookies: { getAll: () => jar.getAll(), setAll(values) { if (!readOnly) for (const { name, value, options } of values) jar.set(name, value, options); } } });
}
export type Actor = { user: User | null; guestHash: string | null; key: string };
export function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export async function actor(createGuest = false, readOnly = false): Promise<Actor> {
  let user: User | null = null;
  if (authConfigured()) {
    const client = await supabase(readOnly);
    // getSession supplies a token only; no session identity is trusted before verification.
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new ApiError(401, "Your session expired. Please sign in again.", "SESSION_EXPIRED");
    const token = sessionData.session?.access_token;
    if (token) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const { data: verified, error: verifyError } = await verifyCredentials({ token, apikey: null }, {
        auth: "user", issuer: `${url.replace(/\/$/, "")}/auth/v1`, audience: "authenticated",
        env: { url, publishableKeys: { default: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! } },
      });
      if (verifyError || !verified?.userClaims) throw new ApiError(401, "Your session could not be verified. Please sign in again.", "SESSION_INVALID");
      // Ask Auth as well so a deleted account or revoked session is not accepted on JWT alone.
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user || data.user.id !== verified.userClaims.id) throw new ApiError(401, "Your session is no longer valid. Please sign in again.", "SESSION_INVALID");
      if (data.user) { const name = String(data.user.user_metadata?.name || "Member").slice(0, 100); user = process.env.DATABASE_URL ? await db().user.upsert({ where: { id: data.user.id }, update: {}, create: { id: data.user.id, name } }) : { id: data.user.id, name, role: "CONSUMER", createdAt: new Date(data.user.created_at) }; }
  }
  }
  if (user) return { user, guestHash: null, key: `user:${user.id}` };
  const jar = await cookies(); let token = jar.get("shelfwatch_guest")?.value;
  if (token && !/^[a-f0-9]{64}$/.test(token)) token = undefined;
  if (!token && createGuest) { token = randomBytes(32).toString("hex"); jar.set("shelfwatch_guest", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60*60*24*30 }); }
  const guestHash = token ? hash(token) : null;
  return { user: null, guestHash, key: guestHash ? `guest:${guestHash}` : "anonymous" };
}
export function ownerWhere(who: Actor) { return who.user ? { userId: who.user.id } : { guestHash: who.guestHash ?? "unowned" }; }
export function requireUser(who: Actor) { if (!who.user) throw new ApiError(401, "Sign in to use this feature.", "SIGN_IN_REQUIRED"); return who.user; }
export function requireAdmin(who: Actor, superOnly = false) { const user = requireUser(who); if (superOnly ? user.role !== "SUPER_ADMIN" : !["ADMIN", "SUPER_ADMIN"].includes(user.role)) throw new ApiError(403, "You do not have access to this feature.", "FORBIDDEN"); return user; }
export function publicUser(user: User | null) { return user ? { id: user.id, name: user.name, role: user.role } : null; }

export async function getPageActor() { return actor(false, true); }
