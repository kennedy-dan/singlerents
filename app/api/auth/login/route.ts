import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { issue } from "../../../../lib/auth";
import { bad } from "../../../../lib/http";
import { NextResponse } from "next/server";
export async function POST(req) {
  try {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(await req.json());
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      return bad("Invalid email or password");
    if (!user.emailVerifiedAt)
      return NextResponse.json(
        {
          error: "Please confirm your email before logging in.",
          needsEmailConfirmation: true,
        },
        { status: 403 },
      );
    if (!user.isActive)
      return NextResponse.json(
        {
          error:
            "This account is currently unavailable. Please contact support.",
        },
        { status: 403 },
      );
    const token = await issue(user);
    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
    res.cookies.set("singlerents_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800,
      path: "/",
    });
    return res;
  } catch {
    return bad("Invalid login details");
  }
}
