import { jsPDF } from "jspdf";
import { formatInrWithDecimals } from "./formatInr.js";
import { voyagoModuleFromItemType } from "./voyagoModule.js";

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

export function downloadBookingTicketPdf(booking) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 18;
  const contentW = pageW - m * 2;
  let y = m;

  const pay = String(booking.paymentStatus || (booking.status === "paid" ? "Paid" : "Pending"));
  const guestNames =
    Array.isArray(booking.guestNames) && booking.guestNames.length ? booking.guestNames.join(" · ") : "—";
  const moduleName = voyagoModuleFromItemType(booking.itemType);

  const line = (y1) => {
    doc.setDrawColor(210, 214, 220);
    doc.setLineWidth(0.35);
    doc.line(m, y1, pageW - m, y1);
  };

  doc.setFillColor(225, 29, 72);
  doc.rect(0, 0, pageW, 32, "F");
  doc.setFillColor(249, 115, 22);
  doc.rect(pageW * 0.45, 0, pageW * 0.55, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Voyago", m, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Voyago Booking Ticket · ${moduleName}`, m, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(pay, pageW - m, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("Payment status", pageW - m, 24, { align: "right" });

  y = 40;
  doc.setTextColor(30, 41, 59);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("BOOKING ID", m, y);
  y += 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  const idLines = doc.splitTextToSize(String(booking._id), contentW);
  doc.text(idLines, m, y);
  y += idLines.length * 4.5 + 4;

  line(y);
  y += 8;

  const colGap = 8;
  const colW = (contentW - colGap) / 2;
  const col2 = m + colW + colGap;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("TRIP / STAY", m, y);
  doc.text("SCHEDULE", col2, y);
  y += 6;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(String(booking.itemName || "—"), colW);
  doc.text(titleLines, m, y);
  const titleH = titleLines.length * 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Start: ${formatDate(booking.startDate)}`, col2, y);
  doc.text(`End:   ${formatDate(booking.endDate)}`, col2, y + 6);

  y += Math.max(titleH, 18) + 6;
  line(y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("MODULE", m, y);
  doc.text("ITEM TYPE", col2, y);
  y += 6;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(moduleName, m, y);
  doc.text(String(booking.itemType || "—"), col2, y);
  y += 10;
  line(y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("GUESTS", m, y);
  doc.text("GUEST NAMES", col2, y);
  y += 6;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(String(booking.guests ?? "—"), m, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const nameLines = doc.splitTextToSize(guestNames, colW);
  doc.text(nameLines, col2, y);

  y += Math.max(12, nameLines.length * 5) + 6;
  line(y);
  y += 10;

  doc.setFillColor(15, 23, 42);
  doc.rect(m, y, contentW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL (INR)", m + 4, y + 8);
  doc.setFontSize(16);
  doc.text(formatInrWithDecimals(booking.totalPrice), m + 4, y + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Payment: ${pay}`, pageW - m - 4, y + 13, { align: "right" });

  y += 30;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.text("Simulated Voyago ticket (Tripora & Stayora demo).", m, pageH - 10);

  doc.save(`voyago-ticket-${String(booking._id).slice(-8)}.pdf`);
}
