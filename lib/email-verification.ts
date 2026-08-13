import { createHash, randomBytes } from "crypto";
import { db } from "./db";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export async function createEmailVerificationToken(userId) {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.emailVerificationToken.deleteMany({ where: { userId } }),
    db.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);
  return token;
}

export function applicationUrl(requestOrigin?: string) {
  const configuredUrl = process.env.APP_URL;
  if (configuredUrl) return configuredUrl;

  // Vercel supplies this hostname automatically. APP_URL should still be set
  // to the canonical production domain so emails never point at a preview.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (requestOrigin) return requestOrigin;
  throw new Error("APP_URL is required to send verification emails.");
}

export async function sendVerificationEmail({
  email,
  name,
  token,
  origin,
}: {
  email: string;
  name: string;
  token: string;
  origin?: string;
}) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("SendGrid email service is not configured");
  }

  const confirmUrl = new URL("/verify-email", applicationUrl(origin));
  confirmUrl.searchParams.set("token", token);
  const confirmationLink = confirmUrl.toString();
  const safeConfirmationLink = escapeHtml(confirmationLink);
  const safeName = escapeHtml(name);

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: from, name: process.env.EMAIL_FROM_NAME || "SingleRents" },
      subject: "Confirm your SingleRents email",
      content: [
        {
          type: "text/plain",
          value: `Hi ${name},\n\nConfirm your email address to finish creating your SingleRents account:\n${confirmationLink}\n\nThis link expires in 24 hours.`,
        },
        {
          type: "text/html",
          value: `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f2;font-family:Arial,sans-serif;color:#12352b;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffefa;border:1px solid #e2e7df;border-radius:14px;overflow:hidden;"><tr><td style="padding:26px 32px;background:#12352b;color:#fffefa;"><div style="font-size:23px;font-weight:700;letter-spacing:-.5px;">⌂ singlerents</div><div style="margin-top:5px;font-size:11px;letter-spacing:1.2px;color:#f5c8b9;">ROOMS THAT FEEL LIKE HOME</div></td></tr><tr><td style="padding:34px 32px;"><div style="font-size:12px;font-weight:bold;letter-spacing:1.1px;color:#d85e41;">WELCOME TO SINGLERENTS</div><h1 style="margin:12px 0;font-size:29px;line-height:1.2;color:#12352b;">Confirm your email address</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#536961;">Hi ${safeName}, confirm your email to finish creating your account and start finding or listing a room.</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#e76f51" style="border-radius:8px;"><a href="${safeConfirmationLink}" style="display:inline-block;padding:13px 20px;color:#fff;font-size:16px;font-weight:bold;line-height:20px;text-decoration:none;">Confirm my email →</a></td></tr></table><p style="margin:26px 0 0;font-size:13px;line-height:1.55;color:#718078;">This secure link expires in 24 hours. If you did not create a SingleRents account, you can safely ignore this email.</p><div style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e2e7df;font-size:12px;line-height:1.5;color:#718078;">Button not working? Copy and paste this link into your browser:<br><a href="${safeConfirmationLink}" style="color:#d85e41;word-break:break-all;">${safeConfirmationLink}</a></div></td></tr><tr><td style="padding:20px 32px;background:#eef3eb;color:#536961;font-size:12px;">SingleRents · Verified rooms for renters in Lagos</td></tr></table></td></tr></table></body></html>`,
        },
      ],
    }),
  });

  if (!response.ok)
    throw new Error("Unable to send verification email through SendGrid");
}

export async function verifyEmailToken(token) {
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.expiresAt <= new Date()) {
    if (record)
      await db.emailVerificationToken.delete({ where: { id: record.id } });
    return null;
  }
  const user = await db.$transaction(async (tx) => {
    const verified = await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await tx.emailVerificationToken.deleteMany({
      where: { userId: record.userId },
    });
    return verified;
  });
  return user;
}

function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char],
  );
}
