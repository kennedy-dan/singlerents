import { requireUser } from "../../../../lib/auth";
import { bad, unauthorized } from "../../../../lib/http";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "LANDLORD") return unauthorized();

    const response = await fetch("https://api.paystack.co/bank?country=nigeria", {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.status) {
      return bad(result.message || "Unable to load banks from Paystack.");
    }

    const banks = result.data
      .filter((bank) => bank.active !== false && bank.is_deleted !== true)
      .map(({ name, code }) => ({ name, code }));

    return NextResponse.json({ banks });
  } catch (error) {
    if (error.message === "UNAUTHORIZED") return unauthorized();
    return bad("Unable to load banks from Paystack.");
  }
}
