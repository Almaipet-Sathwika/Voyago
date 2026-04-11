import { Router } from "express";
import Hotel from "../models/Hotel.js";
import Property from "../models/Property.js";
import Flight from "../models/Flight.js";

const router = Router();

const OPENERS_OK = [
  "Got it 👍",
  "Nice choice!",
  "On it —",
  "Sure thing!",
  "Love it —",
];

const OPENERS_RESULTS = [
  "Here are some options 👇",
  "Take a look at these 👇",
  "I pulled these for you 👇",
  "These match what you asked for 👇",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickFields(docs, type) {
  return docs.map((d) => {
    const desc = d.description || "";
    const priceNum = typeof d.price === "number" && Number.isFinite(d.price) ? d.price : Number(d.price);
    return {
      _id: d._id,
      type,
      name: d.name,
      location: d.location,
      price: priceNum,
      rating: d.rating,
      description: desc.length > 160 ? `${desc.slice(0, 160)}…` : desc,
    };
  });
}

function parseBudgetMax(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.replace(/,/g, " ");

  const patterns = [
    /\b(?:under|below|less\s+than|at\s+most|maximum|max\.?|upto|up\s*to|within|<=)\s*(?:rs\.?|inr|₹|rupees?)?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b/i,
    /\b(?:budget|affordable|afford|spend)\s*(?:of|is|:)?\s*(?:rs\.?|inr|₹|rupees?)?\s*(?:under|below|max)?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b/i,
    /₹\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b/i,
    /\brs\.?\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b/i,
    /\binr\s*(\d+(?:\.\d+)?)\s*(k|thousand)?\b/i,
  ];

  for (const re of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    let n = parseFloat(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (m[2] && /k|thousand/i.test(m[2])) n *= 1000;
    return Math.round(n);
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLocationFilter(message) {
  const m = message.match(/\b(?:in|near|at|around|within)\s+([A-Za-z][A-Za-z0-9\s,'.-]+)/i);
  if (!m) return null;
  let loc = m[1].trim();
  loc = loc.replace(/\s+\b(hotels?|rentals?|stays?|properties|flights?|rooms?|under|below|budget|for)\b.*$/i, "").trim();
  loc = loc.replace(/[,.;]+$/g, "").trim();
  if (loc.length < 2) return null;
  return new RegExp(escapeRegex(loc), "i");
}

function formatInrInReply(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function buildMongoFilter(budget, locationRx) {
  const filter = {};
  if (budget != null && Number.isFinite(budget) && budget > 0) {
    filter.price = { $lte: Number(budget) };
  }
  if (locationRx) {
    filter.location = locationRx;
  }
  return filter;
}

function isPureGreeting(text) {
  const t = text
    .toLowerCase()
    .replace(/[!?.…]+/g, "")
    .trim();
  if (t.length > 36) return false;
  return (
    /^(hi|hello|hey|heya|hiya|namaste|namaskar|good\s+(morning|afternoon|evening)|gm|yo|sup|wassup)(\s+there)?$/.test(t) ||
    /^(hi|hello|hey)\s+(there|team|tripmate|tripora|stayora|voyago|friend)$/.test(t)
  );
}

function isSmallTalk(text) {
  const lower = text.toLowerCase();
  return (
    /\bhow\s+are\s+you\b/.test(lower) ||
    /\bwhat'?s\s+up\b/.test(lower) ||
    /\bwhats\s+up\b/.test(lower) ||
    /\bwho\s+are\s+you\b/.test(lower) ||
    /\bhelp\s+me\b/.test(lower)
  );
}

router.post("/", async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) {
      return res.status(400).json({
        reply:
          "Say hi or tell me what you’re after — Tripora (hotels & flights), Stayora (rentals), or a budget in ₹.",
        results: [],
        meta: {},
      });
    }

    const lower = message.toLowerCase();
    const mod = String(req.body?.module ?? "").toLowerCase();
    const fromTripora = mod === "tripora";
    const fromStayora = mod === "stayora";
    const budget = parseBudgetMax(message);
    const locationRx = parseLocationFilter(message);

    const mentionHotel = /\b(hotel|hotels|room|rooms)\b/.test(lower);
    const mentionBroadStay =
      /\bstays?\b/.test(lower) ||
      /\b(lodging|accommodation|accommodations)\b/.test(lower) ||
      /\bplace\s+to\s+stay\b/.test(lower) ||
      /\bcheap\s+stays?\b/.test(lower);
    const mentionRental = /\b(rental|rentals|airbnb|apartment|property|properties|homely|home\s+stay)\b/.test(lower);
    const mentionFlight = /\b(flight|flights|fly|flying|airline|plane\s+ticket)\b/.test(lower);
    const wantsCheap = /\b(cheap|affordable|lowest|economy|budget|save\s+money)\b/.test(lower);
    const wantsNearby = /\b(nearby|near me|around here)\b/.test(lower);

    let includeHotels = true;
    let includeProperties = true;
    let includeFlights = false;

    if (mentionHotel && !mentionRental && !mentionFlight && !mentionBroadStay) {
      includeProperties = false;
    }
    if (mentionRental && !mentionHotel && !mentionFlight && !mentionBroadStay) {
      includeHotels = false;
    }
    if (mentionFlight && !mentionHotel && !mentionRental) {
      includeHotels = false;
      includeProperties = false;
      includeFlights = true;
    }
    if (mentionBroadStay && !mentionRental && !mentionFlight) {
      includeHotels = true;
      includeProperties = true;
      includeFlights = false;
    }
    if (wantsNearby && !locationRx) {
      includeFlights = false;
    }

    /* Voyago client module: Tripora vs Stayora (keyword intent still wins for cross-module asks). */
    if (fromTripora && !mentionRental && !mentionBroadStay) {
      includeProperties = false;
    }
    if (fromTripora && !mentionHotel && !mentionRental && !mentionFlight && !mentionBroadStay) {
      includeHotels = true;
      includeFlights = true;
    }
    if (fromStayora && !mentionHotel && !mentionFlight && !mentionBroadStay) {
      includeHotels = false;
      includeFlights = false;
      includeProperties = true;
    }

    const baseFilter = buildMongoFilter(budget, locationRx);
    const hasNumericFilter = Object.keys(baseFilter).length > 0;

    let hotels = [];
    let properties = [];
    let flights = [];

    if (isPureGreeting(message) && !budget && !locationRx && !wantsCheap && !mentionHotel && !mentionRental && !mentionFlight) {
      if (fromStayora) {
        const p = await Property.find().sort({ price: 1 }).limit(8).lean();
        properties = p;
        const results = pickFields(properties, "property");
        return res.json({
          reply:
            "Hey! 👋 Welcome to Voyago · Stayora. I search homely rentals in ₹ — try “apartment under 8000” or “rental in Goa”. Here are a few picks to explore:",
          results,
          meta: { intent: ["greeting"], module: "stayora", budget: null, hasLocation: false },
        });
      }
      if (fromTripora) {
        const [h, f] = await Promise.all([
          Hotel.find().sort({ price: 1 }).limit(4).lean(),
          Flight.find().sort({ price: 1 }).limit(4).lean(),
        ]);
        hotels = h;
        flights = f;
        const results = [...pickFields(hotels, "hotel"), ...pickFields(flights, "flight")];
        return res.json({
          reply:
            "Hey! 👋 Welcome to Voyago · Tripora. I search hotels and flights in ₹ — try “hotels under 5000” or “cheap flights to Mumbai”. Starter ideas below:",
          results,
          meta: { intent: ["greeting"], module: "tripora", budget: null, hasLocation: false },
        });
      }
      const [h, p] = await Promise.all([
        Hotel.find().sort({ price: 1 }).limit(5).lean(),
        Property.find().sort({ price: 1 }).limit(4).lean(),
      ]);
      hotels = h;
      properties = p;
      const results = [...pickFields(hotels, "hotel"), ...pickFields(properties, "property")];
      return res.json({
        reply:
          "Hey! 👋 Welcome to Voyago (Tripora + Stayora). I search live listings in ₹ — try “cheap stays under 5000” or “hotels in Goa”. Here are a few wallet-friendly picks:",
        results,
        meta: { intent: ["greeting"], budget: null, hasLocation: false },
      });
    }

    if (isSmallTalk(message) && !budget && !hasNumericFilter && !mentionHotel && !mentionRental && !mentionFlight && !wantsCheap) {
      if (fromStayora) {
        const p = await Property.find().sort({ price: 1 }).limit(5).lean();
        const results = pickFields(p, "property");
        return res.json({
          reply:
            "Doing great — thanks! 😊 I’m your Voyago Assistant for Stayora rentals in ₹. Here are a few homely options 👇",
          results,
          meta: { intent: ["smalltalk"], module: "stayora", budget: null, hasLocation: false },
        });
      }
      if (fromTripora) {
        const [h, f] = await Promise.all([
          Hotel.find().sort({ price: 1 }).limit(3).lean(),
          Flight.find().sort({ price: 1 }).limit(3).lean(),
        ]);
        const results = [...pickFields(h, "hotel"), ...pickFields(f, "flight")];
        return res.json({
          reply:
            "All good here! 😊 I’m tuned for Tripora — hotels & flights in ₹. Got it 👍 A few ideas 👇",
          results,
          meta: { intent: ["smalltalk"], module: "tripora", budget: null, hasLocation: false },
        });
      }
      const [h, p] = await Promise.all([
        Hotel.find().sort({ price: 1 }).limit(3).lean(),
        Property.find().sort({ price: 1 }).limit(3).lean(),
      ]);
      const results = [...pickFields(h, "hotel"), ...pickFields(p, "property")];
      return res.json({
        reply:
          "I’m doing great — thanks for asking! 😊 Voyago covers Tripora (travel) and Stayora (stays) in ₹. Here are a few ideas 👇",
        results,
        meta: { intent: ["smalltalk"], budget: null, hasLocation: false },
      });
    }

    if (hasNumericFilter || wantsCheap || wantsNearby || mentionHotel || mentionRental || mentionFlight || mentionBroadStay) {
      const tasks = [];
      if (includeHotels) tasks.push(Hotel.find(baseFilter).sort({ price: 1 }).limit(20).lean().then((d) => (hotels = d)));
      if (includeProperties) tasks.push(Property.find(baseFilter).sort({ price: 1 }).limit(20).lean().then((d) => (properties = d)));
      if (includeFlights) {
        tasks.push(Flight.find(baseFilter).sort({ price: 1 }).limit(20).lean().then((d) => (flights = d)));
      }
      await Promise.all(tasks);
    }

    if (!hasNumericFilter && !wantsCheap && !wantsNearby && hotels.length === 0 && properties.length === 0 && flights.length === 0) {
      const words = message
        .toLowerCase()
        .replace(/[₹?,._]+/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !/^(the|and|for|with|under|below|hi|hey|hello)$/i.test(w))
        .slice(0, 5);

      if (words.length) {
        const clauses = words.flatMap((w) => {
          const rx = new RegExp(escapeRegex(w), "i");
          return [{ name: rx }, { location: rx }, { description: rx }];
        });
        const [h, p, f] = await Promise.all([
          Hotel.find({ $or: clauses }).sort({ price: 1 }).limit(10).lean(),
          Property.find({ $or: clauses }).sort({ price: 1 }).limit(10).lean(),
          Flight.find({ $or: clauses }).sort({ price: 1 }).limit(8).lean(),
        ]);
        hotels = h;
        properties = p;
        flights = f;
      }
    }

    if (!hasNumericFilter && wantsCheap && hotels.length === 0 && properties.length === 0 && flights.length === 0) {
      const [h, p] = await Promise.all([
        Hotel.find().sort({ price: 1 }).limit(8).lean(),
        Property.find().sort({ price: 1 }).limit(8).lean(),
      ]);
      hotels = h;
      properties = p;
    }

    const results = [
      ...pickFields(hotels, "hotel"),
      ...pickFields(properties, "property"),
      ...pickFields(flights, "flight"),
    ];

    const intent = [];
    if (includeHotels) intent.push("hotel");
    if (includeProperties) intent.push("property");
    if (includeFlights) intent.push("flight");

    const hN = hotels.length;
    const pN = properties.length;
    const fN = flights.length;

    let reply;
    if (results.length > 0) {
      const bits = [];
      if (hN) bits.push(`${hN} hotel${hN === 1 ? "" : "s"}`);
      if (pN) bits.push(`${pN} rental${pN === 1 ? "" : "s"}`);
      if (fN) bits.push(`${fN} flight${fN === 1 ? "" : "s"}`);
      const detail = [];
      if (budget != null) detail.push(`within ${formatInrInReply(budget)}`);
      if (locationRx) detail.push("for your location");
      const mid = detail.length ? ` ${detail.join(" · ")}` : "";
      reply = `${pick(OPENERS_OK)} ${pick(OPENERS_RESULTS)}\n\nI found ${bits.join(", ")}${mid}. Open Voyago → Tripora or Stayora to book.`;
    } else {
      reply =
        budget != null || locationRx
          ? `Hmm — nothing in our database hits that exact combo (${budget != null ? `≤ ${formatInrInReply(budget)}` : ""}${budget != null && locationRx ? " · " : ""}${locationRx ? "that area" : ""}). Try nudging the budget up or spelling the city a little differently — I’m happy to search again!`
          : "I couldn’t match that yet. Try “cheap stays under 5000” (Stayora), “hotels in Delhi”, or “flights under 8000” (Tripora) — I’ll pull live Voyago listings from MongoDB.";
    }

    res.json({
      reply,
      results,
      meta: {
        intent,
        budget: budget ?? null,
        hasLocation: !!locationRx,
      },
    });
  } catch (e) {
    res.status(500).json({
      reply: "Oops — something glitched on my side. Give it one more try in a sec?",
      results: [],
      error: e.message,
    });
  }
});

export default router;
