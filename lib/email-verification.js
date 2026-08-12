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

export async function sendVerificationEmail({ email, name, token, origin }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("SendGrid email service is not configured");
  }

  const confirmUrl = new URL("/verify-email", origin);
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
          value: `<!doctype html>
<html>
  <body>
    <p>Hi ${safeName},</p>
    <p>Confirm that this is your email address to finish creating your SingleRents account.</p>
    <p>
      <a href="${safeConfirmationLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#eb7556;color:#ffffff;padding:12px 18px;border-radius:5px;font-weight:700;text-decoration:none;">Confirm my email</a>
    </p>
    <p>This link expires in 24 hours.</p>
    <p>If the button does not work, copy and paste this link into your browser:<br><a href="${safeConfirmationLink}">${safeConfirmationLink}</a></p>
  </body>
</html>`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error("Unable to send verification email through SendGrid");
}


export async function verifyEmailToken(token) {
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!record || record.expiresAt <= new Date()) {
    if (record) await db.emailVerificationToken.delete({ where: { id: record.id } });
    return null;
  }
  const user = await db.$transaction(async (tx) => {
    const verified = await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
    await tx.emailVerificationToken.deleteMany({ where: { userId: record.userId } });
    return verified;
  });
  return user;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}
