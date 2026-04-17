/** Mirror server logic for live total preview. */
export function previewBookingTotal(itemType, unitPrice, { checkIn, checkOut, guests, duration, rooms }) {
  const g = Math.max(1, Number(guests) || 1);
  const price = Number(unitPrice);
  const roomCount = Math.max(1, Number(rooms) || 1);

  if (itemType === "flight") {
    return Math.round(price * g * 100) / 100;
  }

  if (itemType === "hotel") {
    const d0 = checkIn ? new Date(checkIn) : null;
    const d1 = checkOut ? new Date(checkOut) : null;
    if (!d0 || !d1 || Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime()) || d1 <= d0) {
      return null;
    }
    const utc0 = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate());
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const nights = Math.max(1, Math.round((utc1 - utc0) / 86400000));
    return Math.round(price * nights * roomCount * 100) / 100;
  }

  if (itemType === "property") {
    let multiplier = 1;
    if (duration === "15 Days") multiplier = 0.5;
    else if (duration === "1 Month") multiplier = 1;
    else if (duration === "2 Months") multiplier = 2;
    else if (duration === "3 Months") multiplier = 3;
    else return null;
    return Math.round(price * multiplier * 100) / 100;
  }

  return null;
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
