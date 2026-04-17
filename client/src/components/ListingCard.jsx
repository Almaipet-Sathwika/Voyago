import { useEffect, useState } from "react";
import { imageSrc } from "../api/client";
import { formatInr } from "../utils/formatInr.js";
import { isWishlisted, toggleWishlist } from "../utils/wishlist.js";

function reviewCountFor(title) {
  let h = 0;
  const s = String(title || "");
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 3)) % 140;
  return 12 + h;
}

export default function ListingCard({
  title,
  location,
  price,
  description,
  rating,
  imageUrl,
  priceLabel = "night",
  onBookNow,
  bookDisabled,
  bookLabel = "Book now",
  itemType,
  itemId,
  showWishlist,
  accent = "tripora",
  tags = [],
  isVerified = false,
  renderActions,
}) {
  const img = imageSrc(imageUrl);
  const [wishOn, setWishOn] = useState(() =>
    itemType && itemId ? isWishlisted(itemType, itemId) : false
  );

  useEffect(() => {
    if (!itemType || !itemId) return;
    setWishOn(isWishlisted(itemType, itemId));
    const onUp = () => setWishOn(isWishlisted(itemType, itemId));
    window.addEventListener("wishlist-updated", onUp);
    return () => window.removeEventListener("wishlist-updated", onUp);
  }, [itemType, itemId]);

  const reviews = reviewCountFor(title);

  function heartClick(e) {
    e.stopPropagation();
    if (!itemType || !itemId) return;
    toggleWishlist(itemType, itemId);
    setWishOn(isWishlisted(itemType, itemId));
  }

  const isStayora = accent === "stayora";
  const displayPriceLabel = isStayora ? "month" : priceLabel;

  const bookBtnClass = isStayora
    ? "bg-orange-500 hover:bg-orange-600 shadow-orange-100"
    : "bg-rose-600 hover:bg-rose-500 shadow-rose-100";

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card transition duration-300 hover:shadow-xl hover:ring-1 hover:ring-slate-200/80">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-brand-ink shadow-sm backdrop-blur-md">
            <span className="text-yellow-500">★</span> {Number(rating).toFixed(1)}
          </div>
          {isStayora && isVerified && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              <span className="text-xs">✓</span> Verified
            </div>
          )}
          {showWishlist && itemType && itemId && (
            <button
              type="button"
              onClick={heartClick}
              title={wishOn ? "Remove from wishlist" : "Save to wishlist"}
              className={`rounded-full bg-white/95 p-2 text-lg shadow-sm transition hover:scale-110 ${
                wishOn ? "text-rose-500" : "text-slate-400"
              }`}
              aria-pressed={wishOn}
              aria-label={wishOn ? "Remove from wishlist" : "Add to wishlist"}
            >
              {wishOn ? "♥" : "♡"}
            </button>
          )}
        </div>
        {isStayora && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-slate-900/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div>
          <h3 className="font-display text-lg font-bold text-brand-ink line-clamp-1 group-hover:text-orange-600 transition-colors">
            {title}
          </h3>
          <p className="flex items-center gap-1 text-sm text-slate-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {location}
          </p>
        </div>
        
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
        
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="font-display font-bold text-brand-ink">
              <span className="text-xl">{formatInr(price)}</span>
              <span className="text-sm font-normal text-slate-500"> / {displayPriceLabel}</span>
            </p>
            {isStayora && price < 10000 && (
              <p className="text-[10px] font-bold uppercase tracking-tight text-emerald-600">
                Affordable living
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-medium text-slate-400">
              {reviews} reviews
            </p>
            <p className="text-[10px] text-slate-400">Trusted host</p>
          </div>
        </div>

        {renderActions ? (
          <div className="mt-3 flex gap-2">
            {renderActions}
          </div>
        ) : onBookNow && (
          <button
            type="button"
            onClick={onBookNow}
            disabled={bookDisabled}
            className={`mt-2 w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${bookBtnClass}`}
          >
            {isStayora ? "View & Contact" : bookLabel}
          </button>
        )}
      </div>
    </article>
  );
}
