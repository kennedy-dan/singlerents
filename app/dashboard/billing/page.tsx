"use client";
import { useEffect, useState } from "react";
import Header from "../../components/Header";
import PageLoader from "../../components/PageLoader";
export default function Billing() {
  const [subscriptions, setSubscriptions] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setSubscriptions(v?.subscriptions || []))
      .finally(() => setLoading(false));
  }, []);
  async function choose(plan) {
    const r = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "SUBSCRIPTION", plan }),
    });
    if (r.ok) window.location.assign((await r.json()).authorizationUrl);
    else setError((await r.json()).error || "Unable to start subscription");
  }
  return (
    <>
      <Header />
      {loading ? (
        <PageLoader label="Loading billing…" />
      ) : (
        <main className="page">
          <p className="eyebrow">LANDLORD BILLING</p>
          <h1>Plans and billing</h1>
          <p className="muted">
            The free plan lets you publish one room for 2 days. Pro and
            Enterprise keep listings active and allow multiple photo URLs.
          </p>
          {error && <p className="error">{error}</p>}
          <div className="grid">
            <section className="card pad">
              <h3>Free</h3>
              <p>One published listing and one photo URL.</p>
              <b>2-day trial</b>
            </section>
            <section className="card pad">
              <h3>Pro Landlord</h3>
              <p>Ongoing listings and multiple photo URLs per room.</p>
              <button className="button" onClick={() => choose("PRO")}>
                Choose Pro - ₦5,000 /month
              </button>
            </section>
            <section className="card pad">
              <h3>Enterprise Agency</h3>
              <p>
                Multi-photo listings, team access, analytics and portfolio
                support.
              </p>
              <button className="button" onClick={() => choose("ENTERPRISE")}>
                Choose Enterprise - ₦7,000 /month
              </button>
            </section>
          </div>
          <h2>Subscription history</h2>
          <section className="panel">
            {subscriptions.map((s) => (
              <div className="listing" key={s.id}>
                <div>
                  <b>{s.plan}</b>
                  <small>
                    {s.status}{" "}
                    {s.trialEndsAt &&
                      `· trial ends ${new Date(s.trialEndsAt).toLocaleDateString()}`}
                  </small>
                </div>
              </div>
            ))}
            {!subscriptions.length && (
              <p className="muted">No subscription yet.</p>
            )}
          </section>
        </main>
      )}
    </>
  );
}
