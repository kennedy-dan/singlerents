import { z } from "zod";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { bad, unauthorized } from "../../../../lib/http";
import { NextResponse } from "next/server";
import {
  paidSubscription,
  photoLimitForPlan,
} from "../../../../lib/entitlements";
const schema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  price: z.coerce.number().int().positive().optional(),
  location: z
    .string()
    .min(10, "Please provide the full street address.")
    .optional(),
  type: z.string().min(2).optional(),
  amenities: z.array(z.string()).optional(),
  photos: z.array(z.string().url()).min(1).optional(),
  availability: z
    .object({ blockedDates: z.array(z.string().date()).default([]) })
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"]).optional(),
});
export async function PATCH(req, { params }) {
  try {
    const u = await requireUser();
    if (u.role !== "LANDLORD") return unauthorized();
    const { id } = await params;
    const owned = await db.listing.findFirst({
      where: { id, landlordId: u.sub },
    });
    if (!owned) return unauthorized();
    const body = await req.json();
    console.log("PATCH /listing body:", body); // 👈 raw payload
    console.log("current status:", owned.status, "-> requested:", body.status);

    const data = schema.parse(body);
    if (data.photos) {
      const plan = await paidSubscription(u.sub);
      const limit = photoLimitForPlan(plan?.plan);
      if (data.photos.length > limit)
        return bad(
          `${plan?.plan === "ENTERPRISE" ? "Enterprise" : plan?.plan === "PRO" ? "Pro" : "Your free listing"} allows up to ${limit} photo${limit === 1 ? "" : "s"} per room.`,
        );
    }
    const listing = await db.listing.update({
      where: { id },
      data,
    });
    return NextResponse.json({ listing });
  } catch {
    return bad("Unable to update listing");
  }
}
export async function GET(req, { params }) {
  try {
    const u = await requireUser();
    if (u.role !== "LANDLORD") return unauthorized();
    const { id } = await params;
    const listing = await db.listing.findFirst({
      where: { id, landlordId: u.sub },
    });
    if (!listing) return unauthorized();
    return NextResponse.json({ listing });
  } catch {
    return unauthorized();
  }
}
