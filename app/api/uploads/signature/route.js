import { createHash } from "node:crypto";
import { requireUser } from "../../../../lib/auth";
import { unauthorized } from "../../../../lib/http";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await requireUser();
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "singlerents/listings";
    const secret = process.env.CLOUDINARY_API_SECRET;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    if (!secret || !cloudName || !apiKey) return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
    const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    return NextResponse.json({ signature, timestamp, folder, cloudName, apiKey });
  } catch (error) {
    return error.message === "UNAUTHORIZED" ? unauthorized() : NextResponse.json({ error: "Unable to prepare upload." }, { status: 500 });
  }
}
