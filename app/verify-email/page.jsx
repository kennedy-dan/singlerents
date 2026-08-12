"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerificationStatus() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const [state, setState] = useState("Confirming your email…");

  useEffect(() => {
    if (!token) {
      setState("This confirmation link is invalid or incomplete.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error);
      setState("Your email is confirmed. Taking you to SingleRents…");
      setTimeout(() => router.push("/"), 800);
    }).catch((error) => setState(error.message || "We could not confirm this email."));
  }, [router, token]);

  return (
    <main className="auth">
      <section className="panel form">
        <p className="eyebrow">EMAIL CONFIRMATION</p>
        <h1>Confirm your email</h1>
        <p className="muted">{state}</p>
        {state.includes("invalid") || state.includes("expired") ? <a className="button" href="/login">Return to login</a> : null}
      </section>
    </main>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<main className="auth"><section className="panel form"><p className="muted">Loading confirmation…</p></section></main>}>
      <VerificationStatus />
    </Suspense>
  );
}
