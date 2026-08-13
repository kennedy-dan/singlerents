import { z } from "zod";
import { requireAdmin } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { bad, unauthorized } from "../../../lib/http";
import { NextResponse } from "next/server";

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
            status: true,
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
      payments,
      subscriptions,
      metrics: {
        users: counts[0],
        listings: counts[1],
        bookings: counts[2],
        completedPaymentVolume: counts[3]._sum.amount || 0,
        platformFees: counts[3]._sum.agencyFee || 0,
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
      .union([userAction, listingAction])
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
    const listing = await db.listing.update({
      where: { id: action.id },
      data: { status: action.status },
      select: { id: true },
    });
    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Admin update error:", error);
    return bad("Unable to apply the admin update.");
  }
}
