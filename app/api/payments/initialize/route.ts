import { z } from "zod";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { bad, unauthorized } from "../../../../lib/http";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
const request = (body) =>
  fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

export async function POST(req) {
  try {
    const user = await requireUser();
    const callbackUrl = `${new URL(req.url).origin}/payment/complete`;
    const input = z
      .object({
        kind: z.enum(["RENTAL", "SUBSCRIPTION"]),
        bookingId: z.string().optional(),
        amount: z.number().int().positive().optional(),
        plan: z.enum(["PRO", "ENTERPRISE"]).optional(),
      })
      .parse(await req.json());

    if (input.kind === "SUBSCRIPTION") {
      if (user.role !== "LANDLORD" || !input.plan)
        return bad("Only landlords can start a subscription.");
      const planCode = process.env[`PAYSTACK_${input.plan}_PLAN_CODE`];
      if (!planCode)
        return bad(`The ${input.plan} Paystack plan is not configured.`);
      const reference = `sub_${Date.now()}_${user.sub}`;
      const trialEndsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const subscription = await db.subscription.create({
        data: {
          landlordId: user.sub,
          plan: input.plan,
          reference,
          trialEndsAt,
          status: "PENDING",
        },
      });
      console.log("Created subscription:", planCode);
      const paystack = await request({
        email: user.email,
        plan: planCode,
        amount: 0,
        reference,
        callback_url: callbackUrl,
        metadata: {
          kind: "SUBSCRIPTION",
          subscriptionId: subscription.id,
          trialEndsAt: trialEndsAt.toISOString(),
        },
      });
      console.log("Paystack response:", paystack);
      const data = await paystack.json();
      if (!paystack.ok || !data.status)
        return bad(data.message || "Unable to start subscription");
      return NextResponse.json({
        reference,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        trialEndsAt,
      });
    }
    if (!input.bookingId) return bad("A booking is required.");
    const booking = await db.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        listing: {
          include: { landlord: { select: { paystackSubaccountCode: true } } },
        },
      },
    });
    if (!booking) return bad("Booking not found.");
    if (booking.tenantId !== user.sub) return unauthorized();
    if (booking.status !== "CONFIRMED")
      return bad("The landlord must confirm this tenancy before payment.");
    if (!booking.listing.landlord.paystackSubaccountCode)
      return bad("This landlord has not completed their Paystack payout setup yet.");
    const existingPayment = await db.payment.findUnique({
      where: { bookingId: booking.id },
      select: { status: true },
    });
    if (existingPayment?.status === "SUCCESS")
      return bad("This rent has already been paid.");
    if (existingPayment)
      return bad("A payment is already awaiting confirmation. Check your payment status before trying again.");
    const rentNaira = booking.leaseAmount || booking.listing.price;
    const amount = rentNaira * 100;
    const agencyFee = Math.round(amount * 0.03);
    const reference = `sr_${Date.now()}_${user.sub}`;
    await db.payment.create({
      data: {
        reference,
        amount,
        agencyFee,
        bookingId: booking.id,
        payerId: user.sub,
        kind: input.kind,
      },
    });
    const payload: Record<string, any> = {
      email: user.email,
      // The tenant pays the advertised rent. Paystack sends 3% to the platform
      // and settles the remaining 97% to the landlord's subaccount.
      amount,
      currency: "NGN",
      reference,
      callback_url: callbackUrl,
      metadata: { kind: input.kind, bookingId: booking.id, agencyFee, landlordShare: amount - agencyFee },
    };
    payload.subaccount = booking.listing.landlord.paystackSubaccountCode;
    payload.transaction_charge = agencyFee;
    const paystack = await request(payload);
    const data = await paystack.json();
    if (!paystack.ok || !data.status) {
      await db.payment.delete({ where: { reference } });
      return bad(data.message || "Unable to start payment");
    }
    return NextResponse.json({
      accessCode: data.data.access_code,
      authorizationUrl: data.data.authorization_url,
      reference,
      agencyFee,
    });
  } catch (e) {
    console.error("Payment initialization error:", e);
    return e.message === "UNAUTHORIZED"
      ? unauthorized()
      : bad("Invalid payment request");
  }
}
