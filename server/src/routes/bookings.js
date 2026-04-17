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
function computeBookingTotal(itemType, unitPrice, { checkIn, checkOut, guests, duration, rooms }) {
  const g = Math.max(1, Number(guests) || 1);
  const price = Number(unitPrice);
  const roomCount = Math.max(1, Number(rooms) || 1);

  if (itemType === "flight") {
    // For flights, guests = number of tickets.
    return Math.round(price * g * 100) / 100;
  }

  if (itemType === "hotel") {
    const d0 = parseDay(checkIn);
    const d1 = parseDay(checkOut);
    if (!d0 || !d1 || d1 <= d0) return null;
    const utc0 = Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate());
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const nights = Math.max(1, Math.round((utc1 - utc0) / 86400000));
    return Math.round(price * nights * roomCount * 100) / 100;
  }

  if (itemType === "property") {
    // Stayora rentals are duration-based, guest count does NOT affect price.
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
  if (req.userRole !== "host" && req.userRole !== "admin") {
    return res.status(403).json({ message: "Host or Admin only" });
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
    const { 
      itemType, itemId, 
      checkIn, checkOut, 
      guests, rooms, duration, 
      tenantName, tenantPhone,
      guestNames, pointsToUse = 0 
    } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({ message: "itemType and itemId are required" });
    }
    const item = await loadItem(itemType, itemId);
    if (!item) return res.status(404).json({ message: "Listing not found" });

    let finalStart = checkIn;
    let finalEnd = checkOut;

    if (itemType === "property") {
      if (!duration) return res.status(400).json({ message: "duration is required for rentals" });
      finalStart = finalStart || new Date().toISOString();
      const s = new Date(finalStart);
      const e = new Date(s);
      if (duration === "15 Days") e.setDate(e.getDate() + 15);
      else if (duration === "1 Month") e.setMonth(e.getMonth() + 1);
      else if (duration === "2 Months") e.setMonth(e.getMonth() + 2);
      else if (duration === "3 Months") e.setMonth(e.getMonth() + 3);
      finalEnd = e.toISOString();
    } else if (itemType === "hotel" || (itemType === "flight" && checkOut)) {
        if (!finalStart || !finalEnd) return res.status(400).json({ message: "Dates are required" });
    } else if (itemType === "flight") {
        if (!finalStart) return res.status(400).json({ message: "Departure date is required" });
        finalEnd = finalEnd || finalStart;
    }

    const guestCount = itemType === "property" ? 1 : Math.max(1, Math.min(50, Number(guests) || 1));
    const roomCount = Math.max(1, Number(rooms) || 1);

    // Validation for guest names (not needed for Stayora)
    let processedNames = [];
    if (itemType !== "property") {
      if (!Array.isArray(guestNames) || guestNames.length !== guestCount) {
        return res.status(400).json({ message: `guestNames must have exactly ${guestCount} names` });
      }
      processedNames = guestNames.map(n => String(n || "").trim());
      if (processedNames.some(n => !n)) return res.status(400).json({ message: "Each guest must have a name" });
    }

    const totalPrice = computeBookingTotal(itemType, item.price, {
      checkIn: finalStart,
      checkOut: finalEnd,
      guests: guestCount,
      duration,
      rooms: roomCount,
    });
    
    if (totalPrice == null) return res.status(400).json({ message: "Invalid booking parameters" });

    const user = await User.findById(req.userId);
    const pointsUsed = Math.max(0, Number(pointsToUse) || 0);
    const discountAmount = (pointsUsed / 100) * 10;
    const finalPrice = Math.round((totalPrice - discountAmount) * 100) / 100;

    user.points -= pointsUsed;
    await user.save();

    const booking = await Booking.create({
      user: req.userId,
      itemType,
      itemId,
      itemName: item.name,
      startDate: new Date(finalStart),
      endDate: new Date(finalEnd),
      duration,
      rooms: roomCount,
      guests: guestCount,
      guestNames: processedNames,
      tenantName: itemType === "property" ? (tenantName || user.name) : undefined,
      tenantPhone: itemType === "property" ? tenantPhone : undefined,
      totalPrice,
      pointsUsed,
      discountAmount,
      finalPrice,
      pointsEarned: EARNED_POINTS[itemType] || 0,
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
