"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import PageLoader from "../components/PageLoader";

const money = (value: number) =>
  `₦${Number(value || 0).toLocaleString("en-NG")}`;

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");
  const load = async () => {
    const response = await fetch("/api/admin");
    if (!response.ok) {
      setError(
        response.status === 401
          ? "You do not have access to the admin console."
          : "Unable to load platform data.",
      );
      return;
    }
    setData(await response.json());
  };
  useEffect(() => {
    void load();
  }, []);
  const update = async (payload: Record<string, unknown>, key: string) => {
    setUpdating(key);
    setError("");
    const response = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok)
      setError((await response.json()).error || "Update failed.");
    else await load();
    setUpdating("");
  };
  if (!data && !error)
    return (
      <>
        <Header />
        <PageLoader label="Loading admin console…" />
      </>
    );
  return (
    <>
      <Header />
      <main className="page admin-page">
        <p className="eyebrow">PLATFORM CONTROL</p>
        <h1>Admin console</h1>
        <p className="muted">
          Monitor activity and manage accounts and listings. Changes take effect
          immediately.
        </p>
        {error && <div className="admin-alert">{error}</div>}
        {data && (
          <>
            <section className="admin-metrics">
              <Metric label="Users" value={data.metrics.users} />
              <Metric label="Listings" value={data.metrics.listings} />
              <Metric label="Bookings" value={data.metrics.bookings} />
              <Metric
                label="Completed volume"
                value={money(data.metrics.completedPaymentVolume)}
              />
              <Metric
                label="Platform fees"
                value={money(data.metrics.platformFees)}
              />
            </section>
            <AdminSection
              title="Users"
              subtitle="Activate, deactivate, and assign platform roles."
            >
              <div className="admin-table">
                {data.users.map((user: any) => (
                  <div className="admin-row" key={user.id}>
                    <div>
                      <b>{user.name}</b>
                      <small>
                        {user.email} · Joined{" "}
                        {new Date(user.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <span
                      className={`status ${user.isActive ? "published" : "paused"}`}
                    >
                      {user.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <select
                      value={user.role}
                      aria-label={`Role for ${user.name}`}
                      onChange={(event) =>
                        update(
                          {
                            type: "user",
                            id: user.id,
                            role: event.target.value,
                          },
                          `role-${user.id}`,
                        )
                      }
                      disabled={updating === `role-${user.id}`}
                    >
                      <option>TENANT</option>
                      <option>LANDLORD</option>
                      <option>ADMIN</option>
                    </select>
                    <button
                      className="link"
                      disabled={updating === `active-${user.id}`}
                      onClick={() =>
                        update(
                          {
                            type: "user",
                            id: user.id,
                            isActive: !user.isActive,
                          },
                          `active-${user.id}`,
                        )
                      }
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                ))}
              </div>
            </AdminSection>
            <AdminSection
              title="Listings"
              subtitle="Control visibility and lifecycle status."
            >
              <div className="admin-table">
                {data.listings.map((listing: any) => (
                  <div className="admin-row" key={listing.id}>
                    <div>
                      <b>{listing.title}</b>
                      <small>
                        {listing.landlord.name} · {listing.location} ·{" "}
                        {money(listing.price)}/month
                      </small>
                    </div>
                    <select
                      value={listing.status}
                      aria-label={`Status for ${listing.title}`}
                      onChange={(event) =>
                        update(
                          {
                            type: "listing",
                            id: listing.id,
                            status: event.target.value,
                          },
                          `listing-${listing.id}`,
                        )
                      }
                      disabled={updating === `listing-${listing.id}`}
                    >
                      <option>DRAFT</option>
                      <option>PENDING_PAYMENT</option>
                      <option>PUBLISHED</option>
                      <option>PAUSED</option>
                      <option>ARCHIVED</option>
                    </select>
                  </div>
                ))}
              </div>
            </AdminSection>
            <AdminSection title="Recent bookings">
              <Records
                records={data.bookings}
                render={(item: any) => (
                  <>
                    <b>{item.listing.title}</b>
                    <small>
                      {item.tenant.name} · {item.status} ·{" "}
                      {new Date(item.createdAt).toLocaleDateString()}
                    </small>
                  </>
                )}
              />
            </AdminSection>
            <AdminSection title="Payments">
              <Records
                records={data.payments}
                render={(item: any) => (
                  <>
                    <b>
                      {money(item.amount)} · {item.kind}
                    </b>
                    <small>
                      {item.payer.name} · {item.status} · fee{" "}
                      {money(item.agencyFee)}
                    </small>
                  </>
                )}
              />
            </AdminSection>
            <AdminSection title="Subscriptions">
              <Records
                records={data.subscriptions}
                render={(item: any) => (
                  <>
                    <b>{item.plan}</b>
                    <small>
                      {item.landlord.name} · {item.status} ·{" "}
                      {/* {new Date(item.createdAt).toLocaleDateString()} */}
                    </small>
                  </>
                )}
              />
            </AdminSection>
          </>
        )}
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="panel admin-metric">
      <small>{label}</small>
      <h2>{value}</h2>
    </section>
  );
}
function AdminSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel admin-section">
      <h2>{title}</h2>
      {subtitle && <p className="muted">{subtitle}</p>}
      {children}
    </section>
  );
}
function Records({
  records,
  render,
}: {
  records: any[];
  render: (item: any) => React.ReactNode;
}) {
  return (
    <div className="admin-table">
      {records.length ? (
        records.map((item) => (
          <div className="admin-row admin-record" key={item.id}>
            <div>{render(item)}</div>
          </div>
        ))
      ) : (
        <p className="muted">Nothing to show yet.</p>
      )}
    </div>
  );
}
