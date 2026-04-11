import { useState } from "react";
import { formatInrWithDecimals } from "../utils/formatInr.js";

function DemoQr() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4">
      <svg viewBox="0 0 100 100" className="h-36 w-36 text-slate-900" aria-hidden>
        <rect width="100" height="100" fill="white" />
        <rect x="8" y="8" width="28" height="28" fill="currentColor" />
        <rect x="64" y="8" width="28" height="28" fill="currentColor" />
        <rect x="8" y="64" width="28" height="28" fill="currentColor" />
        <rect x="14" y="14" width="16" height="16" fill="white" />
        <rect x="70" y="14" width="16" height="16" fill="white" />
        <rect x="14" y="70" width="16" height="16" fill="white" />
        <rect x="44" y="12" width="6" height="6" fill="currentColor" />
        <rect x="54" y="22" width="6" height="6" fill="currentColor" />
        <rect x="40" y="40" width="8" height="8" fill="currentColor" />
        <rect x="52" y="40" width="8" height="8" fill="currentColor" />
        <rect x="40" y="52" width="8" height="8" fill="currentColor" />
        <rect x="72" y="44" width="6" height="20" fill="currentColor" />
        <rect x="44" y="72" width="40" height="6" fill="currentColor" />
        <rect x="44" y="82" width="6" height="10" fill="currentColor" />
      </svg>
      <p className="mt-2 text-center text-xs text-slate-500">Demo UPI QR — scan is simulated</p>
    </div>
  );
}

const methods = [
  { id: "upi", label: "UPI", desc: "Pay with any UPI app (simulated)" },
  { id: "qr", label: "QR code", desc: "Show QR and confirm" },
  { id: "card", label: "Debit / Credit card", desc: "Card payment (simulated)" },
];

/**
 * @param {{ totalPrice: number, disabled?: boolean, loading?: boolean, onPay: (method: 'upi'|'qr'|'card') => void }} props
 */
export default function PaymentPanel({ totalPrice, disabled, loading, onPay }) {
  const [selected, setSelected] = useState("upi");

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Total due: <span className="font-semibold text-brand-ink">{formatInrWithDecimals(totalPrice)}</span>
      </p>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment method</p>
        {methods.map((m) => (
          <label
            key={m.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm ${
              selected === m.id ? "border-rose-300 bg-rose-50/80" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="pay-method"
              className="mt-1"
              checked={selected === m.id}
              onChange={() => setSelected(m.id)}
            />
            <span>
              <span className="font-medium text-brand-ink">{m.label}</span>
              <span className="mt-0.5 block text-slate-500">{m.desc}</span>
            </span>
          </label>
        ))}
      </div>
      {selected === "qr" && <DemoQr />}
      {selected === "card" && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Card form omitted in demo — choosing this option still completes a simulated successful charge.
        </div>
      )}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onPay(selected)}
        className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Processing…" : "Pay now"}
      </button>
    </div>
  );
}
