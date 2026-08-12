"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import PageLoader from "../components/PageLoader";
const naira = (n) =>
  `₦${Math.round(Number(n || 0) / 100).toLocaleString("en-NG")}`;
const rent = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;
export default function Dashboard() {
  const [user, setUser] = useState<any>(null),
    [bookings, setBookings] = useState<any[]>([]),
    [rooms, setRooms] = useState<any[]>([]),
    [earnings, setEarnings] = useState<any>(null),
    [notice, setNotice] = useState(""),
    [banks, setBanks] = useState<any[]>([]),
    [banksError, setBanksError] = useState(""),
    [banksLoading, setBanksLoading] = useState(false),
    [loading, setLoading] = useState(true);
  const load = async () => {
    const r = await Promise.all(
      [
        "/api/auth/me",
        "/api/bookings",
        "/api/listings?mine=true",
        "/api/dashboard/earnings",
      ].map((x) => fetch(x)),
    );
    if (r[0].ok) setUser((await r[0].json()).user);
    if (r[1].ok) setBookings((await r[1].json()).bookings);
    if (r[2].ok) setRooms((await r[2].json()).listings);
    if (r[3].ok) setEarnings(await r[3].json());
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (user?.role !== "LANDLORD" || user.paystackSubaccountCode) return;
    let active = true;
    setBanksLoading(true);
    fetch("/api/payments/banks")
      .then(async (r) => {
        const v = await r.json();
        if (!r.ok) throw Error(v.error || "Unable to load banks.");
        return v;
      })
      .then((v) => {
        if (active) setBanks(v.banks || []);
      })
      .catch((e) => {
        if (active) setBanksError(e.message);
      })
      .finally(() => {
        if (active) setBanksLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);
  if (loading)
    return (
      <>
        <Header />
        <PageLoader label="Loading dashboard…" />
      </>
    );
  const pay = async (b: any) => {
    const r = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "RENTAL", bookingId: b.id }),
      }),
      v = await r.json();
    r.ok
      ? location.assign(v.authorizationUrl)
      : setNotice(v.error || "Unable to begin payment.");
  };
  const confirm = async (b: any) => {
    const value = prompt(
      "Agreed rent in naira",
      b.leaseAmount || b.listing.price,
    );
    if (!value) return;
    const r = await fetch(`/api/bookings/${b.id}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaseAmount: Number(value) }),
    });
    setNotice(
      r.ok
        ? "Rent confirmed. The tenant can now pay."
        : "Could not confirm the rent.",
    );
    if (r.ok) load();
  };
  const connect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const r = await fetch("/api/payments/subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      }),
      v = await r.json();
    setNotice(
      r.ok
        ? "Payout account connected to Paystack."
        : v.error || "Could not set up payout account.",
    );
    if (r.ok) load();
  };
  if (user && user.role !== "LANDLORD")
    return (
      <>
        <Header />
        <main className="page">
          <p className="eyebrow">TENANT DASHBOARD</p>
          <h1>My payments</h1>
          <Bookings bookings={bookings} tenant pay={pay} />
          {notice && <div className="notice">{notice}</div>}
        </main>
      </>
    );
  return (
    <>
      <Header />
      <main className="page">
        <p className="eyebrow">LANDLORD DASHBOARD</p>
        <div className="page-title">
          <div>
            <h1>Your rooms and earnings</h1>
            <p className="muted">
              You receive 97% of every completed rent payment.
            </p>
          </div>
          <Link className="button" href="/dashboard/rooms/new">
            + List a room
          </Link>
        </div>
        <div className="grid">
          <section className="panel">
            <small>YOUR 97% BALANCE</small>
            <h2>{naira(earnings?.landlordBalance)}</h2>
          </section>
          {/* <section className="panel">
            <small>AGENCY/ADMIN 3%</small>
            <h2>{naira(earnings?.platformFees)}</h2>
          </section> */}
        </div>
        {user && !user.paystackSubaccountCode && (
          <section className="panel">
            <h2>Connect your Paystack payout account</h2>
            <p className="muted">Your 97% is settled to this bank account.</p>
            <form className="form" onSubmit={connect}>
              <input
                name="businessName"
                required
                placeholder="Full or business name"
              />
              <input
                name="accountNumber"
                required
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit bank account number"
              />
              <select
                name="bankCode"
                required
                defaultValue=""
                disabled={banksLoading || !!banksError}
              >
                <option value="" disabled>
                  {banksLoading
                    ? "Loading Paystack banks…"
                    : banksError || "Select your bank"}
                </option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              <button
                className="button"
                disabled={banksLoading || !!banksError}
              >
                Connect payout account
              </button>
            </form>
          </section>
        )}
        <h2>Your properties</h2>
        <section className="panel">
          {rooms.map((x) => (
            <div className="listing" key={x.id}>
              <div>
                <b>{x.title}</b>
                <small>
                  {x.location} · {rent(x.price)} / month
                </small>
              </div>
              <span className={"status " + x.status.toLowerCase()}>
                {x.status}
              </span>
              <Link className="link" href={`/dashboard/rooms/${x.id}/edit`}>
                Edit
              </Link>
            </div>
          ))}
          {!rooms.length && (
            <p className="muted">You have not listed a property yet.</p>
          )}
        </section>
        <h2>Tenant requests</h2>
        <Bookings bookings={bookings} confirm={confirm} />
        {notice && <div className="notice">{notice}</div>}
      </main>
    </>
  );
}
function Bookings({
  bookings,
  tenant = false,
  pay,
  confirm,
}: {
  bookings: any[];
  tenant?: boolean;
  pay?: (booking: any) => Promise<void>;
  confirm?: (booking: any) => Promise<void>;
}) {
  return (
    <section className="panel">
      {bookings.map((b) => (
        <div className="listing" key={b.id}>
          <div>
            <b>{b.listing.title}</b>
            <small>
              {b.leaseAmount
                ? `Agreed rent: ${rent(b.leaseAmount)}`
                : "Waiting for landlord confirmation"}
            </small>
          </div>
          <span className="status requested">{b.status}</span>
          {tenant && b.status === "CONFIRMED" && !b.payment && (
            <button className="button" onClick={() => pay(b)}>
              Pay with Paystack
            </button>
          )}
          {confirm && b.status === "REQUESTED" && (
            <button className="link" onClick={() => confirm(b)}>
              Confirm rent
            </button>
          )}
          {b.payment?.status === "SUCCESS" && (
            <b>{tenant ? "Paid" : "97% credited"}</b>
          )}
        </div>
      ))}
      {!bookings.length && <p className="muted">No bookings yet.</p>}
    </section>
  );
}
