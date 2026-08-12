ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
CREATE TYPE "PaymentKind" AS ENUM ('LISTING', 'RENTAL', 'SUCCESS_FEE', 'SUBSCRIPTION');
ALTER TABLE "User" ADD COLUMN "paystackSubaccountCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN "matchedAt" TIMESTAMP(3), ADD COLUMN "leaseAmount" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "listingId" TEXT, ADD COLUMN "payerId" TEXT, ADD COLUMN "kind" "PaymentKind" NOT NULL DEFAULT 'RENTAL';
ALTER TABLE "Subscription" ADD COLUMN "trialEndsAt" TIMESTAMP(3), ADD COLUMN "paystackSubscriptionCode" TEXT, ADD COLUMN "paystackEmailToken" TEXT, ADD COLUMN "dunningAttempts" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "Subscription_paystackSubscriptionCode_key" ON "Subscription"("paystackSubscriptionCode");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
