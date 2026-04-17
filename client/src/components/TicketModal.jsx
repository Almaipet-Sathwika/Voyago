import { createPortal } from "react-dom";
import { downloadBookingTicketPdf } from "../utils/downloadTicketPdf.js";
import TicketFace from "./TicketFace.jsx";

export default function TicketModal({ open, onClose, booking }) {
  if (!open || !booking) return null;

  const modal = (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-slate-50 shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">Voyago Booking Ticket</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 p-5">
          <TicketFace booking={booking} />
          <button
            type="button"
            onClick={() => downloadBookingTicketPdf(booking)}
            className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
          >
            Download ticket (PDF)
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
