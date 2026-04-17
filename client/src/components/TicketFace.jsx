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
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase ${
      paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
    }`}>
      {paid ? "Paid" : "Pending"}
    </span>
  );
}

export default function TicketFace({ booking, id = "voyago-ticket-capture" }) {
  if (!booking) return null;

  const pay = booking.paymentStatus || (booking.status === "paid" ? "Paid" : "Pending");
  const moduleName = voyagoModuleFromItemType(booking.itemType);
  const isStayora = moduleName === "Stayora";
  const isHotel = booking.itemType === "hotel";
  const isFlight = booking.itemType === "flight";

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div
        id={id}
        className="relative w-[800px] mx-auto overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        style={{ minHeight: "420px" }}
      >
      {/* Header with Module Accent */}
      <header className={`flex items-center justify-between px-10 py-8 text-white ${
        isStayora ? "bg-orange-600" : "bg-rose-600"
      }`}>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl font-black tracking-tighter uppercase italic">Voyago</h1>
          <p className="text-sm font-medium opacity-80 uppercase tracking-widest">{moduleName} Booking Ticket</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PaymentPill status={pay} />
          <p className="font-mono text-xs opacity-70">ID: {booking._id}</p>
        </div>
      </header>

      {/* Main Content (Landscape Layout) */}
      <div className="grid grid-cols-12 gap-0">
        {/* Left Side: Booking & User details */}
        <div className="col-span-8 p-10 space-y-8 border-r border-dashed border-slate-200">
           <section>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                {isFlight ? "Flight Route" : isHotel ? "Hotel Property" : "Rental Property"}
              </h4>
              <p className="font-display text-2xl font-bold text-brand-ink leading-tight">{booking.itemName}</p>
              <p className="text-sm text-slate-500 mt-1 capitalize">{booking.itemType} • {booking.location || "Voyago Verified Location"}</p>
           </section>

           <div className="grid grid-cols-2 gap-8">
              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Schedule</h4>
                <div className="flex items-center gap-4 py-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{formatDate(booking.startDate)}</p>
                    <p className="text-[10px] text-slate-400 uppercase">Start Date</p>
                  </div>
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatDate(booking.endDate)}</p>
                    <p className="text-[10px] text-slate-400 uppercase">End Date</p>
                  </div>
                </div>
                {booking.duration && (
                  <p className="mt-2 inline-block rounded-lg bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 italic">
                    ⏳ Duration: {booking.duration}
                  </p>
                )}
              </section>

              <section>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {isStayora ? "Tenant Details" : "Passenger/Guest Info"}
                </h4>
                <div className="mt-2 mt-4">
                  <p className="text-sm font-bold text-slate-900 line-clamp-2">
                    {isStayora ? (booking.tenantName || "Primary Tenant") : (booking.guestNames?.join(", ") || "—")}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase mt-1">
                    {isStayora ? (booking.tenantPhone || "No contact info") : `Total: ${booking.guests} Travellers`}
                  </p>
                </div>
              </section>
           </div>
        </div>

        {/* Right Side: Price & Inventory (Stub Section) */}
        <div className="col-span-4 bg-slate-50 p-10 flex flex-col justify-between">
           <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Inventory</h4>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Occupancy</span>
                    <span className="font-bold">{booking.guests} {booking.guests === 1 ? 'Person' : 'Persons'}</span>
                 </div>
                 {booking.rooms > 0 && (
                   <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Rooms</span>
                      <span className="font-bold">{booking.rooms}</span>
                   </div>
                 )}
              </div>
           </div>

           <div className="pt-8 text-right">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Price</h4>
              <p className="font-display text-3xl font-black text-brand-ink">{formatInrWithDecimals(booking.totalPrice)}</p>
              <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tighter italic">Voyago Verified Pricing</p>
           </div>
        </div>
      </div>

      {/* Perforated Line Decoration */}
      <div className="absolute left-[66.6%] top-32 bottom-0 w-px border-l-2 border-dashed border-white/20"></div>

      <footer className="bg-slate-900 px-10 py-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Thank you for choosing Voyago • This is an electronic ticket valid for all Tripora & Stayora modules.
        </p>
      </footer>
    </div>
  </div>
  );
}
