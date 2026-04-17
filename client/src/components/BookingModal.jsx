import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { defaultDateRange, previewBookingTotal } from "../utils/bookingPrice.js";
import { formatInrWithDecimals } from "../utils/formatInr.js";
import { useAuth } from "../context/AuthContext.jsx";
import PaymentPanel from "./PaymentPanel.jsx";
import TicketFace from "./TicketFace.jsx";
import { downloadBookingTicketPdf } from "../utils/downloadTicketPdf.js";

const labels = {
  hotel: { start: "Check-in", end: "Check-out", unit: "per night" },
  property: { start: "Check-in", end: "Check-out", unit: "per month" },
  flight: { start: "Departure date", end: "Return / travel end", unit: "per ticket" },
};

export default function BookingModal({
  open,
  onClose,
  item,
  itemType,
  token,
  onBooked,
  moduleAccent = "tripora",
}) {
  const { user, setUser } = useAuth();
  const { checkIn: defIn, checkOut: defOut } = defaultDateRange();
  const [checkIn, setCheckIn] = useState(defIn);
  const [checkOut, setCheckOut] = useState(defOut);
  const [guests, setGuests] = useState(2);
  const [guestNames, setGuestNames] = useState(["", ""]);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [step, setStep] = useState("dates");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const L = labels[itemType] || labels.hotel;
  const isStayora = itemType === "property";

  const primaryBtn =
    moduleAccent === "stayora"
      ? "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500 shadow-orange-100"
      : "bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500 shadow-rose-100";
  const inputRing = moduleAccent === "stayora" ? "ring-orange-500" : "ring-rose-500";

  useEffect(() => {
    if (!open) return;
    const r = defaultDateRange();
    setCheckIn(r.checkIn);
    setCheckOut(r.checkOut);
    const g = itemType === "flight" ? 1 : 2;
    setGuests(g);
    setGuestNames(Array.from({ length: g }, () => ""));
    setPointsToUse(0);
    setStep("dates");
    setBooking(null);
    setError("");
    setShowContact(false);
  }, [open, item?._id, itemType]);

  useEffect(() => {
    if (step !== "names") return;
    setGuestNames((prev) => {
      const next = Array.from({ length: guests }, (_, i) => prev[i] ?? "");
      return next;
    });
  }, [guests, step]);

  const totalPreview = useMemo(
    () => previewBookingTotal(itemType, item?.price, checkIn, checkOut, guests),
    [itemType, item?.price, checkIn, checkOut, guests]
  );

  const maxPointsUsable = useMemo(() => {
    if (!totalPreview) return 0;
    const maxByPrice = Math.floor(2 * totalPreview);
    return Math.min(user?.points || 0, maxByPrice);
  }, [totalPreview, user?.points]);

  const discountPreview = useMemo(() => {
    return (pointsToUse / 100) * 10;
  }, [pointsToUse]);

  if (!open || !item) return null;

  function goToGuestNames() {
    setError("");
    if (totalPreview == null) {
      setError("Please choose valid dates.");
      return;
    }
    setGuestNames(Array.from({ length: guests }, (_, i) => guestNames[i] ?? ""));
    setStep("names");
  }

  function goToRewards(e) {
    if (e) e.preventDefault();
    setError("");
    const trimmed = guestNames.map((n) => String(n).trim());
    if (trimmed.some((n) => !n)) {
      setError("Please enter a name for each guest.");
      return;
    }
    setStep("rewards");
  }

  async function submitBooking(e) {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemType,
          itemId: item._id,
          checkIn,
          checkOut,
          guests,
          guestNames: guestNames.map(n => n.trim()),
          pointsToUse,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");
      
      setBooking(data);
      if (data.userPoints !== undefined) {
        setUser(prev => ({ ...prev, points: data.userPoints }));
      }
      setStep("payment");
      onBooked?.();
    } catch (err) {
      setError(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  async function payNow(method) {
    if (!booking?._id) return;
    setError("");
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
      
      setBooking(data);
      if (data.userPoints !== undefined) {
        setUser(prev => ({ ...prev, points: data.userPoints }));
      }
      setStep("ticket");
      onBooked?.();
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  const stepTitle = {
    dates: isStayora ? "Rental Details" : "Book — dates & guests",
    names: "Guest details",
    rewards: "Rewards & Discounts",
    payment: "Payment",
    ticket: "Ticket",
  }[step];

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {isStayora && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="font-display text-lg font-bold text-brand-ink line-clamp-1">
                {item.name}
              </h2>
              <p className="text-xs font-medium text-slate-500">{stepTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="px-6 py-6 font-sans">
          {error && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          {step === "dates" && (
            <div className="space-y-6">
              {isStayora && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Rent</p>
                    <p className="mt-1 font-display text-xl font-bold text-brand-ink">
                      {formatInrWithDecimals(item.price)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Deposit</p>
                    <p className="mt-1 font-display text-xl font-bold text-emerald-600">
                      {item.securityDeposit ? formatInrWithDecimals(item.securityDeposit) : "No Deposit"}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    {L.start}
                    <input
                      type="date"
                      required
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 ${inputRing}`}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    {L.end}
                    <input
                      type="date"
                      required
                      value={checkOut}
                      min={checkIn}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 ${inputRing}`}
                    />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-slate-700">
                  Number of guests
                  <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 p-1">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="h-10 w-10 text-xl font-bold text-slate-500 hover:text-brand-ink"
                    >
                      −
                    </button>
                    <span className="font-bold text-brand-ink">{guests} Guests</span>
                    <button
                      type="button"
                      onClick={() => setGuests(guests + 1)}
                      className="h-10 w-10 text-xl font-bold text-slate-500 hover:text-brand-ink"
                    >
                      +
                    </button>
                  </div>
                </label>
              </div>

              {isStayora && (
                <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-white to-orange-50/30 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-brand-ink">Contact Property Owner</h3>
                      <p className="text-xs text-slate-500">Response within 24 hrs • {item.ownerName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowContact(!showContact)}
                      className="rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-600"
                    >
                      {showContact ? "Hide Info" : "📞 Contact Owner"}
                    </button>
                  </div>

                  {showContact && (
                    <div className="mt-5 space-y-4 border-t border-orange-100 pt-4 animate-in fade-in slide-in-from-top-2">
                       <div className="flex items-center gap-4 text-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                          📞
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.ownerPhone}</p>
                          <p className="text-xs text-slate-500">Call or WhatsApp</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                          ✉️
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.ownerEmail}</p>
                          <p className="text-xs text-slate-500">Official Email</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("open-chatbot", { detail: { query: `I'm interested in ${item.name}` } }))}
                        className="w-full rounded-xl border border-orange-200 bg-white py-2 text-xs font-bold text-orange-600 hover:bg-orange-50"
                      >
                         💬 Chat with Support Assistant
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-xl">
                <div className="flex justify-between">
                  <p className="text-sm font-medium text-slate-400">Total Price</p>
                  <p className="text-sm text-slate-400">{L.unit}</p>
                </div>
                <p className="mt-1 font-display text-3xl font-bold">
                  {totalPreview != null ? formatInrWithDecimals(totalPreview) : "—"}
                </p>
                <button
                  type="button"
                  onClick={goToGuestNames}
                  disabled={loading || totalPreview == null}
                  className={`mt-6 w-full rounded-2xl py-4 font-bold text-white transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] ${primaryBtn}`}
                >
                  Continue to Booking
                </button>
              </div>
            </div>
          )}

          {step === "names" && (
            <form onSubmit={goToRewards} className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter the full name for each of the {guests} guest{guests !== 1 ? "s" : ""}.
              </p>
              {guestNames.map((name, i) => (
                <label key={i} className="block text-sm font-medium text-slate-700">
                  Guest {i + 1}
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      const next = [...guestNames];
                      next[i] = e.target.value;
                      setGuestNames(next);
                    }}
                    className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 ${inputRing}`}
                    placeholder={`Name ${i + 1}`}
                  />
                </label>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("dates")}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${primaryBtn}`}
                >
                  Continue to rewards
                </button>
              </div>
            </form>
          )}

          {step === "rewards" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-brand-ink to-slate-800 p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Voyago Rewards</p>
                    <p className="mt-1 text-2xl font-bold">{user?.points || 0} Points</p>
                  </div>
                  <div className="rounded-full bg-white/10 p-2">
                    <span className="text-2xl">✨</span>
                  </div>
                </div>
                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm text-slate-300">100 points = ₹10</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-brand-ink">Redeem Points</h3>
                  <button
                    type="button"
                    onClick={() => setPointsToUse(maxPointsUsable)}
                    className="text-sm font-semibold text-rose-600 hover:underline"
                  >
                    Use Max Points
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={maxPointsUsable}
                      value={pointsToUse}
                      onChange={(e) => {
                        const val = Math.min(maxPointsUsable, Math.max(0, Number(e.target.value) || 0));
                        setPointsToUse(val);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="whitespace-nowrap rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-brand-ink">
                      - {formatInrWithDecimals(discountPreview)}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Max usable for this booking: <span className="font-semibold">{maxPointsUsable} points</span> (20% limit)
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Base total</span>
                  <span className="text-slate-900">{formatInrWithDecimals(totalPreview)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm text-emerald-600">
                  <span>Points discount</span>
                  <span>- {formatInrWithDecimals(discountPreview)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-bold">
                  <span className="text-brand-ink">Final Price</span>
                  <span className="text-brand-ink">{formatInrWithDecimals(totalPreview - discountPreview)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("names")}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitBooking}
                  disabled={loading}
                  className={`flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${primaryBtn}`}
                >
                  {loading ? "Confirming..." : "Confirm & Pay"}
                </button>
              </div>
            </div>
          )}

          {step === "payment" && booking && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-900">Booking saved</p>
                {booking.discountAmount > 0 && (
                  <p className="mt-1 text-sm font-bold text-emerald-700 underline decoration-emerald-200 decoration-2 underline-offset-4">
                    🎉 You saved {formatInrWithDecimals(booking.discountAmount)}!
                  </p>
                )}
                <p className="mt-1 text-xs text-amber-800">
                  Complete checkout below. You'll earn <span className="font-bold">+{booking.pointsEarned} points</span> after payment.
                </p>
              </div>
              <PaymentPanel 
                totalPrice={booking.finalPrice ?? booking.totalPrice} 
                loading={loading} 
                onPay={payNow} 
              />
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Pay later (close)
              </button>
            </div>
          )}

          {step === "ticket" && booking && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">✓</div>
                <p className="mt-3 font-display text-xl font-semibold text-brand-ink">Payment successful</p>
                <p className="mt-1 text-sm text-emerald-600 font-medium">
                  +{booking.pointsEarned} points earned! 🎉
                </p>
              </div>
              <TicketFace booking={booking} />
              <button
                type="button"
                onClick={() => downloadBookingTicketPdf(booking)}
                className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Download ticket (PDF)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
