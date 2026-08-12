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
          value: html || `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
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
