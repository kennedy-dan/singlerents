"use client";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import PageLoader from "../components/PageLoader";

export default function Profile() {
  const [profile, setProfile] = useState(null),
    [form, setForm] = useState({ name: "", phone: "" }),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true);
  const load = () =>
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        setProfile(v?.profile || null);
        if (v?.profile)
          setForm({ name: v.profile.name, phone: v.profile.phone || "" });
      })
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);
  async function save(e) {
    e.preventDefault();
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setNotice(r.ok ? "Profile saved." : "Unable to save your profile.");
    if (r.ok) load();
  }
  if (loading)
    return (
      <>
        <Header />
        <PageLoader label="Loading profile…" />
      </>
    );
  if (!profile)
    return (
      <>
        <Header />
        <main className="page">
          <p>
            Please <a href="/login">log in</a> to view your profile.
          </p>
        </main>
      </>
    );
  const history =
    profile.role === "LANDLORD" ? profile.listings : profile.bookings;
  return (
    <>
      <Header />
      <main className="page">
        <p className="eyebrow">MY PROFILE</p>
        <h1>Profile and history</h1>
        <form className="panel form" onSubmit={save}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full name"
            required
          />
          <input value={profile.email} disabled />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone number"
          />
          <input value={profile.role} disabled />
          <button className="button">Save profile</button>
          {notice && <small className="muted">{notice}</small>}
        </form>
        <h2>
          {profile.role === "LANDLORD" ? "Listing history" : "Rental history"}
        </h2>
        <section className="panel">
          {history.map((item) =>
            profile.role === "LANDLORD" ? (
              <div className="listing" key={item.id}>
                <b>{item.title}</b>
                <small>
                  {item.location} · {item.status} · {item.bookings.length}{" "}
                  request(s)
                </small>
              </div>
            ) : (
              <div className="listing" key={item.id}>
                <b>{item.listing.title}</b>
                <small>
                  {item.listing.location} · {item.status} ·{" "}
                  {item.payment?.status || "No payment"}
                </small>
              </div>
            ),
          )}
          {!history.length && <p className="muted">No history yet.</p>}
        </section>
      </main>
    </>
  );
}
