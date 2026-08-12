"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import PageLoader from "../components/PageLoader";

function getNotificationLink(type: string) {
  switch (type) {
    case "BOOKING_REQUEST":
      return "/dashboard";
    case "MESSAGE":
      return "/messages";
    default:
      return "/notifications"; // fallback, adjust as you like
  }
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setItems(v?.notifications || []))
      .finally(() => setLoading(false));
    fetch("/api/notifications", { method: "PATCH" });
  }, []);

  return (
    <>
      <Header />
      {loading ? (
        <PageLoader label="Loading notifications…" />
      ) : (
        <main className="page">
          <p className="eyebrow">ACTIVITY</p>
          <h1>Notifications</h1>
          <section className="panel">
            {items.map((n) => (
              <Link
                href={getNotificationLink(n.type)}
                className="listing"
                key={n.id}
              >
                <div>
                  <b>{n.type.replace("_", " ")}</b>
                  <small>
                    {n.body} · {new Date(n.createdAt).toLocaleString()}
                  </small>
                </div>
              </Link>
            ))}
            {!items.length && <p className="muted">You are all caught up.</p>}
          </section>
        </main>
      )}
    </>
  );
}
