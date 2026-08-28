import { z } from "zod";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { bad, unauthorized } from "../../../lib/http";
import { NextResponse } from "next/server";
import { isDateRangeAvailable } from "../../../lib/availability";
import { sendEmail, emailParagraph } from "../../../lib/email";
export async function GET() {
  try {
    const u = await requireUser();
    const bookings = await db.booking.findMany({
      where:
        u.role === "LANDLORD"
          ? { listing: { landlordId: u.sub } }
          : { tenantId: u.sub },
      include: {
        listing: true,
        tenant: { select: { name: true, email: true } },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            agencyFee: true,
            landlordShare: true,
            payoutStatus: true,
            reference: true,
          },
        },
      },
      orderBy: { startAt: "asc" },
    });
    return NextResponse.json({ bookings });
  } catch {
    return unauthorized();
  }
}
export async function POST(req) {
  try {
    const u = await requireUser();
    if (u.role !== "TENANT") return unauthorized();
    const x = z
      .object({
        listingId: z.string(),
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        note: z.string().max(500).optional(),
      })
      .parse(await req.json());
    const listing = await db.listing.findUnique({
      where: { id: x.listingId },
      include: { landlord: { select: { email: true, name: true } } },
    });
    if (!listing || listing.status !== "PUBLISHED")
      return bad("Listing is not available");
    if (!isDateRangeAvailable(listing.availability, x.startAt, x.endAt))
      return bad("Those dates are blocked by the landlord");
    const clash = await db.booking.findFirst({
      where: {
        listingId: x.listingId,
        status: { in: ["REQUESTED", "CONFIRMED"] },
        startAt: { lt: new Date(x.endAt) },
        endAt: { gt: new Date(x.startAt) },
      },
    });
    if (clash) return bad("That time is no longer available");
    const booking = await db.booking.create({
      data: {
        ...x,
        startAt: new Date(x.startAt),
        endAt: new Date(x.endAt),
        tenantId: u.sub,
      },
      include: { listing: true },
    });
    await db.notification.create({
      data: {
        userId: booking.listing.landlordId,
        type: "BOOKING_REQUEST",
        body: "You have a new viewing request.",
      },
    });
    const { publish } = await import("../../../lib/events");
    void publish(booking.listing.landlordId, "notification", {
      type: "BOOKING_REQUEST",
      body: "You have a new viewing request.",
    }).catch((error) =>
      console.error("Unable to publish booking notification:", error),
    );
    void sendEmail({
      to: listing.landlord.email,
      subject: "New SingleRents viewing request",
      text: `A tenant has requested a viewing for ${listing.title}.`,
      html: emailParagraph(
        `A tenant has requested a viewing for ${listing.title}.`,
      ),
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (e) {
    console.error("Booking request error:", e);
    return bad("Invalid booking request");
  }
}
