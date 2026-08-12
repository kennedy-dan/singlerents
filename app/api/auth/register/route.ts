import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../../../../lib/db";
import { bad } from "../../../../lib/http";
import { createEmailVerificationToken, sendVerificationEmail } from "../../../../lib/email-verification";
import { NextResponse } from "next/server";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["TENANT", "LANDLORD"]),
  phone: z.string().min(7).optional(),
});

export async function POST(req) {
  try {
    const input = schema.parse(await req.json());
    const email = input.email.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) return bad("Email already registered");

    const user = await db.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        role: input.role,
        passwordHash: await bcrypt.hash(input.password, 12),
      },
    });
    try {
      const token = await createEmailVerificationToken(user.id);
      await sendVerificationEmail({ email: user.email, name: user.name, token, origin: new URL(req.url).origin });
    } catch (error) {
      await db.user.delete({ where: { id: user.id } });
      console.error("Failed to send verification email:", error);
      return NextResponse.json({ error: "We could not send the confirmation email. Please try again." }, { status: 503 });
    }

    return NextResponse.json({ message: "Check your email to confirm your account." }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return bad("Invalid registration details");
  }
}
