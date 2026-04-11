/** Format a number as Indian Rupees for display (₹ + en-IN grouping). */
export function formatInr(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatInrWithDecimals(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return "₹0.00";
  const hasDecimals = Math.round(n * 100) % 100 !== 0;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
