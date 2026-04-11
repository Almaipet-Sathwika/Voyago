/** Mirror server logic for live total preview. */
export function previewBookingTotal(itemType, unitPrice, checkIn, checkOut, guests) {
  const g = Math.max(1, Number(guests) || 1);
  const price = Number(unitPrice);
  if (itemType === "flight") {
    return Math.round(price * g * 100) / 100;
  }
  const d0 = checkIn ? new Date(checkIn) : null;
  const d1 = checkOut ? new Date(checkOut) : null;
  if (!d0 || !d1 || Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime()) || d1 < d0) {
    return null;
  }
  const utc0 = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const diff = Math.round((utc1 - utc0) / 86400000);
  const nights = Math.max(1, diff);
  return Math.round(nights * price * 100) / 100;
}

export function defaultDateRange() {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return {
    checkIn: start.toISOString().slice(0, 10),
    checkOut: end.toISOString().slice(0, 10),
  };
}
