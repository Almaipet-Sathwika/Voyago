import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 4000 },
    description: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    imageUrl: { type: String, required: true },
    host: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ownerName: { type: String, required: true, trim: true },
    ownerPhone: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: true },
    securityDeposit: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("Property", propertySchema);
