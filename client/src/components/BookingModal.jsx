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
  property: { unit: "per month" },
  flight: { start: "Departure date", end: "Return date", unit: "per ticket" },
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
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [duration, setDuration] = useState("1 Month");
  const [guestNames, setGuestNames] = useState([""]);
  const [tenantName, setTenantName] = useState(user?.name || "");
  const [tenantPhone, setTenantPhone] = useState("");
  const [pointsToUse, setPointsToUse] = useState(0);
  const [step, setStep] = useState("dates");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const isStayora = itemType === "property";
  const isHotel = itemType === "hotel";
  const isFlight = itemType === "flight";

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
    setIsRoundTrip(false);
    const g = isFlight ? 1 : (isHotel ? 2 : 1);
    setGuests(g);
    setRooms(1);
    setDuration("1 Month");
    setGuestNames(Array.from({ length: g }, () => ""));
    setTenantName(user?.name || "");
    setTenantPhone("");
    setPointsToUse(0);
    setStep("dates");
    setBooking(null);
    setError("");
    setShowContact(false);
  }, [open, item?._id, itemType, user?.name]);

  useEffect(() => {
    if (step !== "details" || isStayora) return;
    setGuestNames((prev) => {
      const next = Array.from({ length: guests }, (_, i) => prev[i] || "");
      return next;
    });
  }, [guests, step, isStayora]);

  const totalPreview = useMemo(() => {
    return previewBookingTotal(itemType, item?.price, {
      checkIn,
      checkOut: isFlight && !isRoundTrip ? undefined : checkOut,
      guests,
      duration,
      rooms,
    });
  }, [itemType, item?.price, checkIn, checkOut, guests, duration, rooms, isFlight, isRoundTrip]);

  const priceBreakdown = useMemo(() => {
    if (!item?.price || totalPreview == null) return "";
    if (isStayora) {
      return `${formatInrWithDecimals(item.price)}/month × ${duration.toLowerCase()} = ${formatInrWithDecimals(totalPreview)}`;
    }
    if (isHotel) {
      const d0 = new Date(checkIn);
      const d1 = new Date(checkOut);
      const nights = Math.max(1, Math.round((d1 - d0) / 86400000));
      return `${formatInrWithDecimals(item.price)}/night × ${nights} nights × ${rooms} rooms = ${formatInrWithDecimals(totalPreview)}`;
    }
    if (isFlight) {
        return `${formatInrWithDecimals(item.price)}/ticket × ${guests} travellers = ${formatInrWithDecimals(totalPreview)}`;
    }
    return "";
  }, [item, totalPreview, isStayora, isHotel, isFlight, checkIn, checkOut, duration, rooms, guests]);

  const maxPointsUsable = useMemo(() => {
    if (!totalPreview) return 0;
    return Math.min(user?.points || 0, Math.floor(2 * totalPreview));
  }, [totalPreview, user?.points]);

  if (!open || !item) return null;

  function goToDetails() {
    setError("");
    if (totalPreview == null) {
      setError("Please check your selection.");
      return;
    }
    setStep("details");
  }

  function goToRewards(e) {
    if (e) e.preventDefault();
    setError("");
    if (isStayora) {
       if (!tenantName.trim()) { setError("Primary tenant name is required."); return; }
    } else {
       const trimmed = guestNames.map(n => String(n).trim());
       if (trimmed.some(n => !n)) { setError("All guest names are required."); return; }
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
          checkOut: isFlight && !isRoundTrip ? undefined : checkOut,
          guests: isStayora ? 1 : guests,
          rooms: isHotel ? rooms : undefined,
          duration: isStayora ? duration : undefined,
          tenantName: isStayora ? tenantName : undefined,
          tenantPhone: isStayora ? tenantPhone : undefined,
          guestNames: isStayora ? undefined : guestNames.map(n => n.trim()),
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Payment failed");
      setBooking(data);
      if (data.userPoints !== undefined) setUser(prev => ({ ...prev, points: data.userPoints }));
      setStep("ticket");
      onBooked?.();
    } catch (err) { setError(err.message || "Payment failed"); } finally { setLoading(false); }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md">
            <h2 className="font-display text-lg font-bold text-brand-ink line-clamp-1">{item.name}</h2>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        <div className="px-6 py-6 font-sans">
          {error && <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">⚠️ {error}</div>}

          {step === "dates" && (
            <div className="space-y-6">
              {isStayora ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <p className="text-xs font-bold text-slate-400">Monthly Rent</p>
                            <p className="mt-1 font-display text-xl font-bold text-brand-ink">{formatInrWithDecimals(item.price)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <p className="text-xs font-bold text-slate-400">Security Deposit</p>
                            <p className="mt-1 font-display text-xl font-bold text-emerald-600">{item.securityDeposit ? formatInrWithDecimals(item.securityDeposit) : "No Deposit"}</p>
                        </div>
                   </div>
                   <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700">Duration</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {["15 Days", "1 Month", "2 Months", "3 Months"].map(d => (
                                <button key={d} type="button" onClick={() => setDuration(d)} className={`rounded-xl py-3 text-sm font-bold border transition-all ${duration === d ? "bg-orange-500 text-white border-orange-500 shadow-orange-100 shadow-lg" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                   </div>
                   <div className="rounded-2xl border border-orange-100 bg-orange-50/30 p-4">
                        <h3 className="text-sm font-bold text-brand-ink">Contact Owner</h3>
                        <p className="text-xs text-slate-500 mt-1">{item.ownerName} • {item.ownerPhone}</p>
                   </div>
                </div>
              ) : isFlight ? (
                <div className="space-y-6">
                    <div className="flex rounded-xl bg-slate-100 p-1">
                        <button type="button" onClick={() => setIsRoundTrip(false)} className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${!isRoundTrip ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>One Way</button>
                        <button type="button" onClick={() => setIsRoundTrip(true)} className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${isRoundTrip ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>Round Trip</button>
                    </div>
                    <div className={`grid gap-4 ${isRoundTrip ? "grid-cols-2" : "grid-cols-1"}`}>
                        <label className="block text-sm font-semibold text-slate-700">Departure
                            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 ${inputRing}`} />
                        </label>
                        {isRoundTrip && (
                            <label className="block text-sm font-semibold text-slate-700">Return
                                <input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 ${inputRing}`} />
                            </label>
                        )}
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">Travellers
                        <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 p-1">
                            <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} className="h-10 w-10 text-xl font-bold text-slate-500">>−</button>
                            <span className="font-bold text-brand-ink">{guests} Persons</span>
                            <button type="button" onClick={() => setGuests(guests + 1)} className="h-10 w-10 text-xl font-bold text-slate-500">+</button>
                        </div>
                    </label>
                </div>
              ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block text-sm font-semibold text-slate-700">Check-in
                            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 ${inputRing}`} />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">Check-out
                            <input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} className={`mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 ${inputRing}`} />
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block text-sm font-semibold text-slate-700">Rooms
                            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 p-1">
                                <button type="button" onClick={() => setRooms(Math.max(1, rooms - 1))} className="h-10 w-10 text-xl font-bold text-slate-500">>−</button>
                                <span className="font-bold text-brand-ink">{rooms}</span>
                                <button type="button" onClick={() => setRooms(rooms + 1)} className="h-10 w-10 text-xl font-bold text-slate-500">+</button>
                            </div>
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">Guests
                            <div className="mt-1.5 flex items-center justify-between rounded-xl border border-slate-200 p-1">
                                <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} className="h-10 w-10 text-xl font-bold text-slate-500">>−</button>
                                <span className="font-bold text-brand-ink">{guests}</span>
                                <button type="button" onClick={() => setGuests(guests + 1)} className="h-10 w-10 text-xl font-bold text-slate-500">+</button>
                            </div>
                        </label>
                    </div>
                </div>
              )}

              <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-xl">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-400">Total Price</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{priceBreakdown}</p>
                    </div>
                    <p className="font-display text-3xl font-bold">{totalPreview != null ? formatInrWithDecimals(totalPreview) : "—"}</p>
                </div>
                <button type="button" onClick={goToDetails} disabled={loading || totalPreview == null} className={`mt-6 w-full rounded-2xl py-4 font-bold text-white transition-all disabled:opacity-50 ${primaryBtn}`}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "details" && (
            <form onSubmit={goToRewards} className="space-y-6">
              {isStayora ? (
                <div className="space-y-4">
                    <h3 className="font-display font-bold text-brand-ink">Primary Tenant Info</h3>
                    <label className="block text-sm font-medium text-slate-700">Full Name
                        <input type="text" required value={tenantName} onChange={e => setTenantName(e.target.value)} className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 ${inputRing}`} />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">Contact Number (optional)
                        <input type="tel" value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 ${inputRing}`} placeholder="+91 ..." />
                    </label>
                </div>
              ) : (
                <div className="space-y-4">
                    <h3 className="font-display font-bold text-brand-ink">Traveller Details</h3>
                    {Array.from({ length: guests }).map((_, i) => (
                        <label key={i} className="block text-sm font-medium text-slate-700">Guest {i + 1} Name
                            <input type="text" required value={guestNames[i] || ""} onChange={e => {
                                const next = [...guestNames];
                                next[i] = e.target.value;
                                setGuestNames(next);
                            }} className={`mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 ${inputRing}`} />
                        </label>
                    ))}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep("dates")} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600">Back</button>
                <button type="submit" className={`flex-1 rounded-xl py-3 font-semibold text-white ${primaryBtn}`}>Continue</button>
              </div>
            </form>
          )}

          {step === "rewards" && (
            <div className="space-y-6">
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
                    <p className="text-xs font-medium uppercase text-slate-400">Voyago Rewards</p>
                    <p className="mt-1 text-2xl font-bold">{user?.points || 0} Points</p>
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center"><h3 className="font-semibold">Redeem Points</h3><button type="button" onClick={() => setPointsToUse(maxPointsUsable)} className="text-sm font-semibold text-rose-600">Max</button></div>
                    <div className="flex items-center gap-3">
                        <input type="number" max={maxPointsUsable} value={pointsToUse} onChange={e => setPointsToUse(Math.min(maxPointsUsable, Number(e.target.value) || 0))} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" />
                        <div className="whitespace-nowrap rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">- {formatInrWithDecimals((pointsToUse/100)*10)}</div>
                    </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span>Base</span><span>{formatInrWithDecimals(totalPreview)}</span></div>
                    <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>- {formatInrWithDecimals((pointsToUse/100)*10)}</span></div>
                    <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Final Price</span><span>{formatInrWithDecimals(totalPreview - (pointsToUse/100)*10)}</span></div>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setStep("details")} className="flex-1 rounded-xl border py-3 text-sm">Back</button>
                    <button type="button" onClick={submitBooking} disabled={loading} className={`flex-1 rounded-xl py-3 font-semibold text-white ${primaryBtn}`}>{loading ? "..." : "Confirm"}</button>
                </div>
            </div>
          )}

          {step === "payment" && booking && <PaymentPanel totalPrice={booking.finalPrice ?? booking.totalPrice} loading={loading} onPay={payNow} />}
          {step === "ticket" && booking && (
            <div className="space-y-6 text-center">
              <TicketFace booking={booking} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadBookingTicketPdf(booking)}
                  className={`flex-1 rounded-2xl py-4 font-bold text-white shadow-xl transition hover:scale-[1.02] active:scale-[0.98] ${primaryBtn}`}
                >
                  Download Ticket
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-slate-200 py-4 font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
