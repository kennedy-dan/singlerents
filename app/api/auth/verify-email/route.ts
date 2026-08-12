import { z } from "zod";
import { issue } from "../../../../lib/auth";
import { verifyEmailToken } from "../../../../lib/email-verification";
import { bad } from "../../../../lib/http";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { token } = z
      .object({ token: z.string().min(20) })
      .parse(await req.json());
    const user = await verifyEmailToken(token);
    if (!user) return bad("This confirmation link is invalid or has expired.");

    const session = await issue(user);
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
    response.cookies.set("singlerents_session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800,
      path: "/",
    });
    return response;
  } catch {
    return bad("This confirmation link is invalid or has expired.");
  }
}
