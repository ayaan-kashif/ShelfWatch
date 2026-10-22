-- Supabase PostgreSQL migration. Apply to the user's configured project only.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET search_path = public, extensions;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CONSUMER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('GENUINE', 'SUSPICIOUS', 'COUNTERFEIT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'INVESTIGATING', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CONSUMER',
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "gtin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT,
    "referenceImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedCode" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "batch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "firstScannedAt" TIMESTAMP(3),
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "guestHash" TEXT,
    "requestKey" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,
    "gtin" TEXT NOT NULL,
    "serial" TEXT,
    "batch" TEXT,
    "productId" UUID,
    "verdict" "Verdict" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT '1.0',
    "locationConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT NOT NULL DEFAULT '2026-10-05',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "accuracyM" DOUBLE PRECISION,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingAnalysis" (
    "id" UUID NOT NULL,
    "scanId" UUID NOT NULL,
    "imagePaths" TEXT[],
    "authenticityScore" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "findings" TEXT[],
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackagingAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "scanId" UUID NOT NULL,
    "reporterKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "severity" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "assigneeId" UUID,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertScan" (
    "alertId" UUID NOT NULL,
    "scanId" UUID NOT NULL,

    CONSTRAINT "AlertScan_pkey" PRIMARY KEY ("alertId","scanId")
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeKey" TEXT NOT NULL,
    "scanId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "scanId" UUID,
    "eventKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardItem" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "stock" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rewardId" UUID NOT NULL,
    "requestKey" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_gtin_key" ON "Product"("gtin");

-- CreateIndex
CREATE INDEX "IssuedCode_serial_idx" ON "IssuedCode"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCode_productId_serial_key" ON "IssuedCode"("productId", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "Scan_requestKey_key" ON "Scan"("requestKey");

-- CreateIndex
CREATE INDEX "Scan_userId_createdAt_idx" ON "Scan"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Scan_guestHash_createdAt_idx" ON "Scan"("guestHash", "createdAt");

-- CreateIndex
CREATE INDEX "Scan_codeKey_createdAt_idx" ON "Scan"("codeKey", "createdAt");

-- CreateIndex
CREATE INDEX "Scan_verdict_createdAt_idx" ON "Scan"("verdict", "createdAt");

-- CreateIndex
CREATE INDEX "PackagingAnalysis_scanId_createdAt_idx" ON "PackagingAnalysis"("scanId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_scanId_reporterKey_key" ON "Report"("scanId", "reporterKey");

-- CreateIndex
CREATE INDEX "Alert_status_createdAt_idx" ON "Alert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RewardClaim_userId_createdAt_idx" ON "RewardClaim"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_userId_codeKey_key" ON "RewardClaim"("userId", "codeKey");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_eventKey_key" ON "RewardTransaction"("eventKey");

-- CreateIndex
CREATE INDEX "RewardTransaction_userId_createdAt_idx" ON "RewardTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_requestKey_key" ON "Redemption"("requestKey");

-- AddForeignKey
ALTER TABLE "IssuedCode" ADD CONSTRAINT "IssuedCode_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingAnalysis" ADD CONSTRAINT "PackagingAnalysis_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertScan" ADD CONSTRAINT "AlertScan_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertScan" ADD CONSTRAINT "AlertScan_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "RewardItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database invariants protect every write path, including future code changes.
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_owner_check" CHECK (("userId" IS NOT NULL)::integer + ("guestHash" IS NOT NULL)::integer = 1);
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_location_check" CHECK ((lat IS NULL AND lng IS NULL) OR ("locationConsent" AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180));
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_coordinates_paired" CHECK ((lat IS NULL) = (lng IS NULL));
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_risk_check" CHECK ("riskScore" BETWEEN 0 AND 100);
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_accuracy_check" CHECK ("accuracyM" IS NULL OR "accuracyM" >= 0);
ALTER TABLE "RewardItem" ADD CONSTRAINT "RewardItem_cost_check" CHECK ("pointsCost" > 0);
ALTER TABLE "RewardItem" ADD CONSTRAINT "RewardItem_stock_check" CHECK (stock IS NULL OR stock >= 0);
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_nonzero_check" CHECK (points <> 0);
ALTER TABLE "PackagingAnalysis" ADD CONSTRAINT "Analysis_score_check" CHECK ("authenticityScore" BETWEEN 0 AND 100 AND confidence BETWEEN 0 AND 1);
CREATE INDEX "Scan_geography_idx" ON "Scan" USING GIST ((ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography)) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX "Alert_geography_idx" ON "Alert" USING GIST ((ST_SetSRID(ST_MakePoint("centerLng","centerLat"),4326)::geography));

CREATE SCHEMA IF NOT EXISTS shelfwatch_private;
REVOKE ALL ON SCHEMA shelfwatch_private FROM PUBLIC;
GRANT USAGE ON SCHEMA shelfwatch_private TO authenticated;
CREATE OR REPLACE FUNCTION shelfwatch_private.shelfwatch_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public."User" WHERE id = (select auth.uid()) AND role IN ('ADMIN', 'SUPER_ADMIN'));
$$;
REVOKE ALL ON FUNCTION shelfwatch_private.shelfwatch_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION shelfwatch_private.shelfwatch_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION shelfwatch_private.shelfwatch_ledger_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Reward ledger is append-only; create an adjustment entry instead'; END;
$$;
REVOKE ALL ON FUNCTION shelfwatch_private.shelfwatch_ledger_immutable() FROM PUBLIC;
CREATE TRIGGER reward_ledger_append_only BEFORE UPDATE OR DELETE ON "RewardTransaction" FOR EACH ROW EXECUTE FUNCTION shelfwatch_private.shelfwatch_ledger_immutable();
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "User" FROM anon, authenticated;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Product" FROM anon, authenticated;
ALTER TABLE "IssuedCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "IssuedCode" FROM anon, authenticated;
ALTER TABLE "Scan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Scan" FROM anon, authenticated;
ALTER TABLE "PackagingAnalysis" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PackagingAnalysis" FROM anon, authenticated;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Report" FROM anon, authenticated;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Alert" FROM anon, authenticated;
ALTER TABLE "AlertScan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AlertScan" FROM anon, authenticated;
ALTER TABLE "RewardClaim" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RewardClaim" FROM anon, authenticated;
ALTER TABLE "RewardTransaction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RewardTransaction" FROM anon, authenticated;
ALTER TABLE "RewardItem" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RewardItem" FROM anon, authenticated;
ALTER TABLE "Redemption" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Redemption" FROM anon, authenticated;
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "Setting" FROM anon, authenticated;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AuditEvent" FROM anon, authenticated;
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "RateLimit" FROM anon, authenticated;

GRANT SELECT ON "User", "Product", "Scan", "PackagingAnalysis", "Alert", "AlertScan", "RewardTransaction", "RewardItem", "Redemption" TO authenticated;
CREATE POLICY user_own_read ON "User" FOR SELECT TO authenticated USING (id = (select auth.uid()) OR (select shelfwatch_private.shelfwatch_is_admin()));
CREATE POLICY product_admin_read ON "Product" FOR SELECT TO authenticated USING ((select shelfwatch_private.shelfwatch_is_admin()));
CREATE POLICY scan_owner_admin_read ON "Scan" FOR SELECT TO authenticated USING ("userId" = (select auth.uid()) OR (select shelfwatch_private.shelfwatch_is_admin()));
CREATE POLICY analysis_owner_admin_read ON "PackagingAnalysis" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM "Scan" s WHERE s.id = "scanId" AND (s."userId" = (select auth.uid()) OR (select shelfwatch_private.shelfwatch_is_admin()))));
CREATE POLICY alert_admin_read ON "Alert" FOR SELECT TO authenticated USING ((select shelfwatch_private.shelfwatch_is_admin()));
CREATE POLICY alert_members_admin_read ON "AlertScan" FOR SELECT TO authenticated USING ((select shelfwatch_private.shelfwatch_is_admin()));
CREATE POLICY reward_ledger_owner_read ON "RewardTransaction" FOR SELECT TO authenticated USING ("userId" = (select auth.uid()) OR (select shelfwatch_private.shelfwatch_is_admin()));
CREATE POLICY reward_catalog_read ON "RewardItem" FOR SELECT TO authenticated USING (active OR (select shelfwatch_private.shelfwatch_is_admin()));
CREATE POLICY redemption_owner_read ON "Redemption" FOR SELECT TO authenticated USING ("userId" = (select auth.uid()) OR (select shelfwatch_private.shelfwatch_is_admin()));
-- There are deliberately no browser INSERT/UPDATE/DELETE policies. Mutations use authorized server routes.

-- Private bucket. The service role uploads and creates five-minute signed URLs after owner checks.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('shelfwatch-photos','shelfwatch-photos',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- This restrictive guard prevents unrelated broad policies from exposing this bucket.
CREATE POLICY shelfwatch_private_bucket_guard ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (bucket_id <> 'shelfwatch-photos') WITH CHECK (bucket_id <> 'shelfwatch-photos');

DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['Scan','Alert','AlertScan'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',table_name);
      END IF;
    END LOOP;
  END IF;
END $$;
