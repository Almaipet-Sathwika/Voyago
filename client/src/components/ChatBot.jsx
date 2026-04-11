import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { formatInr } from "../utils/formatInr.js";
import { useAppMode } from "../context/AppModeContext.jsx";

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-xs font-bold text-white shadow-sm">
          V
        </span>
        <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 shadow-sm">
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCards({ results }) {
  if (!results?.length) return null;
  const typeStyle = {
    hotel: "bg-rose-50 text-rose-800 ring-rose-200/80",
    property: "bg-orange-50 text-orange-900 ring-orange-200/80",
    flight: "bg-sky-50 text-sky-900 ring-sky-200/80",
  };
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-1">
      {results.slice(0, 10).map((r) => (
        <div
          key={String(r._id)}
          className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm transition hover:border-rose-200/80 hover:shadow-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 font-semibold leading-snug text-slate-900">{r.name}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${typeStyle[r.type] || "bg-slate-100 text-slate-700 ring-slate-200"}`}
            >
              {r.type}
            </span>
          </div>
          <p className="mt-1.5 text-lg font-bold tabular-nums text-slate-900">{formatInr(r.price)}</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{r.location}</p>
          {r.rating != null && (
            <p className="mt-1.5 text-[11px] font-medium text-amber-700">★ {Number(r.rating).toFixed(1)} guest rating</p>
          )}
        </div>
      ))}
    </div>
  );
}

function welcomeForMode(mode) {
  if (mode === "stayora") {
    return "Hi! 👋 I’m your Voyago Assistant — here for Stayora (rentals & properties). Try “under ₹5000”, “apartment in Goa”, or “homely stay near beach” and I’ll search live listings.";
  }
  return "Hi! 👋 I’m your Voyago Assistant — here for Tripora (hotels & flights). Try “under ₹5000”, “hotels in Delhi”, or “cheap flights” and I’ll pull live results in ₹.";
}

export default function ChatBot() {
  const { mode } = useAppMode();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [{ role: "bot", text: welcomeForMode("tripora") }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: "bot", text: welcomeForMode(mode) }]);
  }, [mode]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, module: mode }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.reply || "No reply.",
          results: Array.isArray(data.results) ? data.results : [],
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "Hmm — I can’t reach the server right now. Is the API running? Try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const panel = open ? (
    <div className="fixed bottom-24 right-4 z-[95] flex w-[min(100vw-1.25rem,420px)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] sm:bottom-28 sm:right-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 px-4 py-3.5 text-white">
        <div>
          <p className="font-display text-sm font-bold">Voyago Assistant</p>
          <p className="text-[11px] text-white/85">
            {mode === "stayora" ? "Stayora · rentals & ₹ prices" : "Tripora · hotels, flights & ₹"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1.5 transition hover:bg-white/20"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[min(58vh,480px)] space-y-4 overflow-y-auto scroll-smooth bg-gradient-to-b from-slate-50/80 to-white px-3 py-4"
      >
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {msg.role === "bot" && (
              <span className="mr-2 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-xs font-bold text-white shadow-sm">
                V
              </span>
            )}
            <div className="max-w-[min(100%,340px)]">
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "rounded-br-md bg-rose-600 text-white"
                    : "rounded-bl-md border border-slate-100/80 bg-white text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.role === "bot" && <ResultCards results={msg.results} />}
            </div>
          </div>
        ))}
        {loading && <TypingIndicator />}
      </div>

      <div className="border-t border-slate-100 bg-white p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={
              mode === "stayora"
                ? "e.g. homely rental under 8000…"
                : "e.g. cheap hotels under 5000…"
            }
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/25"
          />
          <button
            type="button"
            onClick={send}
            disabled={loading}
            className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {createPortal(panel, document.body)}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-4 z-[95] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 to-orange-500 text-xl text-white shadow-lg ring-4 ring-white transition hover:scale-105 active:scale-95 sm:right-6"
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Open Voyago Assistant"}
      >
        💬
      </button>
    </>
  );
}
