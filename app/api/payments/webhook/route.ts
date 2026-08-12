import { createHmac } from 'node:crypto';
import { db } from '../../../../lib/db';
import { sendEmail, emailParagraph } from '../../../../lib/email';
export const runtime = 'nodejs';
export async function POST(req) {
  const raw = await req.text(), signature = req.headers.get('x-paystack-signature') || '';
  const hash = createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '').update(raw).digest('hex');
  if (hash !== signature) return new Response('Invalid signature', { status: 401 });
  const event = JSON.parse(raw), data = event.data || {}, reference = data.reference;
  if (event.event === 'charge.success' && reference) {
    const payment = await db.payment.findUnique({ where: { reference } });
    if (!payment) {
      const subscription = await db.subscription.findFirst({ where: { reference } });
      if (subscription) await db.subscription.update({ where: { id: subscription.id }, data: { status: 'SUCCESS', startsAt: new Date(), paystackSubscriptionCode: data.subscription_code || undefined, paystackEmailToken: data.email_token || undefined } });
      return new Response('ok');
    }
    await db.payment.update({ where: { reference }, data: { status: 'SUCCESS' } });
    if (payment.kind === 'LISTING' && payment.listingId) await db.listing.update({ where: { id: payment.listingId }, data: { status: 'PUBLISHED' } });
    if (payment.bookingId) { const booking = await db.booking.update({ where: { id: payment.bookingId }, data: { status: payment.kind === 'RENTAL' ? 'COMPLETED' : 'CONFIRMED' }, include: { listing: { select: { title: true, landlord: { select: { email: true } } } } } }); if (payment.kind === 'RENTAL') void sendEmail({ to: booking.listing.landlord.email, subject: 'Rent payment received on SingleRents', text: `The payment for ${booking.listing.title} was successful.`, html: emailParagraph(`The payment for ${booking.listing.title} was successful.`) }); }
    if (payment.kind === 'SUBSCRIPTION') await db.subscription.updateMany({ where: { reference }, data: { status: 'SUCCESS', startsAt: new Date(), paystackSubscriptionCode: data.subscription_code || undefined, paystackEmailToken: data.email_token || undefined } });
  }
  if (event.event === 'invoice.payment_failed') await db.subscription.updateMany({ where: { paystackSubscriptionCode: data.subscription?.subscription_code || data.subscription_code }, data: { status: 'FAILED', dunningAttempts: { increment: 1 } } });
  if (event.event === 'invoice.create') await db.subscription.updateMany({ where: { paystackSubscriptionCode: data.subscription?.subscription_code || data.subscription_code }, data: { status: 'SUCCESS', dunningAttempts: 0 } });
  return new Response('ok');
}
