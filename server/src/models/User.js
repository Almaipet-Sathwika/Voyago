import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["guest", "host"], default: "guest" },
    points: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
