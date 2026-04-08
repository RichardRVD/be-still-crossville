import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import PayLinkButton from "../components/PayLinkButton";
import TourCalendar from "../components/TourCalendar";
import { createCheckoutSession } from "../services/bookings";
import { submitVolunteerForm } from "../services/forms";
import { listPublicTours } from "../services/tours";
import { formatDateInput, formatPhoneInput } from "../utils/formatters";

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
    pricePerPerson: 30,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Ozone Falls Hike",
    desc: "Short trail to a dramatic waterfall with shaded sections.",
    category: "Hike",
    tags: ["Waterfall", "Easy", "Shade"],
    pricePerPerson: 30,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Lily Bluff Trail – Obed River",
    desc: "Moderate hike with broad river overlooks and a steady pace.",
    category: "Hike",
    tags: ["Moderate", "River Views", "Scenic"],
    pricePerPerson: 30,
    maxPartySize: 8,
    checkoutEnabled: true,
  },
  {
    title: "Soldier’s Beach Hike",
    desc: "Gentle shoreline walk with a slower, conversational pace.",
    category: "Hike",
    tags: ["Easy", "Shoreline", "Nature"],
    pricePerPerson: 30,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Fall Colors Hike (Seasonal)",
    desc: "Peak-color walk built for a relaxed pace and frequent photo stops.",
    category: "Seasonal",
    tags: ["Scenic", "Photos", "Easy"],
    pricePerPerson: 30,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
  {
    title: "Winter Stillness Walk (Seasonal)",
    desc: "Quiet winter trail experience with a reflective, mindful pace.",
    category: "Seasonal",
    tags: ["Mindful", "Easy", "Quiet"],
    pricePerPerson: 30,
    maxPartySize: 10,
    checkoutEnabled: true,
  },
];

const FILTERS = ["All", "Kayak", "Paddle Board", "Hike", "Walk", "Camping", "Backpacking", "Seasonal", "Other"];

function normalizeTags(tags) {
  const rawValues = Array.isArray(tags) ? tags : [tags];
  return rawValues
    .flatMap((value) =>
      (value || "")
        .toString()
        .split(",")
        .map((part) => part.trim())
    )
    .map((value) =>
      value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function normalizeCategoryLabel(value, title = "", tags = []) {
  const direct = (value || "").toString().trim().toLowerCase();
  if (direct === "kayak") return "Kayak";
  if (direct === "paddle board" || direct === "paddleboard") return "Paddle Board";
  if (direct === "hike") return "Hike";
  if (direct === "walk") return "Walk";
  if (direct === "camping") return "Camping";
  if (direct === "backpacking") return "Backpacking";
  if (direct === "seasonal") return "Seasonal";
  if (direct === "other") return "Other";

  const raw = [title, ...(tags || [])].filter(Boolean).join(" ").toLowerCase();

  if (raw.includes("paddle board") || raw.includes("paddleboard") || raw.includes("sup")) {
    return "Paddle Board";
  }
  if (raw.includes("kayak")) return "Kayak";
  if (raw.includes("backpack")) return "Backpacking";
  if (raw.includes("camp")) return "Camping";
  if (raw.includes("walk")) return "Walk";
  if (raw.includes("season")) return "Seasonal";
  if (raw.includes("hike") || raw.includes("trail") || raw.includes("waterfall")) {
    return "Hike";
  }

  return "Other";
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0);
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

function deriveExperienceLabel(tour, event) {
  if (tour?.title) return tour.title;
  if (event?.tour) return event.tour;
  if (event?.title) return event.title;
  return "Selected outing";
}

function deriveSelectedContext(tour, event) {
  const category = tour?.category || normalizeCategoryLabel(event?.tour, event?.title);
  const isScheduled = !!event?.id;

  return {
    categoryLabel:
      category === "Kayak"
        ? "Kayak tour"
        : category === "Paddle Board"
        ? "Paddle board lesson"
        : category === "Hike"
        ? "Guided hike"
        : category === "Walk"
        ? "Nature walk"
        : "Outdoor outing",
    selectionLabel: isScheduled ? "Scheduled date selected" : "Custom date request",
  };
}

export default function Tours() {
  const formRef = useRef(null);
  const [selectedTourId, setSelectedTourId] = useState(DEFAULT_TOURS[0].id || null);
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
        category: normalizeCategoryLabel(tour.category, tour.title, tour.tags),
        tags: normalizeTags(tour.tags),
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
    () =>
      tours.find((tour) => (selectedTourId ? tour.id === selectedTourId : false)) ||
      tours.find((tour) => tour.title === selectedTour) ||
      DEFAULT_TOURS[0],
    [selectedTour, selectedTourId, tours]
  );

  const experienceLabel = useMemo(
    () => deriveExperienceLabel(selectedTourData, selectedEvent),
    [selectedEvent, selectedTourData]
  );

  const selectedContext = useMemo(
    () => deriveSelectedContext(selectedTourData, selectedEvent),
    [selectedEvent, selectedTourData]
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

  const bookingMode = effectivePricePerPerson > 0 ? "paid" : "free";

  useEffect(() => {
    setForm((current) => {
      const nextSize = Math.min(Math.max(Number(current.party_size || 1), 1), maxAllowedPartySize);
      if (nextSize === Number(current.party_size || 1)) return current;
      return { ...current, party_size: nextSize };
    });
  }, [maxAllowedPartySize]);

  function updateField(field, value) {
    setBookingState((current) =>
      current.status === "idle" ? current : { status: "idle", error: "" }
    );
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhoneChange(value) {
    updateField("phone", formatPhoneInput(value));
  }

  function handleDateChange(value) {
    updateField("dates", formatDateInput(value));
  }

  function selectTour(title) {
    const nextTour = tours.find((tour) => tour.title === title);
    setSelectedTourId(nextTour?.id || null);
    setSelectedTour(title);
    if (nextTour?.category) {
      setFilter(nextTour.category);
    }
    setSelectedEvent(null);
    setBookingState({ status: "idle", error: "" });
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  function handleUseEvent(event) {
    const nextTour =
      tours.find((tour) => event.tour_id && tour.id === event.tour_id) ||
      tours.find((tour) => tour.title === event.tour) ||
      tours.find((tour) => tour.title === event.title) ||
      null;
    const title = nextTour?.title || event.tour || event.title || selectedTour;
    setSelectedTourId(nextTour?.id || null);
    setSelectedTour(title);
    if (nextTour?.category) {
      setFilter(nextTour.category);
    }
    setSelectedEvent(event);
    setBookingState({ status: "idle", error: "" });
    updateField("dates", formatEventDateOnly(event.start_at));

    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  async function handleCheckout(e) {
    e.preventDefault();
    setBookingState({ status: "submitting", error: "" });

    try {
      if (effectivePricePerPerson <= 0) {
        const freeRequest = new FormData();
        freeRequest.set("name", form.name.trim());
        freeRequest.set("email", form.email.trim());
        freeRequest.set("phone", form.phone.trim());
        freeRequest.set("preferred_contact", form.preferred_contact);
        freeRequest.set("tour", selectedTourData.title);
        freeRequest.set("dates", form.dates.trim());
        freeRequest.set(
          "notes",
          [`Free community outing`, `Party size: ${Number(form.party_size || 0)}`, form.notes.trim()]
            .filter(Boolean)
            .join("\n")
        );

        await submitVolunteerForm(freeRequest);
        setBookingState({ status: "success", error: "" });
        return;
      }

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

      {bookingState.status === "success" && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900">
          Your free outing request is in. We will confirm the details shortly.
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
                          {tour.pricePerPerson > 0 ? `${formatCurrency(tour.pricePerPerson)} / person` : "Free"}
                        </span>
                      </div>
                      <p className="text-sm text-black/70 mt-1">{tour.desc}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tour.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-brand.heron/15 bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-brand.heron shadow-sm"
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
            <h2 className="font-semibold text-brand.heron">
              {bookingMode === "paid" ? "Book This Outing" : "Reserve This Free Outing"}
            </h2>
            <p className="mt-1 text-sm text-black/70">
              {bookingMode === "paid"
                ? "Choose a tour, set your group size, and continue to secure checkout."
                : "Choose a free community outing, reserve your spot, and we will follow up with details."}
            </p>
          </div>

          <div className="rounded-2xl bg-brand.water/10 p-4">
            <div className="text-sm text-black/60">Selected outing</div>
            <div className="mt-1 text-lg font-semibold text-brand.heron">{experienceLabel}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/80 px-2 py-1 text-xs text-brand.heron">
                {selectedContext.categoryLabel}
              </span>
              <span className="rounded-full bg-white/80 px-2 py-1 text-xs text-brand.heron">
                {selectedContext.selectionLabel}
              </span>
              <span className="rounded-full bg-white/80 px-2 py-1 text-xs text-brand.heron">
                {bookingMode === "paid" ? "Paid booking" : "Free reservation"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-black/70">
              <span>
                {effectivePricePerPerson > 0
                  ? `${formatCurrency(effectivePricePerPerson)} per person`
                  : "Free community outing"}
              </span>
              {selectedEvent?.price_per_person != null && (
                <span>
                  Event price override: {Number(selectedEvent.price_per_person || 0) > 0
                    ? formatCurrency(Number(selectedEvent.price_per_person || 0))
                    : "Free"}
                </span>
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
            {!selectedEvent && (
              <div className="mt-2 text-sm text-black/70">
                No scheduled date selected yet. You can still request a custom date and we will confirm availability.
              </div>
            )}
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
              <span>{effectivePricePerPerson > 0 ? "Price per person" : "Community rate"}</span>
              <span>{effectivePricePerPerson > 0 ? formatCurrency(effectivePricePerPerson) : "Free"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-black/60">
              <span>Party size</span>
              <span>{Number(form.party_size || 0)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-lg font-semibold text-brand.heron">
              <span>{effectivePricePerPerson > 0 ? "Total due today" : "Due today"}</span>
              <span>{effectivePricePerPerson > 0 ? formatCurrency(totalPrice) : "Free"}</span>
            </div>
          </div>

          {effectivePricePerPerson <= 0 && (
            <div className="rounded-2xl bg-brand.water/10 p-4 text-sm text-black/70">
              This outing is free to join. If you want to support future community hikes, you can leave an optional tip.
              <div className="mt-3">
                <PayLinkButton>Leave an Optional Tip</PayLinkButton>
              </div>
            </div>
          )}

          <button
            className="button-primary w-full disabled:opacity-60"
            type="submit"
            disabled={
              bookingState.status === "submitting" ||
              !selectedTourData.checkoutEnabled ||
              Number(form.party_size || 0) <= 0
            }
          >
            {bookingState.status === "submitting"
              ? effectivePricePerPerson > 0
                ? "Redirecting to checkout..."
                : "Submitting..."
              : effectivePricePerPerson > 0
                ? `Pay ${formatCurrency(totalPrice)}`
                : "Reserve Free Spot"}
          </button>

          {!selectedTourData.checkoutEnabled && (
            <p className="text-sm text-amber-700">
              This tour is not open for online booking right now.
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
