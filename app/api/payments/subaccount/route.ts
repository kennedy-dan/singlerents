import { z } from "zod";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/auth";
import { bad, unauthorized } from "../../../../lib/http";
import { NextResponse } from "next/server";

const inputSchema = z.object({
  businessName: z.string().min(2).max(100),
  accountNumber: z
    .string()
    .regex(/^\d{10}$/, "Enter a valid 10-digit Nigerian account number."),
  bankCode: z.string().min(2).max(10),
});

export async function POST(req) {
  try {
    const user = await requireUser();
    if (user.role !== "LANDLORD") return unauthorized();
    const input = inputSchema.parse(await req.json());
    const response = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: input.businessName,
        account_number: input.accountNumber,
        bank_code: input.bankCode,
        currency: "NGN",
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.status)
      return bad(result.message || "Unable to set up your payout account.");
    await db.user.update({
      where: { id: user.sub },
      data: { paystackTransferRecipientCode: result.data.recipient_code },
    });
    return NextResponse.json({ recipientCode: result.data.recipient_code });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") return unauthorized();
    return bad(
      error.issues?.[0]?.message || "Unable to set up your payout account.",
    );
  }
}
