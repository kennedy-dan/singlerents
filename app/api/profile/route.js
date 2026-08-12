import { z } from "zod";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { bad, unauthorized } from "../../../lib/http";
import { NextResponse } from "next/server";

const schema = z.object({ name: z.string().min(2).max(100), phone: z.string().min(7).max(30).nullable().optional() });

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await db.user.findUnique({ where: { id: user.sub }, select: { id: true, name: true, email: true, phone: true, role: true, emailVerifiedAt: true, bookings: { include: { listing: { select: { title: true, location: true } }, payment: { select: { status: true, amount: true } } }, orderBy: { createdAt: "desc" } }, listings: { include: { bookings: { select: { status: true } } }, orderBy: { createdAt: "desc" } } } });
    return NextResponse.json({ profile });
  } catch { return unauthorized(); }
}

export async function PATCH(req) {
  try {
    const user = await requireUser();
    const profile = await db.user.update({ where: { id: user.sub }, data: schema.parse(await req.json()), select: { id: true, name: true, email: true, phone: true, role: true } });
    return NextResponse.json({ profile });
  } catch (error) { return error.message === "UNAUTHORIZED" ? unauthorized() : bad("Enter a valid name and phone number."); }
}
