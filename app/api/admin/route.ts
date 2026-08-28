import { z } from "zod";
import { requireAdmin } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { bad, unauthorized } from "../../../lib/http";
import { NextResponse } from "next/server";

// Paystack amounts are stored in kobo; the admin dashboard displays naira.
const toNaira = (amount: number) => amount / 100;

const userAction = z.object({
  type: z.literal("user"),
  id: z.string(),
  isActive: z.boolean().optional(),
  role: z.enum(["TENANT", "LANDLORD", "ADMIN"]).optional(),
});
const listingAction = z.object({
  type: z.literal("listing"),
  id: z.string(),
  status: z.enum([
    "DRAFT",
    "PENDING_PAYMENT",
    "PUBLISHED",
    "PAUSED",
    "ARCHIVED",
  ]),
});
const payoutAction = z.object({ type: z.literal("payout"), id: z.string() });

export async function GET() {
  try {
    await requireAdmin();
    const [users, listings, bookings, payments, subscriptions, counts] =
      await Promise.all([
        db.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.listing.findMany({
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            location: true,
            createdAt: true,
            landlord: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.booking.findMany({
          select: {
            id: true,
            status: true,
            createdAt: true,
            listing: { select: { title: true } },
            tenant: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        db.payment.findMany({
          select: {
            id: true,
            kind: true,
            amount: true,
            agencyFee: true,
            landlordShare: true,
            status: true,
            payoutStatus: true,
            releasedAt: true,
            reference: true,
            createdAt: true,
            payer: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        db.subscription.findMany({
          select: {
            id: true,
            plan: true,
            status: true,
            endsAt: true,
            startsAt: true,
            landlord: { select: { name: true, email: true } },
          },
          orderBy: { startsAt: "desc" },
          take: 50,
        }),
        Promise.all([
          db.user.count(),
          db.listing.count(),
          db.booking.count(),
          db.payment.aggregate({
            _sum: { amount: true, agencyFee: true },
            where: { status: "SUCCESS" },
          }),
        ]),
      ]);
    return NextResponse.json({
      users,
      listings,
      bookings,
      payments: payments.map((payment) => ({
        ...payment,
        amount: toNaira(payment.amount),
        agencyFee: toNaira(payment.agencyFee),
        landlordShare: toNaira(payment.landlordShare),
      })),
      subscriptions,
      metrics: {
        users: counts[0],
        listings: counts[1],
        bookings: counts[2],
        completedPaymentVolume: toNaira(counts[3]._sum.amount || 0),
        platformFees: toNaira(counts[3]._sum.agencyFee || 0),
      },
    });
  } catch (error) {
    console.error("Admin GET error:", error);
    return unauthorized();
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const action = z
      .union([userAction, listingAction, payoutAction])
      .parse(await request.json());
    if (action.type === "user") {
      if (action.id === admin.sub && action.isActive === false)
        return bad("You cannot deactivate your own administrator account.");
      if (action.id === admin.sub && action.role && action.role !== "ADMIN")
        return bad("You cannot remove your own administrator role.");
      const user = await db.user.update({
        where: { id: action.id },
        data: {
          ...(action.isActive !== undefined
            ? { isActive: action.isActive }
            : {}),
          ...(action.role ? { role: action.role } : {}),
        },
        select: { id: true },
      });
      return NextResponse.json({ user });
    }
    if (action.type === "listing") {
      const listing = await db.listing.update({
        where: { id: action.id },
        data: { status: action.status },
        select: { id: true },
      });
      return NextResponse.json({ listing });
    }

    const payment = await db.payment.findUnique({
      where: { id: action.id },
      include: {
        booking: {
          include: {
            listing: {
              include: {
                landlord: { select: { paystackTransferRecipientCode: true } },
              },
            },
          },
        },
      },
    });
    if (!payment || payment.kind !== "RENTAL" || payment.status !== "SUCCESS")
      return bad("Only successful rental payments can be released.");
    if (!payment.booking?.listing.landlord.paystackTransferRecipientCode)
      return bad("The landlord has not connected a bank account for payouts.");
    if (!["HELD", "FAILED"].includes(payment.payoutStatus))
      return bad("This landlord payout has already been submitted.");

    const payoutReference = `payout_${payment.id}_${Date.now()}`;
    const locked = await db.payment.updateMany({
      where: { id: payment.id, payoutStatus: { in: ["HELD", "FAILED"] } },
      data: { payoutStatus: "PROCESSING", payoutReference },
    });
    if (!locked.count)
      return bad("This landlord payout is already being processed.");
    try {
      const response = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: payment.landlordShare,
          recipient:
            payment.booking.listing.landlord.paystackTransferRecipientCode,
          reference: payoutReference,
          reason: `97% rent payout for ${payment.reference}`,
        }),
      });
      const result = await response.json();
      console.log("Paystack transfer response:", result);
      if (!response.ok || !result.status) {
        await db.payment.update({
          where: { id: payment.id },
          data: { payoutStatus: "FAILED" },
        });
        return bad(result.message || "Unable to submit landlord payout.");
      }
      return NextResponse.json({
        payout: { id: payment.id, status: "PROCESSING" },
      });
    } catch (error) {
      await db.payment.update({
        where: { id: payment.id },
        data: { payoutStatus: "FAILED" },
      });
      throw error;
    }
  } catch (error) {
    console.error("Admin update error:", error);
    return bad("Unable to apply the admin update.");
  }
}
