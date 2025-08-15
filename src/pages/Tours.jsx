// src/pages/Tours.jsx
import React, { useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "../hooks/useForm";
import { submitVolunteerForm } from "../services/forms";
import TourCalendar from "../components/TourCalendar";

export default function Tours() {
  const { status, error, handleSubmit } = useForm(submitVolunteerForm);
  const [selectedTour, setSelectedTour] = useState("Sunset Kayak – Meadow Park Lake");
  const [filter, setFilter] = useState("All");
  const formRef = useRef(null);

  // --- Catalog -------------------------------------------------------------
  const TOURS = useMemo(
    () => [
      // Kayak
      {
        title: "Sunset Kayak – Meadow Park Lake",
        desc: "Calm-water paddle, ~2 hours. Great for beginners.",
        category: "Kayak",
        tags: ["Easy", "Sunset", "Water"],
      },
      {
        title: "Lake Tansi Morning Kayak",
        desc: "Early paddle for wildlife spotting on mellow water.",
        category: "Kayak",
        tags: ["Easy", "Wildlife", "Water"],
      },

      // Hike
      {
        title: "Black Mountain Overlook Hike",
        desc: "Scenic hills, light elevation, photo-friendly spots.",
        category: "Hike",
        tags: ["Scenic", "Easy", "Photos"],
      },
      {
        title: "Ozone Falls Hike",
        desc: "Short trail to a dramatic waterfall; shaded and easy.",
        category: "Hike",
        tags: ["Waterfall", "Easy", "Shade"],
      },
      {
        title: "Lily Bluff Trail – Obed River",
        desc: "Moderate hike with fantastic river overlooks.",
        category: "Hike",
        tags: ["Moderate", "River Views", "Scenic"],
      },

      // Nature Walks (new bucket to mirror Home)
      {
        title: "Soldier’s Beach Nature Walk",
        desc: "Gentle shoreline walk with plant & wildlife notes.",
        category: "Nature",
        tags: ["Easy", "Shoreline", "Nature"],
      },
      {
        title: "Birdwatching – Cumberland Mtn SP",
        desc: "Easy loop focused on spotting local birds.",
        category: "Nature",
        tags: ["Easy", "Wildlife", "Family"],
      },

      // Camping (new)
      {
        title: "Camping & Overnights – Intro Campout",
        desc: "Simple, relaxed campout with the basics: tents, fire, and stars.",
        category: "Camping",
        tags: ["Beginner", "Relaxed", "Evening"],
      },

      // Photo Meetups (new)
      {
        title: "Photo Meetup – Golden Hour Lakeside",
        desc: "Low-key gathering for sunset photos and easy shoreline wandering.",
        category: "Photo",
        tags: ["Golden Hour", "Casual", "Scenic"],
      },

      // Seasonal
      {
        title: "Fall Colors Hike (Seasonal)",
        desc: "Peak color walk; leisurely pace for photos.",
        category: "Seasonal",
        tags: ["Scenic", "Photos", "Easy"],
      },
      {
        title: "Winter Stillness Walk (Seasonal)",
        desc: "Quiet, mindful nature walk when trails are calm.",
        category: "Seasonal",
        tags: ["Mindful", "Easy", "Quiet"],
      },
    ],
    []
  );

  const FILTERS = ["All", "Kayak", "Hike", "Nature", "Camping", "Photo", "Walk", "Seasonal"];

  const visibleTours = useMemo(
    () => (filter === "All" ? TOURS : TOURS.filter((t) => t.category === filter)),
    [filter, TOURS]
  );

  // Keep event-selected titles available in the <select>
  const tourTitlesForSelect = useMemo(() => {
    const base = TOURS.map((t) => t.title);
    if (selectedTour && !base.includes(selectedTour)) return [...base, selectedTour];
    return base;
  }, [TOURS, selectedTour]);

  // --- Handlers ------------------------------------------------------------
  function selectTour(title) {
    setSelectedTour(title);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  // Called by <TourCalendar /> when a date or event is selected
  function handleUseEvent(evOrDate) {
    let dateLabel = "";

    if (evOrDate?.start_at) {
      // User clicked an event
      const tourTitle = evOrDate.title || evOrDate.tour || selectedTour;
      dateLabel = formatDateRange(evOrDate.start_at, evOrDate.end_at);
      setSelectedTour(tourTitle);
    } else if (evOrDate instanceof Date) {
      // User clicked a day without events
      dateLabel = evOrDate.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    const datesEl = formRef.current?.querySelector('input[name="dates"]');
    if (datesEl) datesEl.value = dateLabel;

    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  // --- Render --------------------------------------------------------------
  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <Helmet>
        <title>Tours — Be Still Crossville</title>
        <meta
          name="description"
          content="Kayak, hike, nature walks, camping, photo meetups, and seasonal outings across the Upper Cumberland. Pick a date or send us one that works for you."
        />
        <link rel="canonical" href="https://stillcrossville.com/tours" />

        {/* Social preview */}
        <meta property="og:title" content="Tours — Be Still Crossville" />
        <meta
          property="og:description"
          content="Kayak, hike, nature walks, camping, photo meetups, and seasonal outings across the Upper Cumberland."
        />
        <meta property="og:image" content="https://stillcrossville.com/og.jpg" />
        <meta property="og:url" content="https://stillcrossville.com/tours" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Tours — Be Still Crossville" />
        <meta
          name="twitter:description"
          content="Kayak, hike, nature walks, camping, photo meetups, and seasonal outings across the Upper Cumberland."
        />
        <meta name="twitter:image" content="https://stillcrossville.com/og.jpg" />
      </Helmet>

      <h1 className="text-3xl font-semibold text-brand.heron mb-6">Tours &amp; Sign Up</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Calendar + list */}
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold text-brand.heron mb-2">Pick a date</h2>
            <TourCalendar onUseEvent={handleUseEvent} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition " +
                    (active
                      ? "bg-brand-heron text-white"
                      : "border border-black/10 hover:bg-brand.water/10 text-brand.heron")
                  }
                >
                  {f}
                </button>
              );
            })}
          </div>

          {/* Tour cards */}
          <div className="space-y-3">
            {visibleTours.map((t) => {
              const active = selectedTour === t.title;
              return (
                <div
                  key={t.title}
                  className={
                    "card transition ring-0 " +
                    (active ? "border-brand.heron/50 ring-1 ring-brand.heron/30" : "")
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-brand.heron truncate">{t.title}</h3>
                      <p className="text-sm text-black/70 mt-1">{t.desc}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {t.tags.map((tag) => (
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
                      onClick={() => selectTour(t.title)}
                      className={
                        "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition " +
                        (active
                          ? "bg-brand-heron text-white"
                          : "border border-black/10 hover:bg-brand.water/10 text-brand.heron")
                      }
                      aria-pressed={active}
                    >
                      {active ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: form */}
        <form ref={formRef} onSubmit={handleSubmit} className="card space-y-3">
          <p className="text-sm text-black/70">
            Soft launch: help us refine these experiences. You choose the amount.
          </p>

          {/* Honeypot */}
          <input
            type="text"
            name="_gotcha"
            style={{ display: "none" }}
            tabIndex="-1"
            autoComplete="off"
          />

          <label className="block">
            <span className="text-sm">Name</span>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Phone (optional)</span>
            <input name="phone" className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
          </label>

          <label className="block">
            <span className="text-sm">Preferred Contact</span>
            <select
              name="preferred_contact"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              defaultValue="email"
            >
              <option value="email">Email</option>
              <option value="text">Text</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Tour Interested In</span>
            <select
              name="tour"
              value={selectedTour}
              onChange={(e) => setSelectedTour(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            >
              {tourTitlesForSelect.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Preferred Date(s)</span>
            <input
              name="dates"
              placeholder="Pick from calendar or write a date"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm">Notes</span>
            <textarea
              name="notes"
              rows="3"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
              placeholder="Gear needs, questions, etc."
            />
          </label>

          <div className="text-xs text-black/60">
            Payment options shared after sign-up (Stripe link, Venmo, or cash in person). PWYW for volunteers.
          </div>

          <button className="button-primary" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting…" : "Submit"}
          </button>

          {status === "success" && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <p>
                <strong>Thanks!</strong> We’ll be in touch soon.
              </p>

              {import.meta.env.VITE_STRIPE_PWYW_URL && (
                <a
                  className="mt-3 inline-block rounded-xl bg-brand-heron px-4 py-2 font-medium text-white hover:opacity-90"
                  href={import.meta.env.VITE_STRIPE_PWYW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pay What You Want (optional)
                </a>
              )}

              <p className="mt-2 text-xs text-gray-600">
                Opens a secure Stripe page. Prefer cash or Venmo? You can pay later.
              </p>
            </div>
          )}
          {status === "error" && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </div>
    </section>
  );
}

function formatDateRange(startISO, endISO) {
  try {
    const s = new Date(startISO);
    const e = endISO ? new Date(endISO) : null;
    const d1 = s.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (!e) return d1;
    const sameDay = s.toDateString() === e.toDateString();
    if (sameDay) {
      const t1 = s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const t2 = e.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return `${d1} ${t1}–${t2}`;
    }
    const d2 = e.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${d1} → ${d2}`;
  } catch {
    return "";
  }
}