import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { seedDatabase } from "./seed.js";
import authRoutes from "./routes/auth.js";
import hotelRoutes from "./routes/hotels.js";
import flightRoutes from "./routes/flights.js";
import propertyRoutes from "./routes/properties.js";
import bookingRoutes from "./routes/bookings.js";
import chatRoutes from "./routes/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tripmate_homelyhub";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Voyago API", modules: ["Tripora", "Stayora"] });
});

app.use("/api/auth", authRoutes);
app.use("/api/hotels", hotelRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chat", chatRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Server error" });
});

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected:", MONGODB_URI.replace(/\/\/.*@/, "//***@"));
    await seedDatabase();
    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `\nPort ${PORT} is already in use (often a previous "npm run dev" still running).\n\n` +
            `Free the port (Windows):\n` +
            `  netstat -ano | findstr :${PORT}\n` +
            `  taskkill /PID <PID_from_last_column> /F\n\n` +
            `Or use another port: set PORT=5001 in server/.env and point Vite's proxy in client/vite.config.js to that port.\n`
        );
        process.exit(1);
      }
      throw err;
    });
  } catch (e) {
    console.error("Failed to start:", e.message);
    process.exit(1);
  }
}

start();
