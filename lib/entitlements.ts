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
  const now = new Date();
  await db.listing.updateMany({
    where: {
      status: "PUBLISHED",
      trialEndsAt: { lt: now },
      landlord: {
        subscriptions: {
          none: {
            status: "SUCCESS",
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
          },
        },
      },
    },
    data: { status: "ARCHIVED" },
  });
}

export async function activatePaidSubscription(
  reference: string,
  paystackSubscriptionCode?: string,
  paystackEmailToken?: string,
) {
  const subscription = await db.subscription.findFirst({ where: { reference } });
  if (!subscription) return null;

  return db.$transaction(async (tx) => {
    const activeSubscription = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "SUCCESS",
        startsAt: subscription.startsAt || new Date(),
        // A paid plan does not inherit the old two-day listing trial.
        trialEndsAt: null,
        paystackSubscriptionCode: paystackSubscriptionCode || undefined,
        paystackEmailToken: paystackEmailToken || undefined,
      },
    });
    await tx.listing.updateMany({
      where: {
        landlordId: subscription.landlordId,
        trialEndsAt: { not: null },
        status: { in: ["PUBLISHED", "ARCHIVED"] },
      },
      data: { status: "PUBLISHED", trialEndsAt: null },
    });
    return activeSubscription;
  });
}
