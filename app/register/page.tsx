"use client";
import { useState } from "react";
export default function Register() {
  const [x, setX] = useState({
      name: "",
      email: "",
      password: "",
      role: "TENANT",
      phone: "",
    }),
    [error, setError] = useState(""),
    [confirmationSent, setConfirmationSent] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(x),
    });
    if (res.ok) setConfirmationSent(true);
    else setError((await res.json()).error);
  }
  return (
    <main className="auth">
      <form className="panel form" onSubmit={submit}>
        <p className="eyebrow">JOIN SINGLERENTS</p>
        <h1>Create your account</h1>
        <input
          required
          placeholder="Full name"
          onChange={(e) => setX({ ...x, name: e.target.value })}
        />
        <input
          required
          type="email"
          placeholder="Email"
          onChange={(e) => setX({ ...x, email: e.target.value })}
        />
        <input
          required
          placeholder="Phone number"
          onChange={(e) => setX({ ...x, phone: e.target.value })}
        />
        <input
          required
          type="password"
          minLength={8}
          placeholder="Password (8+ characters)"
          onChange={(e) => setX({ ...x, password: e.target.value })}
        />
        <select onChange={(e) => setX({ ...x, role: e.target.value })}>
          <option value="TENANT">I am looking for a room</option>
          <option value="LANDLORD">I have a room to let</option>
        </select>
        {error && <span className="error">{error}</span>}
        {confirmationSent ? (
          <p className="muted">
            We sent a confirmation link to <strong>{x.email}</strong>. Open it
            to activate your account.
          </p>
        ) : (
          <>
            <button className="button">Create account</button>
            <a className="google-button" href="/api/auth/google">
              Continue with Google
            </a>
          </>
        )}
      </form>
    </main>
  );
}
