import { Router } from "express";
import Hotel from "../models/Hotel.js";
import { authRequired, hostOnly } from "../middleware/auth.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await Hotel.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await Hotel.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ message: "Hotel not found" });
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
    const hotel = await Hotel.create({
      name,
      location,
      price: Number(price),
      description,
      rating: Number(rating),
      imageUrl,
      host: req.userId,
    });
    res.status(201).json(hotel);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id", authRequired, hostOnly, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.price != null) updates.price = Number(updates.price);
    if (updates.rating != null) updates.rating = Number(updates.rating);
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });
    res.json(hotel);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/:id", authRequired, hostOnly, async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndDelete(req.params.id);
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });
    res.json({ message: "Deleted", id: req.params.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
