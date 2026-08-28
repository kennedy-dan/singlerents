import { createHmac } from "node:crypto";
import { db } from "../../../../lib/db";
import { sendEmail, emailParagraph } from "../../../../lib/email";
import { activatePaidSubscription } from "../../../../lib/entitlements";
export const runtime = "nodejs";
export async function POST(req) {
  const raw = await req.text(),
    signature = req.headers.get("x-paystack-signature") || "";
  const hash = createHmac(
    "sha512",
    process.env.PAYSTACK_WEBHOOK_SECRET ||
      process.env.PAYSTACK_SECRET_KEY ||
      "",
  )
    .update(raw)
    .digest("hex");
  if (hash !== signature)
    return new Response("Invalid signature", { status: 401 });
  const event = JSON.parse(raw),
    data = event.data || {},
    reference = data.reference;
  if (event.event === "charge.success" && reference) {
    const payment = await db.payment.findUnique({ where: { reference } });
    if (!payment) {
      const subscription = await db.subscription.findFirst({
        where: { reference },
      });
      if (subscription)
        await activatePaidSubscription(
          reference,
          data.subscription_code,
          data.email_token,
        );
      return new Response("ok");
    }
    await db.payment.update({
      where: { reference },
      data: { status: "SUCCESS" },
    });
    if (payment.kind === "LISTING" && payment.listingId)
      await db.listing.update({
        where: { id: payment.listingId },
        data: { status: "PUBLISHED" },
      });
    if (payment.bookingId) {
      const booking = await db.booking.update({
        where: { id: payment.bookingId },
        data: { status: payment.kind === "RENTAL" ? "COMPLETED" : "CONFIRMED" },
        include: {
          listing: {
            select: { title: true, landlord: { select: { email: true } } },
          },
        },
      });
      if (payment.kind === "RENTAL")
        void sendEmail({
          to: booking.listing.landlord.email,
          subject: "Rent payment received on SingleRents",
          text: `The payment for ${booking.listing.title} was successful and is now held for admin release.`,
          html: emailParagraph(
            `The payment for ${booking.listing.title} was successful and is now held for admin release.`,
          ),
        });
    }
  }
  if (reference && event.event === "transfer.success")
    await db.payment.updateMany({
      where: { payoutReference: reference, payoutStatus: "PROCESSING" },
      data: { payoutStatus: "RELEASED", releasedAt: new Date() },
    });
  if (reference && ["transfer.failed", "transfer.reversed"].includes(event.event))
    await db.payment.updateMany({
      where: { payoutReference: reference, payoutStatus: "PROCESSING" },
      data: { payoutStatus: "FAILED" },
    });
  if (event.event === "invoice.payment_failed")
    await db.subscription.updateMany({
      where: {
        paystackSubscriptionCode:
          data.subscription?.subscription_code || data.subscription_code,
      },
      data: { status: "FAILED", dunningAttempts: { increment: 1 } },
    });
  if (event.event === "invoice.create")
    await db.subscription.updateMany({
      where: {
        paystackSubscriptionCode:
          data.subscription?.subscription_code || data.subscription_code,
      },
      data: { status: "SUCCESS", dunningAttempts: 0 },
    });
  return new Response("ok");
}
