import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { unauthorized } from "../../../lib/http";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await db.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return NextResponse.json({
      notifications,
      unread: notifications.filter((n) => !n.readAt).length,
    });
  } catch {
    return unauthorized();
  }
}
export async function PATCH() {
  try {
    const user = await requireUser();
    await db.notification.updateMany({
      where: { userId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return unauthorized();
  }
}
