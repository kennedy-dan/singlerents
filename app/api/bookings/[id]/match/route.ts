import { z } from "zod";
import { db } from "../../../../../lib/db";
import { requireUser } from "../../../../../lib/auth";
import { bad, unauthorized } from "../../../../../lib/http";
import { sendEmail, emailParagraph } from "../../../../../lib/email";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  try {
    const user = await requireUser();
    if (user.role !== "LANDLORD") return unauthorized();
    const { id } = await params;
    const input = z.object({ leaseAmount: z.number().int().positive() }).parse(await req.json());
    const booking = await db.booking.findFirst({
      where: { id, listing: { landlordId: user.sub } },
      include: { tenant: { select: { email: true } }, listing: { select: { title: true } } },
    });
    if (!booking) return unauthorized();
    const matched = await db.booking.update({ where: { id }, data: { matchedAt: new Date(), leaseAmount: input.leaseAmount, status: "CONFIRMED" } });
    void sendEmail({ to: booking.tenant.email, subject: "Your SingleRents rental was confirmed", text: `The landlord confirmed ${booking.listing.title}. You can now pay the agreed rent.`, html: emailParagraph(`The landlord confirmed ${booking.listing.title}. You can now pay the agreed rent.`) });
    return NextResponse.json({ booking: matched, next: "Tenant can now pay the agreed rent through Paystack." });
  } catch { return bad("Unable to finalize match"); }
}
