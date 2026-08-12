"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../../components/Header";

type Form = {
  title: string;
  description: string;
  price: string;
  location: string;
  type: string;
  amenities: string;
  photos: string[];
  blockedDates: string[];
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
};

export default function EditRoom() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [blockDate, setBlockDate] = useState("");

  useEffect(() => {
    fetch(`/api/listings/${params.id}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw Error(result.error || "Unable to load listing.");
        return result.listing;
      })
      .then((listing) =>
        setForm({
          title: listing.title,
          description: listing.description,
          price: String(listing.price),
          location: listing.location,
          type: listing.type,
          amenities: listing.amenities.join(", "),
          photos: listing.photos,
          blockedDates: listing.availability?.blockedDates || [],
          status: listing.status,
        }),
      )
      .catch((e) => setError(e.message));
  }, [params.id]);

  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files || [])];
    if (!files.length || !form) return;
    setUploading(true);
    setError("");
    try {
      const sign = await fetch("/api/uploads/signature", { method: "POST" });
      const config = await sign.json();
      if (!sign.ok) throw Error(config.error);
      const uploads = await Promise.all(files.map(async (file) => {
        const body = new FormData();
        body.set("file", file);
        body.set("api_key", config.apiKey);
        body.set("timestamp", String(config.timestamp));
        body.set("folder", config.folder);
        body.set("signature", config.signature);
        const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, { method: "POST", body });
        const result = await response.json();
        if (!response.ok) throw Error(result.error?.message || "Image upload failed.");
        return result.secure_url;
      }));
      update("photos", [...form.photos, ...uploads]);
    } catch (e: any) {
      setError(e.message || "Image upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError("");
    const response = await fetch(`/api/listings/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        amenities: form.amenities.split(",").map((item) => item.trim()).filter(Boolean),
        availability: { blockedDates: form.blockedDates },
      }),
    });
    if (response.ok) router.push("/dashboard");
    else {
      const result = await response.json();
      setError(result.error || "Unable to update listing.");
    }
  }

  return <><Header /><main className="page"><p className="eyebrow">LANDLORD LISTING</p><h1>Edit room</h1>
    {error && !form ? <div className="notice">{error}</div> : form && <form className="panel form listing-form" onSubmit={submit}>
      <input required minLength={5} placeholder="Listing title" value={form.title} onChange={(e) => update("title", e.target.value)} />
      <textarea required minLength={20} placeholder="Describe the room, house and rules" value={form.description} onChange={(e) => update("description", e.target.value)} />
      <input required type="number" min={1} placeholder="Monthly rent (₦)" value={form.price} onChange={(e) => update("price", e.target.value)} />
      <input required minLength={10} placeholder="Full address" value={form.location} onChange={(e) => update("location", e.target.value)} />
      <select value={form.type} onChange={(e) => update("type", e.target.value)}><option>Private room</option><option>Shared room</option><option>Entire place</option></select>
      <input placeholder="Amenities, separated by commas" value={form.amenities} onChange={(e) => update("amenities", e.target.value)} />
      <select value={form.status} onChange={(e) => update("status", e.target.value as Form["status"])}><option value="PUBLISHED">Published</option><option value="PAUSED">Paused</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select>
      <label>Room photos<input type="file" accept="image/*" multiple onChange={upload} /></label>
      {uploading && <small className="muted">Uploading images…</small>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "12px" }}>{form.photos.map((photo) => <div key={photo} style={{ position: "relative" }}><img src={photo} alt="Room" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "8px" }} /><button type="button" aria-label="Remove photo" className="link" style={{ position: "absolute", top: 4, right: 4 }} onClick={() => update("photos", form.photos.filter((item) => item !== photo))}>×</button></div>)}</div>
      <label>Blocked availability dates<div className="button-row"><input type="date" min={new Date().toISOString().slice(0, 10)} value={blockDate} onChange={(e) => setBlockDate(e.target.value)} /><button type="button" className="link" onClick={() => { if (blockDate && !form.blockedDates.includes(blockDate)) update("blockedDates", [...form.blockedDates, blockDate]); setBlockDate(""); }}>Block date</button></div></label>
      <div className="button-row">{form.blockedDates.slice().sort().map((date) => <button type="button" className="status paused" key={date} onClick={() => update("blockedDates", form.blockedDates.filter((item) => item !== date))}>{date} ×</button>)}</div>
      {error && <span className="error">{error}</span>}<button className="button" disabled={uploading || !form.photos.length}>Save changes</button>
    </form>}
  </main></>;
}
