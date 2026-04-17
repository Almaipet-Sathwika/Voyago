import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { formatInr } from "../utils/formatInr.js";

const TAB_CONFIG = {
  property: { label: "Rentals (Stayora)", accent: "stayora", endpoint: "properties" },
  hotel: { label: "Hotels (Tripora)", accent: "tripora", endpoint: "hotels" },
  flight: { label: "Flights (Tripora)", accent: "tripora", endpoint: "flights" },
};

export default function HostDashboard() {
  const { token, user, isHost, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("property");
  const [mine, setMine] = useState([]);
  const [listError, setListError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    location: "",
    price: "",
    description: "",
    rating: "4.8",
    imageUrl: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    securityDeposit: "",
    tags: "",
  });
  const [file, setFile] = useState(null);

  const canManage = isHost || isAdmin;

  const loadMine = useCallback(async () => {
    if (!token || !user?.id) return;
    setListError("");
    try {
      const res = await fetch(`/api/${TAB_CONFIG[activeTab].endpoint}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      
      const filtered = Array.isArray(data)
        ? data.filter((p) => {
            const hid = p.host && typeof p.host === "object" ? p.host._id : p.host;
            return hid && String(hid) === String(user.id);
          })
        : [];
      setMine(filtered);
    } catch (e) {
      setListError(e.message);
    }
  }, [token, user?.id, activeTab]);

  useEffect(() => {
    if (!loading && canManage) {
        loadMine();
        setEditId(null);
        resetForm();
    }
  }, [loading, canManage, activeTab, loadMine]);

  function resetForm() {
    setForm({
        name: "",
        location: "",
        price: "",
        description: "",
        rating: "4.8",
        imageUrl: "",
        ownerName: activeTab === 'property' ? (user?.name || "") : "",
        ownerPhone: "",
        ownerEmail: activeTab === 'property' ? (user?.email || "") : "",
        securityDeposit: "",
        tags: activeTab === 'property' ? "Budget Friendly, Verified" : "",
    });
    setFile(null);
    setEditId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (!file && !form.imageUrl.trim() && !editId) {
      setFormError("Provide an image URL or choose a file.");
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => {
          if (v != null) body.append(k, v);
      });
      if (file) body.append("image", file);

      const url = `/api/${TAB_CONFIG[activeTab].endpoint}${editId ? `/${editId}` : ""}`;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: editId && !file ? JSON.stringify(form) : body,
      });
      // Note: If editId and no file, we might prefer JSON if the server doesn't handling FormData for PUT well.
      // But standard multi-part usually works. Let's stick to FormData if file exists, or use JSON if no file to be safe.
      
      const res2 = (editId && !file) 
        ? await fetch(url, {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify(form)
          })
        : await fetch(url, {
            method: editId ? "PUT" : "POST",
            headers: { Authorization: `Bearer ${token}` },
            body
          });

      const data = await res2.json();
      if (!res2.ok) throw new Error(data.message || "Operation failed");
      
      setSuccess(`${editId ? "Updated" : "Published"} successfully!`);
      resetForm();
      loadMine();
      window.dispatchEvent(new Event(`${TAB_CONFIG[activeTab].endpoint}-updated`));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteListing(id) {
    if (!window.confirm("Delete this listing permanently?")) return;
    try {
        const res = await fetch(`/api/${TAB_CONFIG[activeTab].endpoint}/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Delete failed");
        loadMine();
        window.dispatchEvent(new Event(`${TAB_CONFIG[activeTab].endpoint}-updated`));
    } catch (e) { alert(e.message); }
  }

  function startEdit(item) {
      setEditId(item._id);
      setForm({
          name: item.name || "",
          location: item.location || "",
          price: item.price || "",
          description: item.description || "",
          rating: item.rating || "4.8",
          imageUrl: item.imageUrl || "",
          ownerName: item.ownerName || "",
          ownerPhone: item.ownerPhone || "",
          ownerEmail: item.ownerEmail || "",
          securityDeposit: item.securityDeposit || "",
          tags: Array.isArray(item.tags) ? item.tags.join(", ") : (item.tags || ""),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (loading) return <div className="p-16 text-center">Loading…</div>;
  if (!user || !canManage) return <div className="p-16 text-center">Access denied. <Link to="/login" className="text-rose-600">Login as Host</Link></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
            <h1 className="font-display text-3xl font-bold text-brand-ink">Management Dashboard</h1>
            <p className="mt-1 text-slate-500 text-sm">Create and manage your Tripora & Stayora listings.</p>
        </div>
        <div className="flex rounded-2xl bg-slate-100 p-1">
            {Object.entries(TAB_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setActiveTab(key)} className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    {cfg.label.split(" ")[0]}
                </button>
            ))}
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-white p-6 shadow-card border border-slate-100">
           <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-brand-ink">{editId ? "Edit" : "New"} {activeTab}</h2>
                {editId && <button type="button" onClick={resetForm} className="text-xs font-bold text-rose-600">Cancel Edit</button>}
           </div>
           
           {formError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>}
           {success && <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

           <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Title
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" placeholder="e.g. Grand Plaza Hotel" />
                </label>
                <label className="block text-sm font-bold text-slate-700">Location
                    <input required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" placeholder="City, State" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-bold text-slate-700">Price {activeTab === 'property' ? '(Rent/mo)' : '(per nit/tix)'}
                        <input type="number" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" />
                    </label>
                    <label className="block text-sm font-bold text-slate-700">Rating
                        <input type="number" step="0.1" min="0" max="5" required value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" />
                    </label>
                </div>

                {activeTab === 'property' && (
                    <div className="grid gap-4 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-bold text-slate-700">Security Deposit
                            <input type="number" value={form.securityDeposit} onChange={e => setForm(f => ({ ...f, securityDeposit: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" />
                        </label>
                        <label className="block text-sm font-bold text-slate-700">Owner Phone
                            <input required value={form.ownerPhone} onChange={e => setForm(f => ({ ...f, ownerPhone: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" placeholder="+91 ..." />
                        </label>
                    </div>
                )}

                <label className="block text-sm font-bold text-slate-700">Description
                    <textarea required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-bold text-slate-700">Image URL
                        <input type="url" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" />
                    </label>
                    <label className="block text-sm font-bold text-slate-700">Or Upload
                        <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="mt-1 w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-700 cursor-pointer" />
                    </label>
                </div>
           </div>

           <button type="submit" disabled={submitting} className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-xl transition hover:bg-slate-800 disabled:opacity-50">
             {submitting ? "Processing..." : (editId ? "Update Listing" : "Publish Listing")}
           </button>
        </form>

        <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-brand-ink">Your {activeTab}s</h2>
            {listError && <p className="text-red-600">{listError}</p>}
            <div className="grid gap-6 sm:grid-cols-1">
                {mine.map(item => (
                    <ListingCard
                        key={item._id}
                        title={item.name}
                        location={item.location}
                        price={item.price}
                        description={item.description}
                        rating={item.rating}
                        imageUrl={item.imageUrl}
                        accent={TAB_CONFIG[activeTab].accent}
                        tags={item.tags}
                        renderActions={
                            <div className="flex gap-2 w-full">
                                <button onClick={() => startEdit(item)} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Edit</button>
                                <button onClick={() => deleteListing(item._id)} className="flex-1 rounded-xl bg-red-50 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100">Delete</button>
                            </div>
                        }
                    />
                ))}
                {mine.length === 0 && <p className="text-slate-400 italic">No {activeTab}s found.</p>}
            </div>
        </div>
      </div>
    </div>
  );
}
