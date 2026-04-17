import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ListingCard from "../components/ListingCard.jsx";
import BookingModal from "../components/BookingModal.jsx";
import { formatInr } from "../utils/formatInr.js";

function filterAndSort(items, { maxPrice, locationQ, sortPrice }) {
  let out = Array.isArray(items) ? [...items] : [];
  const loc = locationQ.trim().toLowerCase();
  if (loc) {
    out = out.filter((i) => String(i.location || "").toLowerCase().includes(loc));
  }
  out = out.filter((i) => Number(i.price) <= maxPrice);
  if (sortPrice === "asc") out.sort((a, b) => Number(a.price) - Number(b.price));
  else if (sortPrice === "desc") out.sort((a, b) => Number(b.price) - Number(a.price));
  return out;
}

export default function Home() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isTripora = pathname.startsWith("/tripora");
  const isStayora = pathname.startsWith("/stayora");
  const moduleAccent = isStayora ? "stayora" : "tripora";

  const { token, user } = useAuth();
  const [tripTab, setTripTab] = useState("hotels");
  const [hotels, setHotels] = useState([]);
  const [flights, setFlights] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingTarget, setBookingTarget] = useState(null);
  const [maxBudget, setMaxBudget] = useState(100000);
  const [locationFilter, setLocationFilter] = useState("");
  const [sortPrice, setSortPrice] = useState("asc");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [h, f, p] = await Promise.all([
        fetch("/api/hotels").then((r) => r.json()),
        fetch("/api/flights").then((r) => r.json()),
        fetch("/api/properties").then((r) => r.json()),
      ]);
      setHotels(Array.isArray(h) ? h : []);
      setFlights(Array.isArray(f) ? f : []);
      setProperties(Array.isArray(p) ? p : []);
    } catch (e) {
      setError(e.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const onFocus = () => loadAll();
    const onProps = () => loadAll();
    window.addEventListener("focus", onFocus);
    window.addEventListener("properties-updated", onProps);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("properties-updated", onProps);
    };
  }, [loadAll]);

  const filteredHotels = useMemo(
    () => filterAndSort(hotels, { maxPrice: maxBudget, locationQ: locationFilter, sortPrice }),
    [hotels, maxBudget, locationFilter, sortPrice]
  );
  const filteredFlights = useMemo(
    () => filterAndSort(flights, { maxPrice: maxBudget, locationQ: locationFilter, sortPrice }),
    [flights, maxBudget, locationFilter, sortPrice]
  );
  const filteredProperties = useMemo(
    () => filterAndSort(properties, { maxPrice: maxBudget, locationQ: locationFilter, sortPrice }),
    [properties, maxBudget, locationFilter, sortPrice]
  );

  function openBook(item, itemType) {
    if (!user || !token) {
      navigate("/login");
      return;
    }
    setBookingTarget({ item, itemType });
  }

  const filterAccent = isStayora ? "orange" : "rose";
  const accentRing = filterAccent === "orange" ? "ring-orange-500" : "ring-rose-500";
  const accentSlider = filterAccent === "orange" ? "accent-orange-500" : "accent-rose-600";

  const filterBar = (
    <div
      className={`mb-10 rounded-3xl border bg-white p-5 shadow-card sm:p-6 ${
        isStayora ? "border-orange-100" : "border-slate-100"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          isStayora ? "text-orange-800/80" : "text-slate-500"
        }`}
      >
        Smart filters
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700 sm:col-span-1">
          Max budget ({formatInr(maxBudget)})
          <input
            type="range"
            min={500}
            max={150000}
            step={500}
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className={`mt-2 w-full ${accentSlider}`}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Location contains
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="e.g. India, Tokyo, Miami"
            className={`mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 ${accentRing}`}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Sort by price
          <select
            value={sortPrice}
            onChange={(e) => setSortPrice(e.target.value)}
            className={`mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 ${accentRing}`}
          >
            <option value="asc">Low to high</option>
            <option value="desc">High to low</option>
          </select>
        </label>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <BookingModal
        open={!!bookingTarget}
        onClose={() => setBookingTarget(null)}
        item={bookingTarget?.item}
        itemType={bookingTarget?.itemType}
        token={token}
        moduleAccent={moduleAccent}
        onBooked={() => window.dispatchEvent(new Event("bookings-updated"))}
      />

      {isTripora && (
        <div className="mb-10 text-center sm:text-left">
          <h1 className="font-display text-3xl font-bold text-brand-ink sm:text-4xl">Tripora</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Curated flights and hotels — smart planning in ₹.
          </p>
          <div className="mt-6 inline-flex rounded-full bg-white p-1 shadow-card ring-1 ring-slate-100">
            <button
              type="button"
              onClick={() => setTripTab("hotels")}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                tripTab === "hotels"
                  ? "bg-rose-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Hotels
            </button>
            <button
              type="button"
              onClick={() => setTripTab("flights")}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                tripTab === "flights"
                  ? "bg-rose-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Flights
            </button>
          </div>
        </div>
      )}

      {isStayora && (
        <div className="mb-10 text-center sm:text-left">
          <h1 className="font-display text-3xl font-bold text-brand-ink sm:text-4xl">Stayora</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            Find homely stays and rentals — comfort meets flexibility.
          </p>
        </div>
      )}

      {!user && (
        <p className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Log in to book with Voyago.{" "}
          <button type="button" onClick={() => navigate("/login")} className="font-semibold underline">
            Log in
          </button>
        </p>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && (isTripora || isStayora) && filterBar}

      {loading ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-card">
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-10 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : isTripora && tripTab === "hotels" ? (
        filteredHotels.length === 0 ? (
          <p className="py-16 text-center text-slate-500">
            No hotels match your filters. Try raising the budget or clearing location.
          </p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredHotels.map((item) => (
              <ListingCard
                key={item._id}
                title={item.name}
                location={item.location}
                price={item.price}
                description={item.description}
                rating={item.rating}
                imageUrl={item.imageUrl}
                priceLabel="night"
                itemType="hotel"
                itemId={item._id}
                accent="tripora"
                showWishlist={!!user}
                onBookNow={() => openBook(item, "hotel")}
                bookLabel="Book now"
              />
            ))}
          </div>
        )
      ) : isTripora && tripTab === "flights" ? (
        filteredFlights.length === 0 ? (
          <p className="py-16 text-center text-slate-500">No flights match your filters.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFlights.map((item) => (
              <ListingCard
                key={item._id}
                title={item.name}
                location={item.location}
                price={item.price}
                description={item.description}
                rating={item.rating}
                imageUrl={item.imageUrl}
                priceLabel="ticket"
                itemType="flight"
                itemId={item._id}
                accent="tripora"
                showWishlist={!!user}
                onBookNow={() => openBook(item, "flight")}
                bookLabel="Book now"
              />
            ))}
          </div>
        )
      ) : isStayora ? (
        filteredProperties.length === 0 ? (
          <p className="py-16 text-center text-slate-500">No rentals match your filters.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((item) => (
              <ListingCard
                key={item._id}
                title={item.name}
                location={item.location}
                price={item.price}
                description={item.description}
                rating={item.rating}
                imageUrl={item.imageUrl}
                priceLabel="month"
                itemType="property"
                itemId={item._id}
                accent="stayora"
                showWishlist={!!user}
                onBookNow={() => openBook(item, "property")}
                bookLabel="Book now"
                isVerified={item.isVerified}
                tags={item.tags}
              />
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
