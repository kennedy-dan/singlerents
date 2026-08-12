"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";
import PageLoader from "../../../components/PageLoader";

export default function NewRoom() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
    type: "Private room",
    amenities: "",
    photos: [],
    blockedDates: [],
  });
  const [subscription, setSubscription] = useState(null),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false),
    [blockDate, setBlockDate] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => (r.ok ? r.json() : null))
      .then((v) =>
        setSubscription(
          v?.subscriptions?.find((s) => s.status === "SUCCESS") || null,
      )).finally(() => setLoading(false));
  }, []);
  const update = (key, value) => setForm({ ...form, [key]: value });
  async function upload(event) {
    const files = [...event.target.files];
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const sign = await fetch("/api/uploads/signature", { method: "POST" });
      const config = await sign.json();
      if (!sign.ok) throw Error(config.error);
      const uploads = await Promise.all(
        files.map(async (file) => {
          const body = new FormData();
          body.set("file", file);
          body.set("api_key", config.apiKey);
          body.set("timestamp", String(config.timestamp));
          body.set("folder", config.folder);
          body.set("signature", config.signature);
          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
            { method: "POST", body },
          );
          const result = await response.json();
          if (!response.ok)
            throw Error(result.error?.message || "Image upload failed.");
          return result.secure_url;
        }),
      );
      update("photos", [...form.photos, ...uploads]);
    } catch (e) {
      setError(e.message || "Image upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }
async function submit(e) {
  e.preventDefault();

  if (form.description.trim().length < 20) {
    setError("Description must be at least 20 characters long.");
    return;
  }

  const data = {
    ...form,
    price: Number(form.price),
    amenities: form.amenities
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    availability: { blockedDates: form.blockedDates },
  };
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) router.push("/dashboard");
  else {
    const result = await res.json();
    result.redirectTo
      ? router.push(result.redirectTo)
      : setError(result.error || "Unable to publish room");
  }
}
  const paid = !!subscription;
  if (loading) return <><Header /><PageLoader label="Preparing your listing…" /></>;
  return (
    <>
      <Header />
      <main className="page">
        <p className="eyebrow">LANDLORD LISTING</p>
        <h1>List a room</h1>
        <p className="muted">
          {paid
            ? `${subscription.plan} active: publish rooms with multiple photos.`
            : "Your first room is free for 2 days and includes one photo. Continue with Pro or Enterprise after the trial."}
        </p>
        {!paid && (
          <button
            className="link"
            onClick={() => router.push("/dashboard/billing")}
          >
            Compare Pro and Enterprise plans →
          </button>
        )}
        <form className="panel form listing-form" onSubmit={submit}>
          <input
            required
            placeholder="Listing title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
          <textarea
            required
            placeholder="Describe the room, house and rules (20+ characters)"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <input
            required
            type="number"
            min={1}
            placeholder="Monthly rent (₦)"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
          />
          <input
            required
            minLength={10}
            placeholder="Full address, e.g. 12 Herbert Macaulay Way, Yaba, Lagos"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
          />
          <small className="muted">Include the house number, street, area, and city so tenants can find it on the map.</small>
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
          >
            <option>Private room</option>
            <option>Shared room</option>
            <option>Entire place</option>
          </select>
          <input
            placeholder="Amenities, separated by commas"
            value={form.amenities}
            onChange={(e) => update("amenities", e.target.value)}
          />
          <label>
            Room photos
            <input
              required={!form.photos.length}
              type="file"
              accept="image/*"
              multiple={paid}
              onChange={upload}
            />
          </label>
          {uploading && <small className="muted">Uploading images…</small>}
       {form.photos.length > 0 && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: "12px",
      marginTop: "8px",
    }}
  >
    {form.photos.map((photo) => (
      <div
        key={photo}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <img
          src={photo}
          alt="Room photo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <button
          type="button"
          onClick={() =>
            update(
              "photos",
              form.photos.filter((item) => item !== photo),
            )
          }
          aria-label="Remove photo"
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(0, 0, 0, 0.6)",
            color: "#fff",
            fontSize: "14px",
            lineHeight: "1",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
    ))}
  </div>
)}
          <label>
            Blocked availability dates
            <div className="button-row">
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
              />
              <button
                type="button"
                className="link"
                onClick={() => {
                  if (blockDate && !form.blockedDates.includes(blockDate))
                    update("blockedDates", [...form.blockedDates, blockDate]);
                  setBlockDate("");
                }}
              >
                Block date
              </button>
            </div>
          </label>
          <div className="button-row">
            {form.blockedDates.sort().map((date) => (
              <button
                type="button"
                className="status paused"
                key={date}
                onClick={() =>
                  update(
                    "blockedDates",
                    form.blockedDates.filter((item) => item !== date),
                  )
                }
              >
                {date} ×
              </button>
            ))}
          </div>
          {error && <span className="error">{error}</span>}
          <button className="button" disabled={uploading}>
            Publish room
          </button>
        </form>
      </main>
    </>
  );
}
