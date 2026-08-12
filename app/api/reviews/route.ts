import { z } from "zod";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { bad, unauthorized } from "../../../lib/http";
import { NextResponse } from "next/server";
export async function POST(req) {
  try {
    const user = await requireUser();
    if (user.role !== "TENANT") return unauthorized();
    const input = z
      .object({
        listingId: z.string(),
        rating: z.number().min(1).max(5).multipleOf(0.5),
        comment: z.string().min(4).max(1000),
      })
      .parse(await req.json());
    const listing = await db.listing.findUnique({
      where: { id: input.listingId },
    });
    if (!listing) return bad("Listing not found");
    const paidRental = await db.booking.findFirst({
      where: {
        listingId: input.listingId,
        tenantId: user.sub,
        payment: { is: { status: "SUCCESS", kind: "RENTAL" } },
      },
    });
    if (!paidRental)
      return bad("Reviews are available after your rental payment is successful.");
    const prior = await db.review.findFirst({
      where: { listingId: input.listingId, authorId: user.sub },
    });
    if (prior) return bad("You have already reviewed this room");
    return NextResponse.json(
      {
        review: await db.review.create({
          data: { ...input, authorId: user.sub },
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return error.message === "UNAUTHORIZED"
      ? unauthorized()
      : bad("Invalid review");
  }
}
