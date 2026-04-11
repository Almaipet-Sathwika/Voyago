import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ListingCard from "../components/ListingCard.jsx";

export default function HostDashboard() {
  const { token, user, isHost, loading } = useAuth();
  const [mine, setMine] = useState([]);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    price: "",
    description: "",
    rating: "4.8",
    imageUrl: "",
  });
  const [file, setFile] = useState(null);

  const loadMine = useCallback(async () => {
    if (!token || !user?.id) return;
    setListError("");
    try {
      const res = await fetch("/api/properties");
      const all = await res.json();
      const uid = String(user.id);
      const filtered = Array.isArray(all)
        ? all.filter((p) => {
            const hid = p.host && typeof p.host === "object" ? p.host._id : p.host;
            return hid && String(hid) === uid;
          })
        : [];
      setMine(filtered);
    } catch (e) {
      setListError(e.message || "Failed to load your listings");
    }
  }, [token, user?.id]);

  useEffect(() => {
    if (!loading && isHost) loadMine();
  }, [loading, isHost, loadMine]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (!file && !form.imageUrl.trim()) {
      setFormError("Provide an image URL or choose a file to upload.");
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("name", form.name);
      body.append("location", form.location);
      body.append("price", form.price);
      body.append("description", form.description);
      body.append("rating", form.rating);
      if (form.imageUrl.trim()) body.append("imageUrl", form.imageUrl.trim());
      if (file) body.append("image", file);

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not create listing");
      setSuccess("Listing published — it appears on Stayora immediately.");
      setForm({
        name: "",
        location: "",
        price: "",
        description: "",
        rating: "4.8",
        imageUrl: "",
      });
      setFile(null);
      loadMine();
      window.dispatchEvent(new Event("properties-updated"));
    } catch (err) {
      setFormError(err.message || "Failed to add property");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-600">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-slate-600">Log in as a host to manage listings.</p>
        <Link to="/login" className="mt-4 inline-block font-semibold text-rose-600 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-slate-600">This dashboard is for hosts only.</p>
        <Link to="/register" className="mt-4 inline-block font-semibold text-rose-600 hover:underline">
          Register as host
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-brand-ink">Host dashboard</h1>
      <p className="mt-2 text-slate-600">
        Voyago hosts publish to Stayora — add a property with a URL or upload, stored in MongoDB.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-card lg:max-w-xl"
        >
          <h2 className="font-display text-lg font-semibold text-brand-ink">New listing</h2>
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </div>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Title
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-orange-500 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Location
            <input
              required
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-orange-500 focus:ring-2"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Price / night (₹)
              <input
                type="number"
                required
                min={0}
                step="1"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-orange-500 focus:ring-2"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Rating (0–5)
              <input
                type="number"
                required
                min={0}
                max={5}
                step="0.1"
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-orange-500 focus:ring-2"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-orange-500 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Image URL (optional if you upload a file)
            <input
              type="url"
              placeholder="https://images.unsplash.com/..."
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none ring-orange-500 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Upload image
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white hover:bg-orange-500 disabled:opacity-60"
          >
            {submitting ? "Publishing…" : "Publish listing"}
          </button>
        </form>

        <div>
          <h2 className="font-display text-lg font-semibold text-brand-ink">Your listings</h2>
          {listError && <p className="mt-2 text-sm text-red-600">{listError}</p>}
          {!listError && mine.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">No properties assigned to you yet — add one on the left.</p>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {mine.map((item) => (
              <ListingCard
                key={item._id}
                title={item.name}
                location={item.location}
                price={item.price}
                description={item.description}
                rating={item.rating}
                imageUrl={item.imageUrl}
                priceLabel="night"
                accent="stayora"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
