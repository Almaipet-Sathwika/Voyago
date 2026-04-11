import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { defaultDateRange, previewBookingTotal } from "../utils/bookingPrice.js";
import { formatInrWithDecimals } from "../utils/formatInr.js";
import PaymentPanel from "./PaymentPanel.jsx";
import TicketFace from "./TicketFace.jsx";
import { downloadBookingTicketPdf } from "../utils/downloadTicketPdf.js";

const labels = {
  hotel: { start: "Check-in", end: "Check-out", unit: "per night" },
  property: { start: "Check-in", end: "Check-out", unit: "per night" },
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
  const { checkIn: defIn, checkOut: defOut } = defaultDateRange();
  const [checkIn, setCheckIn] = useState(defIn);
  const [checkOut, setCheckOut] = useState(defOut);
  const [guests, setGuests] = useState(2);
  const [guestNames, setGuestNames] = useState(["", ""]);
  const [step, setStep] = useState("dates");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const L = labels[itemType] || labels.hotel;
  const primaryBtn =
    moduleAccent === "stayora"
      ? "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500"
      : "bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-500";
  const inputRing = moduleAccent === "stayora" ? "ring-orange-500" : "ring-rose-500";

  useEffect(() => {
    if (!open) return;
    const r = defaultDateRange();
    setCheckIn(r.checkIn);
    setCheckOut(r.checkOut);
    const g = itemType === "flight" ? 1 : 2;
    setGuests(g);
    setGuestNames(Array.from({ length: g }, () => ""));
    setStep("dates");
    setBooking(null);
    setError("");
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

  async function submitBookingWithNames(e) {
    e.preventDefault();
    setError("");
    const trimmed = guestNames.map((n) => String(n).trim());
    if (trimmed.some((n) => !n)) {
      setError("Please enter a name for each guest.");
      return;
    }
    if (trimmed.length !== guests) {
      setError("Guest names must match the number of guests.");
      return;
    }
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
          guestNames: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");
      setBooking(data);
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
      setStep("ticket");
      onBooked?.();
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  const title =
    step === "dates"
      ? "Book — dates & guests"
      : step === "names"
        ? "Guest details"
        : step === "payment"
          ? "Payment"
          : "Ticket";

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-brand-ink">
            {title} — {item.name}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          {step === "dates" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {formatInrWithDecimals(item.price)} {L.unit}. Total updates from your dates and guests.
              </p>
              <label className="block text-sm font-medium text-slate-700">
                {L.start}
                <input
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 ${inputRing}`}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {L.end}
                <input
                  type="date"
                  required
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 ${inputRing}`}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Number of guests
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 ${inputRing}`}
                />
              </label>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">Estimated total</p>
                <p className="text-2xl font-bold text-brand-ink">
                  {totalPreview != null ? formatInrWithDecimals(totalPreview) : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={goToGuestNames}
                disabled={loading || totalPreview == null}
                className={`w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 ${primaryBtn}`}
              >
                Continue to guest names
              </button>
            </div>
          )}

          {step === "names" && (
            <form onSubmit={submitBookingWithNames} className="space-y-4">
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
                  {loading ? "Saving…" : "Confirm booking"}
                </button>
              </div>
            </form>
          )}

          {step === "payment" && booking && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-900">Booking saved</p>
                <p className="mt-1 text-sm text-amber-800">
                  Payment status: Pending. Choose a method below to complete checkout (simulated).
                </p>
              </div>
              <PaymentPanel totalPrice={booking.totalPrice} loading={loading} onPay={payNow} />
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
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
                <p className="mt-3 font-display text-xl font-semibold text-brand-ink">Payment successful</p>
                <p className="mt-1 text-sm text-slate-600">
                  Payment status: <span className="font-medium text-emerald-700">Paid</span>
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

  return createPortal(modal, document.body);
}
