-- A paid landlord should never retain the free-listing trial expiry.
UPDATE "Subscription"
SET "trialEndsAt" = NULL
WHERE "status" = 'SUCCESS';

UPDATE "Listing" AS listing
SET
  "status" = 'PUBLISHED',
  "trialEndsAt" = NULL
WHERE listing."trialEndsAt" IS NOT NULL
  AND listing."status" IN ('PUBLISHED', 'ARCHIVED')
  AND EXISTS (
    SELECT 1
    FROM "Subscription" AS subscription
    WHERE subscription."landlordId" = listing."landlordId"
      AND subscription."status" = 'SUCCESS'
      AND (subscription."endsAt" IS NULL OR subscription."endsAt" > NOW())
  );
