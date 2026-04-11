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

  const bookBtnClass =
    accent === "stayora"
      ? "bg-orange-500 hover:bg-orange-600"
      : "bg-rose-600 hover:bg-rose-500";

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card transition hover:shadow-xl hover:ring-1 hover:ring-slate-200/80">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <div className="rounded-full bg-white/95 px-2.5 py-1 text-sm font-semibold text-brand-ink shadow-sm">
            ★ {Number(rating).toFixed(1)}
          </div>
          {showWishlist && itemType && itemId && (
            <button
              type="button"
              onClick={heartClick}
              title={wishOn ? "Remove from wishlist" : "Save to wishlist"}
              className="rounded-full bg-white/95 p-2 text-lg shadow-sm transition hover:scale-105"
              aria-pressed={wishOn}
              aria-label={wishOn ? "Remove from wishlist" : "Add to wishlist"}
            >
              {wishOn ? "♥" : "♡"}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-brand-ink line-clamp-1">{title}</h3>
          <p className="text-sm text-slate-500">{location}</p>
        </div>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
        <p className="text-xs text-slate-500">
          {reviews} reviews · guests love the location
        </p>
        <p className="pt-1 font-semibold text-brand-ink">
          <span className="text-lg">{formatInr(price)}</span>
          <span className="text-sm font-normal text-slate-500"> / {priceLabel}</span>
        </p>
        {onBookNow && (
          <button
            type="button"
            onClick={onBookNow}
            disabled={bookDisabled}
            className={`mt-2 w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${bookBtnClass}`}
          >
            {bookLabel}
          </button>
        )}
      </div>
    </article>
  );
}
