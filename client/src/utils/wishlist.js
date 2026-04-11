const KEY = "voyago_wishlist_v1";

function parse() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** @returns {string[]} list of keys like "hotel:<id>" */
export function getWishlistKeys() {
  return parse();
}

export function wishlistKey(itemType, itemId) {
  return `${itemType}:${itemId}`;
}

export function isWishlisted(itemType, itemId) {
  const k = wishlistKey(itemType, itemId);
  return parse().includes(k);
}

export function toggleWishlist(itemType, itemId) {
  const k = wishlistKey(itemType, itemId);
  const cur = parse();
  const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("wishlist-updated"));
  return next.includes(k);
}
