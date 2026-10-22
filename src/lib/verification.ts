export type Verdict = "GENUINE" | "SUSPICIOUS" | "COUNTERFEIT" | "UNKNOWN";
export type Reason = { code: string; message: string };
export type Evidence = { productFound: boolean; serialProvided: boolean; issuedCode?: { status: string; batch: string | null } | null; suppliedBatch?: string; recentCount?: number; distantDuplicate?: boolean; ai?: { authenticityScore: number; confidence: number } };
export function verify(e: Evidence): { verdict: Verdict; riskScore: number; reasons: Reason[] } {
  const reasons: Reason[] = []; let verdict: Verdict = "UNKNOWN"; let riskScore = 0;
  if (!e.productFound) reasons.push({ code: "PRODUCT_UNKNOWN", message: "This barcode is not in the brand registry. Authenticity cannot be established." });
  else if (!e.serialProvided) reasons.push({ code: "BARCODE_ONLY", message: "The product is registered, but a barcode can be copied. A unique issued serial is needed to verify the code." });
  else if (!e.issuedCode) { verdict = "SUSPICIOUS"; riskScore = 55; reasons.push({ code: "SERIAL_NOT_ISSUED", message: "This serial was not found for this product. Check the code and ask the brand to review it." }); }
  else if (e.issuedCode.status === "REVOKED") { verdict = "COUNTERFEIT"; riskScore = 95; reasons.push({ code: "REVOKED_CODE", message: "The brand has revoked this unique code as counterfeit. Contact the brand before using this product." }); }
  else if (e.issuedCode.status !== "ACTIVE") { verdict = "SUSPICIOUS"; riskScore = 65; reasons.push({ code: "INACTIVE_CODE", message: "This issued code is inactive and needs brand review." }); }
  else if (e.suppliedBatch && e.issuedCode.batch && e.suppliedBatch !== e.issuedCode.batch) { verdict = "SUSPICIOUS"; riskScore = 70; reasons.push({ code: "BATCH_MISMATCH", message: "The entered batch does not match the serial's issued batch." }); }
  else { verdict = "GENUINE"; reasons.push({ code: "ISSUED_CODE_MATCH", message: "This unique code matches the brand's issued registry. A code match supports authenticity but cannot prove the physical pack is genuine." }); }
  if (e.productFound && e.serialProvided && (e.distantDuplicate || (e.recentCount ?? 0) >= 5)) {
    if (verdict !== "COUNTERFEIT") verdict = "SUSPICIOUS";
    riskScore = Math.max(riskScore, 80);
    reasons.push({ code: e.distantDuplicate ? "DISTANT_DUPLICATE" : "HIGH_SCAN_VELOCITY", message: e.distantDuplicate ? "This code was recently scanned far away. A copied code is possible and needs review." : "This unique code has been scanned unusually often. The brand should review it." });
  }
  if (e.ai) {
    if (e.ai.confidence < 0.7) reasons.push({ code: "AI_NEEDS_REVIEW", message: "The packaging check has low confidence and needs human review." });
    else if (e.ai.authenticityScore < 50) { if (verdict !== "COUNTERFEIT") verdict = "SUSPICIOUS"; riskScore = Math.max(riskScore, 70); reasons.push({ code: "PACKAGING_CONCERN", message: "Packaging differences were found. AI is a supporting signal and cannot independently confirm a counterfeit." }); }
    else reasons.push({ code: "PACKAGING_REVIEWED", message: "The packaging analysis did not find strong differences. This does not establish authenticity." });
  }
  return { verdict, riskScore, reasons };
}
export function normalizeGtin(input: string) { return input.trim(); }
export function rewardCodeKey(gtin: string, serial?: string) { return JSON.stringify([normalizeGtin(gtin), serial?.trim() || null]); }
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) { const rad = Math.PI / 180; const dlat=(b.lat-a.lat)*rad, dlng=(b.lng-a.lng)*rad; const x=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2; return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
export function tierFor(points: number) { return points >= 1000 ? "Guardian" : points >= 250 ? "Scout" : "Explorer"; }

export function isValidRewardScan(productActive: boolean, code: { status: string; batch: string | null } | null, suppliedBatch?: string) {
  return productActive && code?.status === "ACTIVE" && (!suppliedBatch || !code.batch || suppliedBatch === code.batch);
}

export function activeRegistryProduct<T extends { status: string }>(product: T | null | undefined): T | null {
  return product?.status === "ACTIVE" ? product : null;
}
