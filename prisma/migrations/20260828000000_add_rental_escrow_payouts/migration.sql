CREATE TYPE "PayoutStatus" AS ENUM ('HELD', 'PROCESSING', 'RELEASED', 'FAILED');

ALTER TABLE "User"
ADD COLUMN "paystackTransferRecipientCode" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "landlordShare" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'HELD',
ADD COLUMN "payoutReference" TEXT,
ADD COLUMN "releasedAt" TIMESTAMP(3);

UPDATE "Payment"
SET "landlordShare" = "amount" - "agencyFee"
WHERE "kind" = 'RENTAL';

CREATE UNIQUE INDEX "Payment_payoutReference_key" ON "Payment"("payoutReference");
