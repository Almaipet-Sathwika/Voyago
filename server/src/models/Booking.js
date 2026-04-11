import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    itemType: { type: String, enum: ["hotel", "flight", "property"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    itemName: { type: String, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    guests: { type: Number, required: true, min: 1, default: 1 },
    guestNames: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          return Array.isArray(arr) && arr.length <= 50;
        },
        message: "Too many guest names",
      },
    },
    totalPrice: { type: Number, required: true, min: 0 },
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
