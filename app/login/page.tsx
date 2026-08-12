"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Login() {
  const [x, setX] = useState({ email: "", password: "" }),
    [error, setError] = useState(""),
    [resendMessage, setResendMessage] = useState(""),
    [needsConfirmation, setNeedsConfirmation] = useState(false),
    r = useRouter();
  async function submit(e) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(x),
    });
    if (res.ok) r.push("/");
    else {
      const body = await res.json();
      setError(body.error);
      setNeedsConfirmation(Boolean(body.needsEmailConfirmation));
    }
  }
  async function resendConfirmation() {
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: x.email }),
    });
    const body = await res.json();
    setResendMessage(res.ok ? body.message : body.error);
  }
  return (
    <main className="auth">
      <form className="panel form" onSubmit={submit}>
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Log in</h1>
        <input
          required
          type="email"
          placeholder="Email"
          onChange={(e) => setX({ ...x, email: e.target.value })}
        />
        <input
          required
          type="password"
          placeholder="Password"
          onChange={(e) => setX({ ...x, password: e.target.value })}
        />
        {error && <span className="error">{error}</span>}
        {needsConfirmation && <button type="button" className="google-button" onClick={resendConfirmation}>Resend confirmation email</button>}
        {resendMessage && <span className="muted">{resendMessage}</span>}
        <button className="button">Log in</button>
        <p className="muted">
          No account? <a href="/register">Join free</a>
        </p>
        <a className="google-button" href="/api/auth/google">Continue with Google</a>
      </form>
    </main>
  );
}
