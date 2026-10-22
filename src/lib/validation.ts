import { z } from "zod";
export const scanInput = z.object({ gtin: z.string().trim().regex(/^[A-Za-z0-9._:/-]{4,128}$/, "Enter a valid barcode (4–128 characters)."), serial: z.string().trim().min(1).max(128).optional(), batch: z.string().trim().max(128).optional(), locationConsent: z.boolean(), location: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracyM: z.number().min(0).max(100000).optional() }).optional(), idempotencyKey: z.string().uuid().optional() }).refine(v => !v.location || v.locationConsent, { message: "Location requires your consent." });
export const productInput = z.object({ gtin: z.string().trim().min(4).max(128), name: z.string().trim().min(1).max(160), brand: z.string().trim().min(1).max(120), category: z.string().trim().max(100).nullable().optional(), referenceImages: z.array(z.string().max(500).regex(/^reference\/[A-Za-z0-9_./-]+$/, "Use a private reference/ storage object path.")).max(6).default([]), attributes: z.record(z.string(), z.string().max(500)).default({}), status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE") });
export const settingsInput = z.object({ alertCount: z.number().int().min(2).max(1000).default(5), alertRadiusKm: z.number().min(.1).max(100).default(2), alertWindowHours: z.number().int().min(1).max(720).default(24), dailyScanCap: z.number().int().min(0).max(100).default(10), scanPoints: z.number().int().min(0).max(1000).default(10), analysisPoints: z.number().int().min(0).max(1000).default(5), confirmedReportPoints: z.number().int().min(0).max(1000).default(25), retentionDays: z.number().int().min(1).max(3650).default(90) });
export type Settings = z.infer<typeof settingsInput>;
export const rewardInput = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(1000), pointsCost: z.number().int().min(1).max(1000000), stock: z.number().int().min(0).nullable().default(null), active: z.boolean().default(true) });
export const analysisOutput = z.object({ authenticityScore: z.number().min(0).max(100), confidence: z.number().min(0).max(1), findings: z.array(z.string().min(1).max(500)).max(20) });
export const uuid = z.string().uuid();

// In Zod 4, optional(default(...)) still emits the default when omitted.
// Mutation patches must strip defaults before making fields optional.
export const productPatchInput = z.object({
  gtin: productInput.shape.gtin.optional(),
  name: productInput.shape.name.optional(),
  brand: productInput.shape.brand.optional(),
  category: productInput.shape.category,
  referenceImages: productInput.shape.referenceImages.removeDefault().optional(),
  attributes: productInput.shape.attributes.removeDefault().optional(),
  status: productInput.shape.status.removeDefault().optional(),
});
export const settingsPatchInput = z.object({
  alertCount: settingsInput.shape.alertCount.removeDefault().optional(),
  alertRadiusKm: settingsInput.shape.alertRadiusKm.removeDefault().optional(),
  alertWindowHours: settingsInput.shape.alertWindowHours.removeDefault().optional(),
  dailyScanCap: settingsInput.shape.dailyScanCap.removeDefault().optional(),
  scanPoints: settingsInput.shape.scanPoints.removeDefault().optional(),
  analysisPoints: settingsInput.shape.analysisPoints.removeDefault().optional(),
  confirmedReportPoints: settingsInput.shape.confirmedReportPoints.removeDefault().optional(),
  retentionDays: settingsInput.shape.retentionDays.removeDefault().optional(),
});
export const rewardPatchInput = z.object({
  name: rewardInput.shape.name.optional(),
  description: rewardInput.shape.description.optional(),
  pointsCost: rewardInput.shape.pointsCost.optional(),
  stock: rewardInput.shape.stock.removeDefault().optional(),
  active: rewardInput.shape.active.removeDefault().optional(),
});
