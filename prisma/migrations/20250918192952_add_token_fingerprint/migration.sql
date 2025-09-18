-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "tokenFingerprint" VARCHAR(64);

-- CreateIndex
CREATE INDEX "RefreshToken_tokenFingerprint_idx" ON "RefreshToken"("tokenFingerprint");
