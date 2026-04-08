import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import TourCalendar from "../components/TourCalendar";
import { createCheckoutSession } from "../services/bookings";
import { listPublicTours } from "../services/tours";

const DEFAULT_TOURS = [
  {
    title: "Sunset Kayak – Meadow Park Lake",
    desc: "Calm-water paddle, about 2 hours, with beginner-friendly guidance.",
    category: "Kayak",
    tags: ["Easy", "Sunset", "Water"],
    pricePerPerson: 30,
    maxPartySize: 8,
    checkoutEnabled: true,
  },
  {
    title: "Black Mountain Overlook Hike",
    desc: "Scenic hills, light elevation, and photo-friendly overlooks.",
    category: "Hike",
    tags: ["Scenic", "Easy", "Photos"],
    pricePerPerson: 24,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Ozone Falls Hike",
    desc: "Short trail to a dramatic waterfall with shaded sections.",
    category: "Hike",
    tags: ["Waterfall", "Easy", "Shade"],
    pricePerPerson: 24,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Lily Bluff Trail – Obed River",
    desc: "Moderate hike with broad river overlooks and a steady pace.",
    category: "Hike",
    tags: ["Moderate", "River Views", "Scenic"],
    pricePerPerson: 28,
    maxPartySize: 8,
    checkoutEnabled: true,
  },
  {
    title: "Soldier’s Beach Hike",
    desc: "Gentle shoreline walk with a slower, conversational pace.",
    category: "Hike",
    tags: ["Easy", "Shoreline", "Nature"],
    pricePerPerson: 22,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Fall Colors Hike (Seasonal)",
    desc: "Peak-color walk built for a relaxed pace and frequent photo stops.",
    category: "Seasonal",
    tags: ["Scenic", "Photos", "Easy"],
    pricePerPerson: 26,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Winter Stillness Walk (Seasonal)",
    desc: "Quiet winter trail experience with a reflective, mindful pace.",
    category: "Seasonal",
    tags: ["Mindful", "Easy", "Quiet"],
    pricePerPerson: 20,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
];

const FILTERS = ["All", "Kayak", "Paddle Board", "Hike", "Walk", "Camping", "Backpacking", "Seasonal", "Other"];

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
}

function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatDateInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function formatEventDateOnly(startISO) {
  try {
    return new Date(startISO).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatDateRange(startISO, endISO) {
  try {
    const s = new Date(startISO);
    const e = endISO ? new Date(endISO) : null;
    const d1 = s.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    if (!e) return d1;
    const sameDay = s.toDateString() === e.toDateString();
    if (sameDay) {
      const t1 = s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const t2 = e.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${d1}, ${t1}-${t2}`;
    }
    const d2 = e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${d1} to ${d2}`;
  } catch {
    return "";
  }
}

export default function Tours() {
  const formRef = useRef(null);
  const [selectedTour, setSelectedTour] = useState(DEFAULT_TOURS[0].title);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filter, setFilter] = useState("All");
  const [dbTours, setDbTours] = useState(null);
  const [bookingState, setBookingState] = useState({ status: "idle", error: "" });
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    preferred_contact: "email",
    dates: "",
    party_size: 1,
    notes: "",
  });

  const checkoutState = useMemo(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    return params.get("checkout") || "";
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await listPublicTours();
        if (!alive) return;
        setDbTours(data || []);
      } catch {
        if (!alive) return;
        setDbTours([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const tours = useMemo(() => {
    if (dbTours && dbTours.length > 0) {
      return dbTours.map((tour) => ({
        id: tour.id,
        title: tour.title,
        desc: tour.description,
        category: tour.category || "Other",
        tags: tour.tags || [],
        pricePerPerson: Number(tour.price_per_person || 0),
        maxPartySize: Number(tour.max_party_size || 10),
        checkoutEnabled: tour.checkout_enabled !== false,
      }));
    }

    return DEFAULT_TOURS;
  }, [dbTours]);

  const visibleTours = useMemo(
    () => (filter === "All" ? tours : tours.filter((tour) => tour.category === filter)),
    [filter, tours]
  );

  const selectedTourData = useMemo(
    () => tours.find((tour) => tour.title === selectedTour) || DEFAULT_TOURS[0],
    [selectedTour, tours]
  );

  const effectivePricePerPerson = useMemo(() => {
    if (selectedEvent?.price_per_person != null) {
      return Number(selectedEvent.price_per_person || 0);
    }
    return Number(selectedTourData?.pricePerPerson || 0);
  }, [selectedEvent, selectedTourData]);

  const maxAllowedPartySize = useMemo(() => {
    const byTour = Math.max(Number(selectedTourData?.maxPartySize || 10), 1);
    return byTour;
  }, [selectedTourData]);

  const totalPrice = useMemo(() => {
    const size = Number(form.party_size || 0);
    return size * effectivePricePerPerson;
  }, [effectivePricePerPerson, form.party_size]);

  useEffect(() => {
    setForm((current) => {
      const nextSize = Math.min(Math.max(Number(current.party_size || 1), 1), maxAllowedPartySize);
      if (nextSize === Number(current.party_size || 1)) return current;
      return { ...current, party_size: nextSize };
    });
  }, [maxAllowedPartySize]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhoneChange(value) {
    updateField("phone", formatPhoneInput(value));
  }

  function handleDateChange(value) {
    updateField("dates", formatDateInput(value));
  }

  function selectTour(title) {
    setSelectedTour(title);
    setSelectedEvent(null);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  function handleUseEvent(event) {
    const title = event.tour || event.title || selectedTour;
    setSelectedTour(title);
    setSelectedEvent(event);
    updateField("dates", formatEventDateOnly(event.start_at));

    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  async function handleCheckout(e) {
    e.preventDefault();
    setBookingState({ status: "submitting", error: "" });

    try {
      const payload = {
        customer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          preferred_contact: form.preferred_contact,
        },
        booking: {
          tour_title: selectedTourData.title,
          event_id: selectedEvent?.id || null,
          event_title: selectedEvent?.title || selectedEvent?.tour || null,
          dates: form.dates.trim(),
          party_size: Number(form.party_size || 0),
          notes: form.notes.trim(),
        },
        pricing: {
          currency: "usd",
          unit_amount: Math.round(effectivePricePerPerson * 100),
        },
        urls: {
          success_url: `${window.location.origin}/tours?checkout=success`,
          cancel_url: `${window.location.origin}/tours?checkout=cancelled`,
        },
      };

      const { url } = await createCheckoutSession(payload);
      if (!url) throw new Error("Stripe checkout URL was not returned.");
      window.location.assign(url);
    } catch (error) {
      setBookingState({
        status: "error",
        error: error?.message || "Unable to start checkout.",
      });
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <Helmet>
        <title>Tours - Be Still Crossville</title>
        <meta
          name="description"
          content="Book guided kayak and hiking tours in the Upper Cumberland. Choose a date, pick your group size, and check out securely online."
        />
        <link rel="canonical" href="https://stillcrossville.com/tours" />
      </Helmet>

      <h1 className="text-3xl font-semibold text-brand.heron mb-6">Tours &amp; Booking</h1>

      {checkoutState === "success" && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
          Payment received. A confirmation email will be sent once the booking is finalized.
        </div>
      )}

      {checkoutState === "cancelled" && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Checkout was cancelled. Your selections are still here if you want to try again.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-brand.heron mb-2">Pick a scheduled date</h2>
            <TourCalendar onUseEvent={handleUseEvent} />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = item === filter;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition " +
                    (active
                      ? "bg-brand-heron text-white"
                      : "border border-black/10 hover:bg-brand.water/10 text-brand.heron")
                  }
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {visibleTours.map((tour) => {
              const active = selectedTour === tour.title;
              return (
                <div
                  key={tour.title}
                  className={
                    "card transition ring-0 " +
                    (active ? "border-brand.heron/50 ring-1 ring-brand.heron/30" : "")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-brand.heron">{tour.title}</h3>
                        <span className="rounded-full bg-brand.water/20 px-2 py-1 text-xs text-brand.heron">
                          {formatCurrency(tour.pricePerPerson)} / person
                        </span>
                      </div>
                      <p className="text-sm text-black/70 mt-1">{tour.desc}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tour.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 rounded-full bg-brand.water/20 text-brand.heron"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectTour(tour.title)}
                      className={
                        "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition " +
                        (active
                          ? "bg-brand-heron text-white"
                          : "border border-black/10 hover:bg-brand.water/10 text-brand.heron")
                      }
                    >
                      {active ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <form ref={formRef} onSubmit={handleCheckout} className="card space-y-4">
          <div>
            <h2 className="font-semibold text-brand.heron">Checkout</h2>
            <p className="mt-1 text-sm text-black/70">
              Choose a tour, set your group size, and continue to secure checkout.
            </p>
          </div>

          <div className="rounded-2xl bg-brand.water/10 p-4">
            <div className="text-sm text-black/60">Selected tour</div>
            <div className="mt-1 text-lg font-semibold text-brand.heron">{selectedTourData.title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-black/70">
              <span>{formatCurrency(selectedTourData.pricePerPerson)} per person</span>
              {selectedEvent?.price_per_person != null && (
                <span>Event price override: {formatCurrency(Number(selectedEvent.price_per_person || 0))}</span>
              )}
              <span>Max party size {selectedTourData.maxPartySize}</span>
              {selectedEvent && (
                <span>{formatDateRange(selectedEvent.start_at, selectedEvent.end_at)}</span>
              )}
            </div>
            {selectedEvent?.capacity ? (
              <div className="mt-2 text-sm text-black/70">
                Event capacity: {selectedEvent.capacity} guests. Final availability is confirmed at checkout.
              </div>
            ) : null}
          </div>

          <label className="block">
            <span className="text-sm">Name</span>
            <input
              name="name"
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Email</span>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Phone</span>
            <input
              name="phone"
              value={form.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              inputMode="tel"
              placeholder="(931) 555-1234"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Preferred Contact</span>
            <select
              name="preferred_contact"
              value={form.preferred_contact}
              onChange={(e) => updateField("preferred_contact", e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            >
              <option value="email">Email</option>
              <option value="text">Text</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Tour</span>
            <select
              name="tour"
              value={selectedTour}
              onChange={(e) => selectTour(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            >
              {tours.map((tour) => (
                <option key={tour.title} value={tour.title}>
                  {tour.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Date</span>
            <input
              name="dates"
              required
              value={form.dates}
              onChange={(e) => handleDateChange(e.target.value)}
              inputMode="numeric"
              placeholder="MM/DD/YYYY"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Party Size</span>
            <input
              name="party_size"
              type="number"
              min="1"
              max={maxAllowedPartySize}
              required
              value={form.party_size}
              onChange={(e) => updateField("party_size", e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Notes</span>
            <textarea
              name="notes"
              rows="3"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Ages, gear notes, questions, access needs, or anything we should know."
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <div className="rounded-2xl border border-black/10 p-4">
            <div className="flex items-center justify-between text-sm text-black/60">
              <span>Price per person</span>
              <span>{formatCurrency(effectivePricePerPerson)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-black/60">
              <span>Party size</span>
              <span>{Number(form.party_size || 0)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-lg font-semibold text-brand.heron">
              <span>Total due today</span>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <button
            className="button-primary w-full disabled:opacity-60"
            type="submit"
            disabled={
              bookingState.status === "submitting" ||
              !selectedTourData.checkoutEnabled ||
              totalPrice <= 0
            }
          >
            {bookingState.status === "submitting" ? "Redirecting to checkout..." : `Pay ${formatCurrency(totalPrice)}`}
          </button>

          {!selectedTourData.checkoutEnabled && (
            <p className="text-sm text-amber-700">
              Online checkout is not enabled for this tour yet.
            </p>
          )}

          {bookingState.status === "error" && (
            <p className="text-sm text-red-600">{bookingState.error}</p>
          )}
        </form>
      </div>
    </section>
  );
}
