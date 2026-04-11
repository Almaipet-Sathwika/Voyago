import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Hotel from "./models/Hotel.js";
import Flight from "./models/Flight.js";
import Property from "./models/Property.js";
import Booking from "./models/Booking.js";

const hotelsData = [
  {
    name: "Paharganj City Lodge",
    location: "Paharganj, New Delhi, India",
    price: 800,
    description:
      "Compact AC rooms, rooftop chai, and walking distance to New Delhi Railway Station — ideal for budget explorers.",
    rating: 3.9,
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  },
  {
    name: "Indiranagar Cozy Inn",
    location: "Indiranagar, Bengaluru, India",
    price: 1450,
    description:
      "Metro-near boutique rooms, workspace nook, and South Indian breakfast included.",
    rating: 4.2,
    imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  },
  {
    name: "Azure Coast Resort & Spa",
    location: "Malibu, California, USA",
    price: 14200,
    description:
      "Oceanfront suites with private balconies, infinity pool, and farm-to-table dining. Steps from pristine beaches.",
    rating: 4.85,
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  },
  {
    name: "Alpine Lodge Grand",
    location: "Zermatt, Switzerland",
    price: 14950,
    description:
      "Chalet-style luxury with Matterhorn views, heated spa, and Michelin-inspired alpine cuisine.",
    rating: 4.95,
    imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
  },
  {
    name: "Tokyo Skyline Hotel",
    location: "Shinjuku, Tokyo, Japan",
    price: 11200,
    description:
      "High-rise rooms overlooking neon cityscapes, onsen-inspired baths, and direct Shinkansen access.",
    rating: 4.65,
    imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  },
  {
    name: "Riad Marrakech Oasis",
    location: "Medina, Marrakech, Morocco",
    price: 6800,
    description:
      "Traditional courtyard riad with plunge pool, rooftop terrace, and authentic Moroccan breakfast.",
    rating: 4.45,
    imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
  },
  {
    name: "Santorini Cliff Suites",
    location: "Oia, Santorini, Greece",
    price: 13800,
    description:
      "Whitewashed cave suites, caldera sunsets, and plunge pools carved into the volcanic cliffside.",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
  },
  {
    name: "Nordic Lights Hotel",
    location: "Tromsø, Norway",
    price: 10100,
    description:
      "Glass-roof aurora suites, Nordic sauna rituals, and Arctic fjord excursions from the lobby.",
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
  },
  {
    name: "Bangkok Riverside Palace",
    location: "Chao Phraya, Bangkok, Thailand",
    price: 5400,
    description:
      "Colonial riverside elegance, longtail boat transfers, and award-winning Thai street-food tours.",
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
  },
  {
    name: "Paris Left Bank Boutique",
    location: "Saint-Germain, Paris, France",
    price: 12400,
    description:
      "Haussmann-era building with literary salon bar, Seine views, and curated art walks.",
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
  },
  {
    name: "Cape Town Table Bay",
    location: "V&A Waterfront, Cape Town, South Africa",
    price: 9200,
    description:
      "Harbor and mountain views, wine-country day trips, and contemporary African design interiors.",
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80",
  },
  {
    name: "Dubai Marina Towers",
    location: "Dubai Marina, UAE",
    price: 8900,
    description:
      "Sky-high apartments, rooftop infinity pool, and direct access to beach clubs and yacht charters.",
    rating: 4.55,
    imageUrl: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80",
  },
  {
    name: "Barcelona Gothic Quarter Inn",
    location: "Gothic Quarter, Barcelona, Spain",
    price: 7200,
    description:
      "Restored medieval building with rooftop plunge pool, tapas routes, and Gaudí walking maps.",
    rating: 4.4,
    imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
  },
  {
    name: "Sydney Harbour View Hotel",
    location: "Circular Quay, Sydney, Australia",
    price: 11800,
    description:
      "Opera House and bridge vistas, harbor ferries at the doorstep, and coastal walk concierge.",
    rating: 4.75,
    imageUrl: "https://images.unsplash.com/photo-1501117716987-c8e1ecb210cc?w=800&q=80",
  },
];

const flightsData = [
  {
    name: "NYC → London Nonstop",
    location: "JFK (New York) → LHR (London)",
    price: 11200,
    description:
      "Premium economy lie-flat seats, chef-designed meals, and priority boarding on this daily service.",
    rating: 4.55,
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
  },
  {
    name: "LA → Tokyo Dreamliner",
    location: "LAX (Los Angeles) → NRT (Tokyo)",
    price: 11800,
    description:
      "787 quiet cabin, Japanese bento options, and extra legroom on the Pacific crossing.",
    rating: 4.85,
    imageUrl: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80",
  },
  {
    name: "Paris → Rome Express",
    location: "CDG (Paris) → FCO (Rome)",
    price: 4200,
    description:
      "Short-haul comfort with regional wine selection and fast-track security partnerships.",
    rating: 4.15,
    imageUrl: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800&q=80",
  },
  {
    name: "Dubai → Singapore A380",
    location: "DXB (Dubai) → SIN (Singapore)",
    price: 9800,
    description:
      "Double-decker experience, onboard lounge access, and award-winning cabin crew service.",
    rating: 4.75,
    imageUrl: "https://images.unsplash.com/photo-1474302778997-84e14e369404?w=800&q=80",
  },
  {
    name: "Sydney → Auckland Hop",
    location: "SYD (Sydney) → AKL (Auckland)",
    price: 6500,
    description:
      "Scenic Tasman Sea route with complimentary New Zealand wine tasting in business class.",
    rating: 4.35,
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
  },
  {
    name: "Toronto → Vancouver Coast",
    location: "YYZ (Toronto) → YVR (Vancouver)",
    price: 5800,
    description:
      "Rocky Mountain views from the window, maple-themed snacks, and generous carry-on policy.",
    rating: 4.4,
    imageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
  },
  {
    name: "Berlin → Barcelona Sun",
    location: "BER (Berlin) → BCN (Barcelona)",
    price: 3800,
    description:
      "Low-cost carrier comfort pack with reserved seating and Mediterranean arrival vibes.",
    rating: 3.85,
    imageUrl: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800&q=80",
  },
  {
    name: "Mumbai → Dubai Gold",
    location: "BOM (Mumbai) → DXB (Dubai)",
    price: 7200,
    description:
      "Overnight red-eye with flat beds, Arabic coffee service, and chauffeur connections in Dubai.",
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80",
  },
  {
    name: "Chicago → Cancún Escape",
    location: "ORD (Chicago) → CUN (Cancún)",
    price: 6100,
    description:
      "Family-friendly rows, tropical drink menu, and quick beach resort transfers on landing.",
    rating: 4.25,
    imageUrl: "https://images.unsplash.com/photo-1474302778997-84e14e369404?w=800&q=80",
  },
  {
    name: "Seattle → Honolulu Aloha",
    location: "SEA (Seattle) → HNL (Honolulu)",
    price: 8400,
    description:
      "Island playlist curated cabin, mai tai service, and lei greeting partnership on arrival.",
    rating: 4.45,
    imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80",
  },
  {
    name: "Amsterdam → Stockholm Nordic",
    location: "AMS (Amsterdam) → ARN (Stockholm)",
    price: 5200,
    description:
      "Efficient Schengen connection, Scandinavian design seats, and sustainable aviation fuel blend.",
    rating: 4.3,
    imageUrl: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
  },
  {
    name: "São Paulo → Rio Shuttle Plus",
    location: "GRU (São Paulo) → GIG (Rio de Janeiro)",
    price: 2800,
    description:
      "Quick domestic hop with Brazilian coffee bar, samba boarding music, and Copacabana tips.",
    rating: 3.95,
    imageUrl: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?w=800&q=80",
  },
];

const propertiesData = [
  {
    name: "Fort Kochi Heritage Room",
    location: "Fort Kochi, Kerala, India",
    price: 580,
    description:
      "High-ceiling room in a 1920s home, courtyard breakfast, and rickshaw rides to Chinese fishing nets.",
    rating: 4.35,
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
  {
    name: "Loft in the Arts District",
    location: "Los Angeles, California, USA",
    price: 14200,
    description:
      "Industrial-chic loft with 14-foot ceilings, vinyl listening corner, and walkable gallery nights.",
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
  },
  {
    name: "Brooklyn Brownstone Garden",
    location: "Brooklyn, New York, USA",
    price: 16800,
    description:
      "Classic brownstone with private backyard, chef's kitchen, and 20 minutes to Manhattan.",
    rating: 4.75,
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
  },
  {
    name: "Lisbon Alfama Terrace",
    location: "Alfama, Lisbon, Portugal",
    price: 9800,
    description:
      "Sun-drenched terrace over terracotta roofs, tram 28 at the corner, and pastel de nata mornings.",
    rating: 4.65,
    imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  },
  {
    name: "Tuscany Villa Olive Grove",
    location: "Chianti, Tuscany, Italy",
    price: 19200,
    description:
      "Stone farmhouse among olive trees, pool overlooking vineyards, and optional cooking classes.",
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
  {
    name: "Bali Jungle Bamboo House",
    location: "Ubud, Bali, Indonesia",
    price: 7600,
    description:
      "Open-air living among rice paddies, outdoor shower, and daily yoga shala five minutes away.",
    rating: 4.55,
    imageUrl: "https://images.unsplash.com/photo-1602343164077-7e9717d47629?w=800&q=80",
  },
  {
    name: "Reykjavik Design Cabin",
    location: "Reykjavik, Iceland",
    price: 11500,
    description:
      "Minimal Nordic cabin, geothermal hot tub, and northern lights alert app on the house tablet.",
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
  },
  {
    name: "Mexico City Condesa Flat",
    location: "Condesa, Mexico City, Mexico",
    price: 4800,
    description:
      "Art deco building, rooftop mezcal sunsets, and the best tacos within a three-block radius.",
    rating: 4.4,
    imageUrl: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  },
  {
    name: "Scottish Highlands Bothy",
    location: "Isle of Skye, Scotland",
    price: 8900,
    description:
      "Remote stone bothy modernized inside, peat fire stove, and hiking trails from the door.",
    rating: 4.35,
    imageUrl: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
  },
  {
    name: "Vancouver Kitsilano Townhome",
    location: "Kitsilano, Vancouver, Canada",
    price: 10200,
    description:
      "Family-friendly three-bedroom, bikes in the garage, and Kits Beach ten minutes on foot.",
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
  },
  {
    name: "Miami Wynwood Art Loft",
    location: "Wynwood, Miami, USA",
    price: 12800,
    description:
      "Mural views from every window, pool access in the building, and nightlife walkable.",
    rating: 4.45,
    imageUrl: "https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=800&q=80",
  },
  {
    name: "Seoul Hanok Modern",
    location: "Bukchon, Seoul, South Korea",
    price: 6200,
    description:
      "Traditional hanok lines with heated ondol floors, smart home upgrades, and palace walks.",
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
  },
  {
    name: "Copenhagen Nyhavn Apartment",
    location: "Nyhavn, Copenhagen, Denmark",
    price: 13400,
    description:
      "Canal-front windows, Danish design furniture, and cargo bike rental included.",
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80",
  },
];

export async function seedDatabase() {
  await Booking.updateMany({ status: "pending" }, { $set: { status: "booked" } });
  await Booking.updateMany({ status: "confirmed" }, { $set: { status: "paid" } });
  await Booking.updateMany({ guests: { $exists: false } }, { $set: { guests: 2 } });

  await Booking.updateMany(
    { $or: [{ status: "paid" }, { status: "confirmed" }] },
    { $set: { paymentStatus: "Paid", bookingStatus: "Active" } }
  );
  await Booking.updateMany({ status: "booked" }, { $set: { paymentStatus: "Pending", bookingStatus: "Active" } });
  await Booking.updateMany({ status: "cancelled" }, { $set: { bookingStatus: "Cancelled" } });

  const nameBackfill = await Booking.find({
    $or: [{ guestNames: { $exists: false } }, { guestNames: { $size: 0 } }],
  });
  for (const b of nameBackfill) {
    b.guestNames = Array.from({ length: b.guests }, (_, i) => `Guest ${i + 1}`);
    await b.save();
  }

  const [userCount, hotelCount, flightCount, propertyCount, bookingCount] = await Promise.all([
    User.countDocuments(),
    Hotel.countDocuments(),
    Flight.countDocuments(),
    Property.countDocuments(),
    Booking.countDocuments(),
  ]);

  let hostUser = await User.findOne({ email: "host@tripmate.com" });
  let guestUser = await User.findOne({ email: "guest@tripmate.com" });

  if (userCount === 0) {
    const hashedHost = await bcrypt.hash("host12345", 10);
    const hashedGuest = await bcrypt.hash("guest12345", 10);
    [hostUser, guestUser] = await User.insertMany([
      { name: "Alex Host", email: "host@tripmate.com", password: hashedHost, role: "host" },
      { name: "Jamie Guest", email: "guest@tripmate.com", password: hashedGuest, role: "guest" },
    ]);
    console.log("[seed] Voyago demo users (host@tripmate.com / host12345, guest@tripmate.com / guest12345)");
  } else {
    hostUser = hostUser || (await User.findOne({ role: "host" }));
    guestUser = guestUser || (await User.findOne({ role: "guest" }));
  }

  if (hotelCount === 0) {
    await Hotel.insertMany(hotelsData);
    console.log(`[seed] Inserted ${hotelsData.length} hotels`);
  }

  if (flightCount === 0) {
    await Flight.insertMany(flightsData);
    console.log(`[seed] Inserted ${flightsData.length} flights`);
  }

  if (propertyCount === 0) {
    const hostId = hostUser?._id || null;
    const props = propertiesData.map((p) => ({ ...p, host: hostId }));
    await Property.insertMany(props);
    console.log(`[seed] Inserted ${propertiesData.length} properties`);
  }

  if (bookingCount === 0 && guestUser) {
    const [h0, f0, p0] = await Promise.all([
      Hotel.findOne().sort({ createdAt: 1 }),
      Flight.findOne().sort({ createdAt: 1 }),
      Property.findOne().sort({ createdAt: 1 }),
    ]);
    const bookings = [];
    if (h0) {
      bookings.push({
        user: guestUser._id,
        itemType: "hotel",
        itemId: h0._id,
        itemName: h0.name,
        startDate: new Date(),
        endDate: new Date(Date.now() + 3 * 86400000),
        guests: 2,
        guestNames: ["Jamie Guest", "Alex Host"],
        totalPrice: h0.price * 3,
        status: "paid",
        paymentStatus: "Paid",
        bookingStatus: "Active",
        paymentMethod: "upi",
      });
    }
    if (f0) {
      bookings.push({
        user: guestUser._id,
        itemType: "flight",
        itemId: f0._id,
        itemName: f0.name,
        startDate: new Date(Date.now() + 7 * 86400000),
        endDate: new Date(Date.now() + 7 * 86400000),
        guests: 1,
        guestNames: ["Jamie Guest"],
        totalPrice: f0.price,
        status: "booked",
        paymentStatus: "Pending",
        bookingStatus: "Active",
        paymentMethod: "",
      });
    }
    if (p0) {
      bookings.push({
        user: guestUser._id,
        itemType: "property",
        itemId: p0._id,
        itemName: p0.name,
        startDate: new Date(Date.now() + 14 * 86400000),
        endDate: new Date(Date.now() + 21 * 86400000),
        guests: 4,
        guestNames: ["Jamie Guest", "Guest 2", "Guest 3", "Guest 4"],
        totalPrice: p0.price * 7,
        status: "paid",
        paymentStatus: "Paid",
        bookingStatus: "Active",
        paymentMethod: "card",
      });
    }
    if (bookings.length) {
      await Booking.insertMany(bookings);
      console.log(`[seed] Inserted ${bookings.length} sample bookings`);
    }
  }

  for (const h of hotelsData) {
    await Hotel.updateMany({ name: h.name }, { $set: { price: h.price, rating: h.rating } });
  }
  for (const f of flightsData) {
    await Flight.updateMany({ name: f.name }, { $set: { price: f.price, rating: f.rating } });
  }
  for (const p of propertiesData) {
    await Property.updateMany({ name: p.name }, { $set: { price: p.price, rating: p.rating } });
  }

  console.log("[seed] Database check complete.");
}
