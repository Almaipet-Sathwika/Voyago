import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Property from "../models/Property.js";
import { authRequired, hostOnly } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Only JPEG, PNG, GIF, WebP images allowed"));
  },
});

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await Property.find().populate("host", "name email").sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await Property.findById(req.params.id).populate("host", "name email").lean();
    if (!item) return res.status(404).json({ message: "Property not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/", authRequired, hostOnly, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { name, location, price, description, rating, imageUrl, ownerName, ownerPhone, ownerEmail, isVerified, securityDeposit, tags } = req.body;
    if (!name || !location || price == null || !description || rating == null) {
      return res.status(400).json({ message: "name, location, price, description, and rating are required" });
    }
    if (Number(price) < 4000) {
      return res.status(400).json({ message: "Minimum rent must be ₹4,000" });
    }
    let finalImage = imageUrl?.trim() || "";
    if (req.file) {
      finalImage = `/uploads/${req.file.filename}`;
    }
    if (!finalImage) {
      return res.status(400).json({ message: "Provide imageUrl or upload an image file" });
    }
    const tagArray = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t) : ["Budget Friendly"]);

    const property = await Property.create({
      name,
      location,
      price: Number(price),
      description,
      rating: Number(rating),
      imageUrl: finalImage,
      host: req.userId,
      ownerName: ownerName || "Voyago Verified Owner",
      ownerPhone: ownerPhone || "+91 90000 00000",
      ownerEmail: ownerEmail || "owner@voyago.com",
      isVerified: isVerified !== undefined ? isVerified : true,
      securityDeposit: Number(securityDeposit) || 0,
      tags: tagArray,
    });
    const populated = await Property.findById(property._id).populate("host", "name email").lean();
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id", authRequired, hostOnly, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (property.host?.toString() !== req.userId) {
      return res.status(403).json({ message: "You can only edit your own listings" });
    }
    const { name, location, price, description, rating, imageUrl, ownerName, ownerPhone, ownerEmail, isVerified, securityDeposit, tags } = req.body;
    if (name != null) property.name = name;
    if (location != null) property.location = location;
    if (price != null) {
      if (Number(price) < 4000) {
        return res.status(400).json({ message: "Minimum rent must be ₹4,000" });
      }
      property.price = Number(price);
    }
    if (description != null) property.description = description;
    if (rating != null) property.rating = Number(rating);
    if (ownerName != null) property.ownerName = ownerName;
    if (ownerPhone != null) property.ownerPhone = ownerPhone;
    if (ownerEmail != null) property.ownerEmail = ownerEmail;
    if (isVerified != null) property.isVerified = isVerified;
    if (securityDeposit != null) property.securityDeposit = Number(securityDeposit);
    if (tags != null) {
      property.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t) : property.tags);
    }

    if (req.file) property.imageUrl = `/uploads/${req.file.filename}`;
    else if (imageUrl?.trim()) property.imageUrl = imageUrl.trim();
    await property.save();
    const populated = await Property.findById(property._id).populate("host", "name email").lean();
    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete("/:id", authRequired, hostOnly, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (property.host?.toString() !== req.userId) {
      return res.status(403).json({ message: "You can only delete your own listings" });
    }
    await property.deleteOne();
    res.json({ message: "Deleted", id: req.params.id });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
