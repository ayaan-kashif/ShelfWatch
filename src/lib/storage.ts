import "server-only";
import { createAdminClient } from "@supabase/server/core";
import { randomUUID } from "node:crypto";
import { ApiError, setupRequired } from "./errors";
export function adminClient(service = "Private photo storage") { if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) setupRequired(service); return createAdminClient({ env: { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKeys: { default: process.env.SUPABASE_SECRET_KEY! } } }); }
export function storage() { return adminClient().storage.from(process.env.SUPABASE_STORAGE_BUCKET || "shelfwatch-photos"); }
export function imageType(bytes: Buffer) { if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg"; if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png"; if (bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP") return "image/webp"; return null; }
export async function validateImages(form: FormData) {
  const files = [...form.getAll("photos"), ...form.getAll("images")].filter((item): item is File => item instanceof File);
  if (files.length < 1 || files.length > 3) throw new ApiError(400, "Upload between one and three packaging photos.", "INVALID_IMAGES");
  return Promise.all(files.map(async file => { if (file.size < 12 || file.size > 5*1024*1024) throw new ApiError(400, "Each photo must be a JPG, PNG or WebP under 5 MB.", "INVALID_IMAGES"); const bytes=Buffer.from(await file.arrayBuffer()); const type=imageType(bytes); if (!type) throw new ApiError(400, "Only JPG, PNG and WebP photos are supported.", "INVALID_IMAGES"); return { bytes, type }; }));
}
export async function uploadImage(prefix: string, image: { bytes: Buffer; type: string }) { const path = `${prefix}/${randomUUID()}.${image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1]}`; const { error } = await storage().upload(path, image.bytes, { contentType: image.type, upsert: false }); if (error) throw new ApiError(503, "The photo could not be stored. Please try again.", "STORAGE_UNAVAILABLE"); return path; }
export async function signedImages(paths: string[]) { if (!paths.length || !process.env.SUPABASE_SECRET_KEY) return []; const { data, error }=await storage().createSignedUrls(paths,300); if (error) return []; return data.map(item=>item.signedUrl); }
