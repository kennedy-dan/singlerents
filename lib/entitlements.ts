import { db } from "./db";

export async function paidSubscription(landlordId) {
  return db.subscription.findFirst({
    where: {
      landlordId,
      status: "SUCCESS",
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    orderBy: { startsAt: "desc" },
  });
}

export function photoLimitForPlan(plan?: string | null) {
  if (plan === "ENTERPRISE") return 5;
  if (plan === "PRO") return 2;
  return 1;
}

export async function expireTrialListings() {
  await db.listing.updateMany({
    where: { status: "PUBLISHED", trialEndsAt: { lt: new Date() } },
    data: { status: "ARCHIVED" },
  });
}
