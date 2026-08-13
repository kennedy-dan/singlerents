const escapeHtml = (value = "") =>
  String(value).replace(
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

const emailShell = (content) => `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f2;font-family:Arial,sans-serif;color:#12352b;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fffefa;border:1px solid #e2e7df;border-radius:14px;overflow:hidden;"><tr><td style="padding:24px 30px;background:#12352b;color:#fffefa;"><strong style="font-size:22px;letter-spacing:-.5px;">⌂ singlerents</strong><div style="margin-top:4px;font-size:10px;letter-spacing:1.1px;color:#f5c8b9;">ROOMS THAT FEEL LIKE HOME</div></td></tr><tr><td style="padding:28px 30px;font-size:15px;line-height:1.6;color:#536961;">${content}</td></tr><tr><td style="padding:18px 30px;background:#eef3eb;color:#536961;font-size:12px;">SingleRents · Verified rooms for renters in Lagos</td></tr></table></td></tr></table></body></html>`;

export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from || !to) return false;
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: process.env.EMAIL_FROM_NAME || "SingleRents" },
      subject,
      content: [
        { type: "text/plain", value: text },
        {
          type: "text/html",
          value: emailShell(html || `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`),
        },
      ],
    }),
  });
  if (!response.ok)
    console.error("SendGrid notification failed:", await response.text());
  return response.ok;
}

export function emailParagraph(value) {
  return `<p>${escapeHtml(value)}</p>`;
}
