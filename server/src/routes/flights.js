import { Router } from "express";
import Flight from "../models/Flight.js";
import { authRequired, hostOnly } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await Flight.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await Flight.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Flight not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/", authRequired, hostOnly, async (req, res) => {
  try {
    const { name, location, price, description, rating, imageUrl } = req.body;
    if (!name || !location || price == null || !description || rating == null || !imageUrl) {
      return res.status(400).json({ message: "All fields including imageUrl are required" });
    }
    const flight = await Flight.create({
      name,
      location,
      price: Number(price),
      description,
      rating: Number(rating),
      imageUrl,
      host: req.userId,
    });
    res.status(201).json(flight);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id", authRequired, hostOnly, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.price != null) updates.price = Number(updates.price);
    if (updates.rating != null) updates.rating = Number(updates.rating);
    const flight = await Flight.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!flight) return res.status(404).json({ message: "Flight not found" });
    res.json(flight);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/:id", authRequired, hostOnly, async (req, res) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);
    if (!flight) return res.status(404).json({ message: "Flight not found" });
    res.json({ message: "Deleted", id: req.params.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
