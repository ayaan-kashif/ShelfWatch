-- CreateIndex
CREATE INDEX "Scan_productId_idx" ON "Scan"("productId");

-- CreateIndex
CREATE INDEX "AlertScan_scanId_idx" ON "AlertScan"("scanId");

-- CreateIndex
CREATE INDEX "Redemption_rewardId_idx" ON "Redemption"("rewardId");

-- CreateIndex
CREATE INDEX "Redemption_userId_idx" ON "Redemption"("userId");
