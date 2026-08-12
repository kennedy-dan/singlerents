import { z } from "zod";
import { db } from "../../../../lib/db";
import { bad } from "../../../../lib/http";
import { createEmailVerificationToken, sendVerificationEmail } from "../../../../lib/email-verification";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.emailVerifiedAt) return NextResponse.json({ message: "If an unconfirmed account exists, a new email has been sent." });
    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail({ email: user.email, name: user.name, token, origin: new URL(req.url).origin });
    return NextResponse.json({ message: "A new confirmation email has been sent." });
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    return bad("We could not send the confirmation email. Please try again.");
  }
}
