import { z } from "zod";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { bad, unauthorized } from "../../../lib/http";
import {
  paidSubscription,
  expireTrialListings,
} from "../../../lib/entitlements";
import { NextResponse } from "next/server";
import { sendEmail, emailParagraph } from "../../../lib/email";
const schema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  price: z.coerce.number().int().positive(),
  location: z.string().min(10, "Please provide the full street address."),
  type: z.string().min(2),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).min(1),
  availability: z.object({ blockedDates: z.array(z.string().date()).default([]) }).default({ blockedDates: [] }),
});
const include = {
  landlord: {
    select: { id: true, name: true, emailVerifiedAt: true, avatarUrl: true },
  },
  reviews: {
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  },
};
export async function GET(req) {
  await expireTrialListings();
  const p = new URL(req.url).searchParams,
    q = p.get("q") || "",
    max = Number(p.get("max") || 999999999),
    type = p.get("type"),
    amenities = p.getAll("amenity").filter(Boolean),
    mine = p.get("mine") === "true";
  let where: any = {
    status: "PUBLISHED",
    price: { lte: max },
    ...(type ? { type } : {}),
    ...(amenities.length ? { amenities: { hasEvery: amenities } } : {}),
    ...(q ? { location: { contains: q, mode: "insensitive" } } : {}),
  };
  try {
    if (mine) {
      const u = await requireUser();
      if (u.role !== "LANDLORD") return unauthorized();
      where = { landlordId: u.sub };
    }
    const listings = await db.listing.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ listings });
  } catch {
    return unauthorized();
  }
}
export async function POST(req) {
  try {
    const user = await requireUser();
    if (user.role !== "LANDLORD") return unauthorized();
    await expireTrialListings();
    const data = schema.parse(await req.json()),
      plan = await paidSubscription(user.sub);
    if (!plan) {
      const prior = await db.listing.count({ where: { landlordId: user.sub } });
      if (prior > 0)
        return NextResponse.json(
          {
            error:
              "Your free 2-day listing has ended. Choose Pro or Enterprise to publish again.",
            redirectTo: "/dashboard/billing",
          },
          { status: 402 },
        );
      if (data.photos.length > 1)
        return bad(
          "Your free listing includes one photo. Pro and Enterprise plans allow multiple photo URLs.",
        );
      const trialEndsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const listing = await db.listing.create({
        data: {
          ...data,
          landlordId: user.sub,
          status: "PUBLISHED",
          trialEndsAt,
        },
      });
      void sendEmail({ to: user.email, subject: "Your SingleRents listing is live", text: `Your listing \"${listing.title}\" is now live until ${trialEndsAt.toLocaleDateString()}.`, html: `${emailParagraph(`Your listing \"${listing.title}\" is now live.`)}${emailParagraph(`It is available until ${trialEndsAt.toLocaleDateString()}.`)}` });
      return NextResponse.json({ listing, trialEndsAt }, { status: 201 });
    }
    const listing = await db.listing.create({
      data: { ...data, landlordId: user.sub, status: "PUBLISHED" },
    });
    void sendEmail({ to: user.email, subject: "Your SingleRents listing is live", text: `Your listing \"${listing.title}\" is now live.`, html: emailParagraph(`Your listing \"${listing.title}\" is now live.`) });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    console.error("Listing creation error:", e);    
    return bad(
      e.message === "UNAUTHORIZED"
        ? "Sign in required"
        : "Please add all required listing details",
    );
  }
}
