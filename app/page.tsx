"use client";
import { useEffect, useState } from "react";
import Header from "./components/Header";
import Map from "./components/Map";
const money = (n) => `₦${Number(n).toLocaleString("en-NG")}`;
const rating = (reviews = []) =>
  reviews.length
    ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)
    : "New";
function Stars({ value, size = 15 }) {
  return (
    <span
      aria-label={`${value} out of 5 stars`}
      style={{
        display: "inline-flex",
        gap: 1,
        color: "#e67b59",
        fontSize: size,
        lineHeight: 1,
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, Number(value) - star + 1));
        return (
          <span
            key={star}
            aria-hidden="true"
            style={{ color: "#d9ddd9", position: "relative" }}
          >
            ★
            <span
              style={{
                position: "absolute",
                inset: 0,
                width: `${fill * 100}%`,
                overflow: "hidden",
                color: "#e67b59",
              }}
            >
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
}
export default function Home() {
  const [filters, setFilters] = useState({
      q: "",
      type: "",
      max: "",
      amenities: "",
    }),
    [rooms, setRooms] = useState([]),
    [selected, setSelected] = useState(null),
    [notice, setNotice] = useState("");
  async function load() {
    const p = new URLSearchParams({
      q: filters.q,
      type: filters.type,
      max: filters.max,
    });
    filters.amenities
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .forEach((amenity) => p.append("amenity", amenity));
    if (!p.get("type")) p.delete("type");
    const r = await fetch(`/api/listings?${p}`);
    if (r.ok) setRooms((await r.json()).listings);
  }
  useEffect(() => {
    load();
  }, [filters.q, filters.type, filters.max, filters.amenities]);
  return (
    <>
      <Header />
      <section className="hero">
        <div>
          <p className="eyebrow">ROOMS THAT FEEL LIKE HOME</p>
          <h1>
            Your next room is
            <br />
            <em>right around the corner.</em>
          </h1>
          <p>
            Find rooms posted directly by landlords, request viewings, and move
            in with confidence.
          </p>
          <b>✓ Verified landlords &nbsp; ✓ No hidden fees</b>
        </div>
        <img
          src="https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=90"
          alt="Apartment"
        />
      </section>
      <section className="search">
        <input
          placeholder="Where are you looking?"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">Any type</option>
          <option>Private room</option>
          <option>Shared room</option>
          <option>Entire place</option>
        </select>
        <select
          value={filters.max}
          onChange={(e) => setFilters({ ...filters, max: e.target.value })}
        >
          <option value="300000">Up to ₦300,000</option>
          <option value="180000">Up to ₦180,000</option>
          <option value="100000">Up to ₦100,000</option>
        </select>
        <input
          placeholder="Amenities, e.g. Wi-Fi, parking"
          value={filters.amenities}
          onChange={(e) =>
            setFilters({ ...filters, amenities: e.target.value })
          }
        />
        <button className="button" onClick={load}>
          Search rooms
        </button>
      </section>
      <section className="section" id="rooms">
        <p className="eyebrow">LIVE LISTINGS</p>
        <h2>Rooms posted by landlords</h2>
        <p className="muted">{rooms.length} rooms available</p>
        <div className="grid">
          {rooms.map((r) => (
            <article className="card" key={r.id}>
              <div className="photo">
                <img src={r.photos[0]} alt={r.title} />
              </div>
              <div className="pad">
                <span className="rating">
                  <Stars value={Number(rating(r.reviews)) || 0} size={13} />{" "}
                  {rating(r.reviews)} ·{" "}
                  {r.landlord.emailVerifiedAt
                    ? "Verified landlord"
                    : "Landlord"}
                </span>
                <h3>{r.title}</h3>
                <p>⌖ {r.location}</p>
                <div className="card-foot">
                  <b>
                    {money(r.price)} <small>/ month</small>
                  </b>
                  <button onClick={() => setSelected(r)}>View room →</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!rooms.length && (
          <div className="panel empty">
            No published rooms match this search yet.
          </div>
        )}
      </section>
      <section className="section" id="map">
        <p className="eyebrow">SEARCH BY AREA</p>
        <h2>Explore on the map</h2>
        <Map listings={rooms} onSelect={setSelected} />
      </section>
      <footer className="footer">
        <b>⌂ singlerents</b>
        <span>© 2026 Singlerents</span>
      </footer>
      {selected && (
        <Room
          room={selected}
          close={() => setSelected(null)}
          notify={setNotice}
        />
      )}{" "}
      {notice && <div className="notice">{notice}</div>}
    </>
  );
}
function Room({ room, close, notify }) {
  const [date, setDate] = useState(""),
    [text, setText] = useState(""),
    [review, setReview] = useState(""),
    [photoIndex, setPhotoIndex] = useState(0),
    [reviewRating, setReviewRating] = useState(5);
  const photos = room.photos || [];
  useEffect(() => setPhotoIndex(0), [room.id]);
  async function book() {
    const r = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: room.id,
        startAt: new Date(date + "T14:00:00.000Z").toISOString(),
        endAt: new Date(date + "T15:00:00.000Z").toISOString(),
        note: text,
      }),
    });
    notify(
      r.ok
        ? "Viewing requested. The landlord has been notified."
        : "Sign in as a tenant to request a viewing.",
    );
  }
  async function message() {
    const r = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: room.id, body: text }),
    });
    notify(
      r.ok ? "Message sent." : "Sign in as a tenant to message this landlord.",
    );
  }
  async function sendReview() {
        if (review.trim().length < 4) {
      notify("Review must be at least 4 characters.");
      return;
    }
    const r = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: room.id,
        rating: reviewRating,
        comment: review,
      }),
    });
    notify(
      r.ok
        ? "Review published."
        : `${(await r.json()).error || "Unable to publish review."}`,
    );
  }
  return (
    <div className="modal-bg">
      <section className="modal">
        <button className="link" onClick={close}>
          × Close
        </button>
        <div
          style={{ position: "relative" }}
          aria-label={`${room.title} photos`}
        >
          <img
            style={{ height: 260, display: "block" }}
            src={photos[photoIndex]}
            alt={`${room.title} photo ${photoIndex + 1}`}
          />
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 10,
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,253,249,.9)",
                  color: "#16352c",
                  fontSize: 28,
                  lineHeight: 1,
                }}
                onClick={() =>
                  setPhotoIndex(
                    (index) => (index - 1 + photos.length) % photos.length,
                  )
                }
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 10,
                  transform: "translateY(-50%)",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,253,249,.9)",
                  color: "#16352c",
                  fontSize: 28,
                  lineHeight: 1,
                }}
                onClick={() =>
                  setPhotoIndex((index) => (index + 1) % photos.length)
                }
              >
                ›
              </button>
              <div
                style={{
                  position: "absolute",
                  right: 10,
                  bottom: 10,
                  borderRadius: 99,
                  background: "rgba(22,53,44,.8)",
                  color: "#fff",
                  padding: "4px 8px",
                  fontSize: 12,
                }}
                aria-live="polite"
              >
                {photoIndex + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
        <p className="eyebrow">{room.type}</p>
        <h2>{room.title}</h2>
        <p>
          ⌖ {room.location} ·{" "}
          <span className="stars">
            <Stars value={Number(rating(room.reviews)) || 0} />{" "}
            {rating(room.reviews)} ({room.reviews.length}{" "}
            {room.reviews.length === 1 ? "review" : "reviews"})
          </span>
        </p>
        <p>{room.description}</p>
        <p>
          <b>Amenities:</b> {room.amenities.join(" · ")}
        </p>
        <b>{money(room.price)} / month</b>
        <div className="form">
          <h3>Contact landlord / request viewing</h3>
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <textarea
            placeholder="Your message"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="button-row">
            <button className="button" disabled={!text} onClick={message}>
              Send message
            </button>
            <button
              className="button secondary"
              disabled={!date}
              onClick={book}
            >
              Request viewing
            </button>
          </div>
        </div>
        <div className="review-list">
          {room.reviews.map((r) => (
            <div className="review" key={r.id}>
              <b>
                <Stars value={r.rating} /> {r.rating.toFixed(1)} ·{" "}
                {r.author.name}
              </b>
              <p>{r.comment}</p>
            </div>
          ))}
        </div>
        <div className="form">
          <div>
            <b>Your rating: {reviewRating.toFixed(1)} / 5</b>
            <div
              role="radiogroup"
              aria-label="Choose a rating"
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {Array.from({ length: 9 }, (_, index) => (index + 2) / 2).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={reviewRating === value}
                    aria-label={`${value} out of 5 stars`}
                    onClick={() => setReviewRating(value)}
                    style={{
                      minWidth: 47,
                      padding: "6px 7px",
                      borderRadius: 5,
                      border:
                        reviewRating === value
                          ? "2px solid #16352c"
                          : "1px solid #e5e2d9",
                      background: reviewRating === value ? "#eef1eb" : "#fff",
                      color: "#16352c",
                    }}
                  >
                    <Stars value={value} size={13} />
                    <small style={{ display: "block", marginTop: 2 }}>
                      {value}
                    </small>
                  </button>
                ),
              )}
            </div>
          </div>
          <textarea
            placeholder="Leave a review after your successful payment"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
          <button className="link" onClick={sendReview}>
            Submit review
          </button>
        </div>
      </section>
    </div>
  );
}
