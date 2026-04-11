import { formatInrWithDecimals } from "../utils/formatInr.js";
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

function PaymentPill({ status }) {
  const paid = status === "Paid";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${
        paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
      }`}
    >
      {paid ? "Paid" : "Pending"}
    </span>
  );
}

/**
 * Shared professional ticket layout (Tailwind). Used in TicketModal and booking success step.
 */
export default function TicketFace({ booking, className = "" }) {
  if (!booking) return null;

  const pay = booking.paymentStatus || (booking.status === "paid" ? "Paid" : "Pending");
  const guestList =
    Array.isArray(booking.guestNames) && booking.guestNames.length ? booking.guestNames.join(" · ") : "—";
  const moduleName = voyagoModuleFromItemType(booking.itemType);
  const stayoraVisual = moduleName === "Stayora";

  const headerGradient = stayoraVisual
    ? "bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500"
    : "bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400";

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_rgba(15,23,42,0.08)] ${className}`}
    >
      <header className={`relative px-6 py-5 text-white ${headerGradient}`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-90" />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">Voyago</p>
            <h3 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Voyago Booking Ticket</h3>
            <p className="mt-0.5 text-sm text-white/90">
              Module · <span className="font-semibold">{moduleName}</span>
            </p>
          </div>
          <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0">
            <PaymentPill status={pay} />
          </div>
        </div>
      </header>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <div className="px-6 py-6">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Booking ID</p>
          <p className="mt-1 break-all font-mono text-sm font-medium text-slate-900">{booking._id}</p>
        </div>

        <div className="my-6 h-px bg-slate-200" />

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Trip</h4>
            <p className="mt-2 font-display text-lg font-semibold text-slate-900">{booking.itemName}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{booking.itemType}</p>
          </section>
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Schedule</h4>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Start</dt>
                <dd className="font-medium text-slate-900">{formatDate(booking.startDate)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">End</dt>
                <dd className="font-medium text-slate-900">{formatDate(booking.endDate)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="my-6 h-px bg-slate-200" />

        <div className="grid gap-6 sm:grid-cols-2">
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Guests</h4>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{booking.guests}</p>
            <p className="text-xs text-slate-500">total guests</p>
          </section>
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Guest names</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-800">{guestList}</p>
          </section>
        </div>

        <div className="my-6 h-px bg-slate-200" />

        <div className="flex flex-col items-stretch justify-between gap-4 rounded-xl bg-slate-900 px-5 py-4 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Total</p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight">{formatInrWithDecimals(booking.totalPrice)}</p>
          </div>
          <div className="text-right sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Payment</p>
            <p className="mt-1 text-sm font-semibold">{pay}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
