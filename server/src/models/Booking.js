import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    itemType: { type: String, enum: ["hotel", "flight", "property"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    duration: { type: String }, // For Stayora: "15 Days", "1 Month", ...
    rooms: { type: Number, default: 1 }, // For Tripora Hotels
    guests: { type: Number, default: 1 },
    guestNames: { type: [String], default: [] },
    tenantName: { type: String }, // For Stayora
    tenantPhone: { type: String }, // For Stayora
    totalPrice: { type: Number, required: true, min: 0 },
    pointsUsed: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, default: null },
    pointsEarned: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["booked", "paid", "cancelled", "pending", "confirmed"],
      default: "booked",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
    bookingStatus: {
      type: String,
      enum: ["Active", "Cancelled"],
      default: "Active",
    },
    paymentMethod: {
      type: String,
      enum: ["", "upi", "qr", "card"],
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
