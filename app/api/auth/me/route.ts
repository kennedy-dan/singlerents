import { current } from "../../../../lib/auth";
import { db } from "../../../../lib/db";
import { unauthorized } from "../../../../lib/http";
import { NextResponse } from "next/server";
export async function GET() {
  const s = await current();
  if (!s) return unauthorized();
  const u = await db.user.findUnique({
    where: { id: s.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      emailVerifiedAt: true,
      phoneVerifiedAt: true,
      paystackSubaccountCode: true,
    },
  });
  return NextResponse.json({ user: u });
}
