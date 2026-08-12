import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { unauthorized } from "../../../../lib/http";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "LANDLORD") return unauthorized();

    const payments = await db.payment.findMany({
      where: {
        status: "SUCCESS",
        kind: "RENTAL",
        booking: { is: { listing: { landlordId: user.sub } } },
      },
      select: {
        amount: true,
        agencyFee: true,
        createdAt: true,
        booking: { select: { listing: { select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    const totalRent = payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const platformFees = payments.reduce(
      (sum, payment) => sum + payment.agencyFee,
      0,
    );
    return NextResponse.json({
      totalRent,
      platformFees,
      landlordBalance: totalRent - platformFees,
      payments,
    });
  } catch (error) {
    return error.message === "UNAUTHORIZED" ? unauthorized() : unauthorized();
  }
}
