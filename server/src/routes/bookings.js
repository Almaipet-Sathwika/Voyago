import { Router } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Flight from "../models/Flight.js";
import Property from "../models/Property.js";
import User from "../models/User.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

const PAY_METHODS = ["upi", "qr", "card"];

// Rewards Config
const EARNED_POINTS = {
  hotel: 80,
  flight: 120,
  property: 100,
};

function normalizeBookingDoc(b) {
  if (!b) return b;
  const paymentStatus =
    b.paymentStatus ||
    (b.status === "paid" || b.status === "confirmed" ? "Paid" : "Pending");
  const bookingStatus =
    b.bookingStatus || (b.status === "cancelled" ? "Cancelled" : "Active");
  return {
    ...b,
    guestNames: Array.isArray(b.guestNames) ? b.guestNames : [],
    paymentStatus,
    bookingStatus,
  };
}

function parseDay(d) {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

/** Hotel/property: nights between check-in and check-out (min 1). Flight: price * guests. */
function computeBookingTotal(itemType, unitPrice, checkIn, checkOut, guests) {
  const g = Math.max(1, Number(guests) || 1);
  const price = Number(unitPrice);
  if (itemType === "flight") {
    return Math.round(price * g * 100) / 100;
  }
  const d0 = parseDay(checkIn);
  const d1 = parseDay(checkOut);
  if (!d0 || !d1 || d1 < d0) return null;
  const utc0 = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const diff = Math.round((utc1 - utc0) / 86400000);
  const nights = Math.max(1, diff);
  return Math.round(nights * price * 100) / 100;
}

async function loadItem(itemType, itemId) {
  if (!mongoose.Types.ObjectId.isValid(itemId)) return null;
  if (itemType === "hotel") return Hotel.findById(itemId).lean();
  if (itemType === "flight") return Flight.findById(itemId).lean();
  if (itemType === "property") return Property.findById(itemId).lean();
  return null;
}

router.get("/", authRequired, async (req, res) => {
  try {
    const list = await Booking.find({ user: req.userId }).sort({ createdAt: -1 }).lean();
    res.json(list.map(normalizeBookingDoc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/all", authRequired, async (req, res) => {
  if (req.userRole !== "host") {
    return res.status(403).json({ message: "Host only" });
  }
  try {
    const list = await Booking.find().populate("user", "name email").sort({ createdAt: -1 }).lean();
    res.json(list.map(normalizeBookingDoc));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const { itemType, itemId, checkIn, checkOut, guests, startDate, endDate, guestNames, pointsToUse = 0 } = req.body;
    const cin = checkIn ?? startDate;
    const cout = checkOut ?? endDate;

    if (!itemType || !itemId || !cin || !cout) {
      return res.status(400).json({
        message: "itemType, itemId, checkIn, and checkOut (or startDate/endDate) are required",
      });
    }
    if (!["hotel", "flight", "property"].includes(itemType)) {
      return res.status(400).json({ message: "Invalid itemType" });
    }

    const item = await loadItem(itemType, itemId);
    if (!item) return res.status(404).json({ message: "Listing not found" });

    const guestCount = Math.max(1, Math.min(50, Number(guests) || 1));

    if (!Array.isArray(guestNames) || guestNames.length !== guestCount) {
      return res.status(400).json({
        message: `guestNames must be an array of exactly ${guestCount} non-empty names (one per guest)`,
      });
    }
    const trimmedNames = guestNames.map((n) => String(n ?? "").trim());
    if (trimmedNames.some((n) => !n)) {
      return res.status(400).json({ message: "Each guest must have a name" });
    }

    const totalPrice = computeBookingTotal(itemType, item.price, cin, cout, guestCount);
    if (totalPrice == null) {
      return res.status(400).json({ message: "Invalid dates" });
    }

    // Reward Logic
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const pointsUsed = Math.max(0, Number(pointsToUse) || 0);
    if (pointsUsed > user.points) {
      return res.status(400).json({ message: "Not enough points" });
    }

    const discountAmount = (pointsUsed / 100) * 10;
    const maxDiscount = totalPrice * 0.2;
    if (discountAmount > maxDiscount) {
      return res.status(400).json({ message: "Discount exceeds max 20% limit" });
    }

    const finalPrice = Math.round((totalPrice - discountAmount) * 100) / 100;
    const earned = EARNED_POINTS[itemType] || 0;

    // Deduct points
    user.points -= pointsUsed;
    await user.save();

    const booking = await Booking.create({
      user: req.userId,
      itemType,
      itemId,
      itemName: item.name,
      startDate: new Date(cin),
      endDate: new Date(cout),
      guests: guestCount,
      guestNames: trimmedNames,
      totalPrice,
      pointsUsed,
      discountAmount,
      finalPrice,
      pointsEarned: earned,
      status: "booked",
      paymentStatus: "Pending",
      bookingStatus: "Active",
      paymentMethod: "",
    });

    res.status(201).json({
      ...normalizeBookingDoc(booking.toObject()),
      userPoints: user.points
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id/pay", authRequired, async (req, res) => {
  try {
    const { paymentMethod } = req.body || {};
    if (!PAY_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: "paymentMethod must be one of: upi, qr, card" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.user?.toString() !== req.userId) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (booking.status === "cancelled" || booking.bookingStatus === "Cancelled") {
      return res.status(400).json({ message: "Cannot pay a cancelled booking" });
    }
    if (booking.paymentStatus === "Paid" || booking.status === "paid" || booking.status === "confirmed") {
      return res.json(normalizeBookingDoc(booking.toObject()));
    }

    booking.status = "paid";
    booking.paymentStatus = "Paid";
    booking.paymentMethod = paymentMethod;
    booking.bookingStatus = "Active";

    // Award earned points only after payment
    const user = await User.findById(req.userId);
    if (user) {
      user.points += (booking.pointsEarned || 0);
      await user.save();
    }

    await booking.save();
    res.json({
      ...normalizeBookingDoc(booking.toObject()),
      userPoints: user ? user.points : undefined
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id/cancel", authRequired, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.user?.toString() !== req.userId && req.userRole !== "host") {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (booking.status === "cancelled") {
      return res.json(normalizeBookingDoc(booking.toObject()));
    }

    const wasPaid = booking.paymentStatus === "Paid";

    booking.status = "cancelled";
    booking.bookingStatus = "Cancelled";
    await booking.save();

    // Refund points
    const user = await User.findById(booking.user);
    if (user) {
      user.points += (booking.pointsUsed || 0);
      // If was paid, we should ideally deduct earned points, but usually points are granted on completion
      // Let's keep it simple: if it's cancelled, we only refund what was used.
      // If we want to be strict, if wasPaid, user.points -= booking.pointsEarned
      if (wasPaid) {
        user.points = Math.max(0, user.points - (booking.pointsEarned || 0));
      }
      await user.save();
    }

    res.json({
      ...normalizeBookingDoc(booking.toObject()),
      userPoints: user ? user.points : undefined
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id", authRequired, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.user?.toString() !== req.userId && req.userRole !== "host") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const {
      itemType,
      itemId,
      itemName,
      startDate,
      endDate,
      checkIn,
      checkOut,
      guests,
      totalPrice,
      status,
      guestNames,
      paymentStatus,
      bookingStatus,
    } = req.body;
    if (itemType != null) booking.itemType = itemType;
    if (itemId != null) booking.itemId = itemId;
    if (itemName != null) booking.itemName = itemName;
    const s = checkIn ?? startDate;
    const e = checkOut ?? endDate;
    if (s) booking.startDate = new Date(s);
    if (e) booking.endDate = new Date(e);
    if (guests != null) booking.guests = Math.max(1, Number(guests));
    if (Array.isArray(guestNames)) booking.guestNames = guestNames.map((n) => String(n ?? "").trim()).filter(Boolean);
    if (totalPrice != null) booking.totalPrice = Number(totalPrice);
    if (
      status != null &&
      ["booked", "paid", "cancelled", "pending", "confirmed"].includes(status)
    ) {
      booking.status = status;
    }
    if (paymentStatus != null && ["Pending", "Paid"].includes(paymentStatus)) {
      booking.paymentStatus = paymentStatus;
    }
    if (bookingStatus != null && ["Active", "Cancelled"].includes(bookingStatus)) {
      booking.bookingStatus = bookingStatus;
    }
    await booking.save();
    res.json(normalizeBookingDoc(booking.toObject()));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.user?.toString() !== req.userId && req.userRole !== "host") {
      return res.status(403).json({ message: "Not allowed" });
    }
    await booking.deleteOne();
    res.json({ message: "Deleted", id: req.params.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
