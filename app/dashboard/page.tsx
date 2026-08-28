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
    [loading, setLoading] = useState(true),
    [bookingToConfirm, setBookingToConfirm] = useState<any>(null),
    [leaseAmount, setLeaseAmount] = useState(""),
    [confirmingRent, setConfirmingRent] = useState(false),
    [rentError, setRentError] = useState("");
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
    if (user?.role !== "LANDLORD" || user.paystackTransferRecipientCode) return;
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
  const openConfirmRent = (booking: any) => {
    setBookingToConfirm(booking);
    setLeaseAmount(String(booking.leaseAmount || booking.listing.price));
    setRentError("");
  };
  const confirm = async () => {
    const amount = Number(leaseAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setRentError("Enter a valid rent amount greater than ₦0.");
      return;
    }
    if (!bookingToConfirm) return;
    setConfirmingRent(true);
    const r = await fetch(`/api/bookings/${bookingToConfirm.id}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaseAmount: amount }),
    });
    setNotice(
      r.ok
        ? "Rent confirmed. The tenant can now pay."
        : "Could not confirm the rent.",
    );
    setConfirmingRent(false);
    if (r.ok) {
      setBookingToConfirm(null);
      load();
    }
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
              Rent is held by SingleRents and released to you at 97% after admin approval.
            </p>
          </div>
          <Link className="button" href="/dashboard/rooms/new">
            + List a room
          </Link>
        </div>
        <div className="grid">
          <section className="panel">
            <small>RELEASED PAYOUTS</small>
            <h2>{naira(earnings?.landlordBalance)}</h2>
          </section>
          <section className="panel">
            <small>AWAITING ADMIN RELEASE</small>
            <h2>{naira(earnings?.awaitingRelease)}</h2>
          </section>
          {/* <section className="panel">
            <small>AGENCY/ADMIN 3%</small>
            <h2>{naira(earnings?.platformFees)}</h2>
          </section> */}
        </div>
        {user && !user.paystackTransferRecipientCode && (
          <section className="panel">
            <h2>Connect your bank account for payouts</h2>
            <p className="muted">An administrator releases your 97% share to this bank account after rent is received.</p>
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
                Connect bank account
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
        <Bookings bookings={bookings} confirm={openConfirmRent} />
        {notice && <div className="notice">{notice}</div>}
      </main>
      {bookingToConfirm && (
        <div className="modal-bg" role="presentation" onMouseDown={() => !confirmingRent && setBookingToConfirm(null)}>
          <section className="modal rent-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-rent-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setBookingToConfirm(null)} disabled={confirmingRent}>×</button>
            <p className="eyebrow">CONFIRM TENANT REQUEST</p>
            <h2 id="confirm-rent-title">Set the agreed monthly rent</h2>
            <p className="muted"><b>{bookingToConfirm.listing.title}</b><br />Confirming this amount lets the tenant continue to Paystack payment.</p>
            <form className="form" onSubmit={(event) => { event.preventDefault(); confirm(); }}>
              <label>Monthly rent (₦)<input autoFocus inputMode="numeric" value={leaseAmount} onChange={(event) => setLeaseAmount(event.target.value)} placeholder="e.g. 250000" disabled={confirmingRent} /></label>
              <div className="rent-summary"><span>Tenant pays</span><b>{rent(Number(leaseAmount.replace(/,/g, "")) || 0)}</b><small>SingleRents holds the payment; admin releases your 97% share after the platform fee.</small></div>
              {rentError && <span className="error">{rentError}</span>}
              <div className="modal-actions"><button type="button" className="link" onClick={() => setBookingToConfirm(null)} disabled={confirmingRent}>Cancel</button><button className="button" disabled={confirmingRent}>{confirmingRent ? "Confirming…" : "Confirm rent"}</button></div>
            </form>
          </section>
        </div>
      )}
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
  confirm?: (booking: any) => void | Promise<void>;
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
            <b>{tenant ? "Paid" : b.payment.payoutStatus === "RELEASED" ? "97% released" : "Payment held for admin release"}</b>
          )}
        </div>
      ))}
      {!bookings.length && <p className="muted">No bookings yet.</p>}
    </section>
  );
}
