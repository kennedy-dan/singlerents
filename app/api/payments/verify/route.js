import { db } from '../../../../lib/db';
import { requireUser } from '../../../../lib/auth';
import { bad, unauthorized } from '../../../../lib/http';
import { NextResponse } from 'next/server';
import { sendEmail, emailParagraph } from '../../../../lib/email';

export async function GET(req) {
  try {
    const user = await requireUser();
    const reference = new URL(req.url).searchParams.get('reference');
    if (!reference) return bad('Payment reference is required.');
    const payment = await db.payment.findUnique({ where: { reference } });
    const subscription = !payment ? await db.subscription.findFirst({ where: { reference, landlordId: user.sub } }) : null;
    if ((payment && payment.payerId !== user.sub) || (!payment && !subscription)) return unauthorized();
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.status || result.data.status !== 'success') return NextResponse.json({ status: 'PENDING' });
    if (payment) {
      await db.payment.update({ where: { reference }, data: { status: 'SUCCESS' } });
      if (payment.kind === 'LISTING' && payment.listingId) await db.listing.update({ where: { id: payment.listingId }, data: { status: 'PUBLISHED' } });
      if (payment.bookingId) { const booking = await db.booking.update({ where: { id: payment.bookingId }, data: { status: payment.kind === 'RENTAL' ? 'COMPLETED' : 'CONFIRMED' }, include: { listing: { select: { title: true, landlord: { select: { email: true } } } } } }); if (payment.kind === 'RENTAL') void sendEmail({ to: booking.listing.landlord.email, subject: 'Rent payment received on SingleRents', text: `The payment for ${booking.listing.title} was successful.`, html: emailParagraph(`The payment for ${booking.listing.title} was successful.`) }); }
    } else if (subscription) await db.subscription.update({ where: { id: subscription.id }, data: { status: 'SUCCESS', startsAt: new Date(), paystackSubscriptionCode: result.data.subscription_code || undefined, paystackEmailToken: result.data.email_token || undefined } });
    return NextResponse.json({ status: 'SUCCESS', kind: payment?.kind || 'SUBSCRIPTION', listingId: payment?.listingId });
  } catch (error) { return error.message === 'UNAUTHORIZED' ? unauthorized() : bad('Unable to verify payment.'); }
}
