import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { formatInrWithDecimals } from "../utils/formatInr.js";
import PaymentPanel from "../components/PaymentPanel.jsx";
import TicketModal from "../components/TicketModal.jsx";
import { downloadBookingTicketPdf } from "../utils/downloadTicketPdf.js";
import { voyagoModuleFromItemType } from "../utils/voyagoModule.js";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function normalizeClientBooking(b) {
  const paymentStatus =
    b.paymentStatus || (b.status === "paid" || b.status === "confirmed" ? "Paid" : "Pending");
  const bookingStatus =
    b.bookingStatus || (b.status === "cancelled" ? "Cancelled" : "Active");
  return { ...b, paymentStatus, bookingStatus, guestNames: b.guestNames || [] };
}

function PaymentBadge({ paymentStatus }) {
  if (paymentStatus === "Paid") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        Paid
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
      Pending
    </span>
  );
}

function BookingStateBadge({ bookingStatus }) {
  if (bookingStatus === "Cancelled") {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        Cancelled
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      Active
    </span>
  );
}

function PayModal({ open, onClose, booking, token, onPaid }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { setUser } = useAuth();

  if (!open || !booking) return null;

  async function pay(method) {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking._id}/pay`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Payment failed");
      
      if (data.userPoints !== undefined) {
        setUser(prev => ({ ...prev, points: data.userPoints }));
      }
      onPaid?.(normalizeClientBooking(data));
      onClose();
      window.dispatchEvent(new Event("bookings-updated"));
    } catch (e) {
      setErr(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  const priceToPay = booking.finalPrice ?? booking.totalPrice;

  const el = (
    <div className="fixed inset-0 z-[105] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <h3 className="font-display text-lg font-semibold text-brand-ink">Complete payment</h3>
        <p className="mt-1 text-sm text-slate-600">{booking.itemName}</p>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <div className="mt-4">
          <PaymentPanel totalPrice={priceToPay} loading={loading} onPay={pay} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>
    </div>
  );
  return createPortal(el, document.body);
}

export default function MyBookings() {
  const { token, user, setUser, loading: authLoading } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
  const [payBooking, setPayBooking] = useState(null);
  const [ticketBooking, setTicketBooking] = useState(null);

  const load = useCallback(async () => {
    if (!token) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      const arr = Array.isArray(data) ? data : [];
      setList(arr.map(normalizeClientBooking));
    } catch (e) {
      setError(e.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onUp = () => load();
    window.addEventListener("bookings-updated", onUp);
    return () => window.removeEventListener("bookings-updated", onUp);
  }, [load]);

  async function cancel(id) {
    if (!window.confirm("Cancel this booking?")) return;
    setActionId(id);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Cancel failed");
      
      if (data.userPoints !== undefined) {
        setUser(prev => ({ ...prev, points: data.userPoints }));
      }
      await load();
      window.dispatchEvent(new Event("bookings-updated"));
    } catch (e) {
      setError(e.message || "Cancel failed");
    } finally {
      setActionId(null);
    }
  }

  if (authLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-600">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-brand-ink">My bookings</h1>
        <p className="mt-2 text-slate-600">Log in to see your trips and stays.</p>
        <Link to="/login" className="mt-6 inline-block font-semibold text-rose-600 hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PayModal
        open={!!payBooking}
        onClose={() => setPayBooking(null)}
        booking={payBooking}
        token={token}
        onPaid={() => load()}
      />
      <TicketModal open={!!ticketBooking} onClose={() => setTicketBooking(null)} booking={ticketBooking} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-ink">My bookings</h1>
          <p className="mt-2 text-slate-600">Order history in ₹, tickets, and rewards.</p>
        </div>
        <div className="rounded-2xl bg-brand-ink px-4 py-3 text-white shadow-lg">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Available Points</p>
          <p className="text-xl font-bold leading-none mt-1">✨ {user.points || 0}</p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="mt-10 text-center text-slate-500">No bookings yet. Explore listings and tap Book now.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {list.map((b) => {
            const canPay = b.bookingStatus !== "Cancelled" && b.paymentStatus === "Pending";
            const showTicket = b.paymentStatus === "Paid";
            const hasDiscount = b.discountAmount > 0;
            const displayPrice = b.finalPrice ?? b.totalPrice;

            return (
              <li
                key={b._id}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {voyagoModuleFromItemType(b.itemType)}
                      </span>
                      {b.pointsEarned > 0 && b.paymentStatus === "Paid" && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                          +{b.pointsEarned} Points
                        </span>
                      )}
                      {b.pointsEarned > 0 && b.paymentStatus === "Pending" && (
                        <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Earn {b.pointsEarned} pts
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 font-display text-lg font-semibold text-brand-ink">{b.itemName}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatDate(b.startDate)}
                      {b.endDate && b.itemType !== "flight" ? ` → ${formatDate(b.endDate)}` : null}
                      {b.itemType === "flight" && b.endDate && formatDate(b.startDate) !== formatDate(b.endDate)
                        ? ` → ${formatDate(b.endDate)}`
                        : null}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {b.guests} guest{b.guests !== 1 ? "s" : ""}
                      {b.guestNames?.length ? ` · ${b.guestNames.join(", ")}` : ""}
                    </p>
                    {hasDiscount && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <span>🎉</span> Saved {formatInrWithDecimals(b.discountAmount)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <PaymentBadge paymentStatus={b.paymentStatus} />
                      <BookingStateBadge bookingStatus={b.bookingStatus} />
                    </div>
                    <div className="mt-2">
                      {hasDiscount && (
                        <p className="text-xs text-slate-400 line-through">
                          {formatInrWithDecimals(b.totalPrice)}
                        </p>
                      )}
                      <p className="text-lg font-bold text-brand-ink">
                        {formatInrWithDecimals(displayPrice)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {canPay && (
                    <button
                      type="button"
                      disabled={actionId === b._id}
                      onClick={() => setPayBooking(b)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Pay now
                    </button>
                  )}
                  {showTicket && (
                    <>
                      <button
                        type="button"
                        onClick={() => setTicketBooking(b)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        View ticket
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadBookingTicketPdf(b)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Download ticket
                      </button>
                    </>
                  )}
                  {b.bookingStatus !== "Cancelled" && (
                    <button
                      type="button"
                      disabled={actionId === b._id}
                      onClick={() => cancel(b._id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {actionId === b._id ? "…" : "Cancel booking"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
