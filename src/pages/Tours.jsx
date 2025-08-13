import React, { useMemo, useState, useRef } from "react";
import { useForm } from "../hooks/useForm";
import { submitVolunteerForm } from "../services/forms";
import Seo from "../components/Seo";

export default function Tours() {
  const { status, error, handleSubmit } = useForm(submitVolunteerForm);
  const [selectedTour, setSelectedTour] = useState("Sunset Kayak – Meadow Park Lake");
  const [filter, setFilter] = useState("All");
  const formRef = useRef(null);

  // === Catalog ===============================================================
  const TOURS = useMemo(
    () => [
      // Meadow Park Lake
      {
        title: "Sunset Kayak – Meadow Park Lake",
        desc: "Calm‑water paddle on Meadow Park Lake; golden‑hour photos. ~2 hours.",
        category: "Kayak",
        tags: ["Easy", "Sunset", "Lake"],
      },
      {
        title: "Kayak Tour to Soldier’s Beach (Meadow Park)",
        desc: "Easy paddle to the sandy shoreline at Soldier’s Beach.",
        category: "Kayak",
        tags: ["Easy", "Shoreline", "Lake"],
      },
      {
        title: "Soldier’s Beach Guided Hike (Meadow Park)",
        desc: "Gentle lakeside trail with nature notes and history.",
        category: "Hike",
        tags: ["Easy", "Shoreline", "Family"],
      },
      {
        title: "Soldier’s Beach Cleanup (Free)",
        desc: "Community stewardship day — bags/gloves provided.",
        category: "Cleanup",
        tags: ["Free", "Community", "Stewardship"],
      },

      // Ozone Falls
      {
        title: "Ozone Falls Hike",
        desc: "Short, rocky trail to a dramatic waterfall and plunge pool.",
        category: "Hike",
        tags: ["Waterfall", "Short", "Photos"],
      },

      // Black Mountain
      {
        title: "Black Mountain Overlook Hike",
        desc: "Scenic ridge views and sandstone bluffs; moderate pace.",
        category: "Hike",
        tags: ["Scenic", "Moderate", "Overlook"],
      },
      {
        title: "Black Mountain: Facilitated Backpacking & Camping",
        desc: "Intro to backpacking: route planning, gear coaching, and an overnight.",
        category: "Backpack/Camp",
        tags: ["Backpacking", "Overnight", "Skills"],
      },
      {
        title: "Black Mountain to Ozone Falls (Future Route Preview)",
        desc: "Scouting-style traverse for fit hikers; route finding & logistics.",
        category: "Hike",
        tags: ["Traverse", "Advanced", "Scouting"],
      },

      // Fancher / Burgess / Calfkiller
      {
        title: "Fancher Falls Kayak Tour",
        desc: "Quiet water approach to a tucked‑away falls (water levels permitting).",
        category: "Kayak",
        tags: ["Waterfall", "Scenic", "Photography"],
      },
      {
        title: "Burgess Falls Guided Hike",
        desc: "Classic falls overlook hike with multiple viewpoints.",
        category: "Hike",
        tags: ["Waterfall", "Family", "Photos"],
      },
      {
        title: "Burgess Falls Kayak Tour",
        desc: "Paddle the river section near Burgess (conditions/flow dependent).",
        category: "Kayak",
        tags: ["River", "Moderate", "Scenic"],
      },
      {
        title: "Calfkiller River Kayak Tour",
        desc: "Gentle current, birdlife, and pastoral river bends.",
        category: "Kayak",
        tags: ["River", "Easy", "Wildlife"],
      },

      // Virgin Falls & Caney Fork
      {
        title: "Virgin Falls Guided Hike",
        desc: "Iconic all‑day hike to caves and the namesake falls (~9 mi).",
        category: "Hike",
        tags: ["Waterfall", "Strenuous", "All‑day"],
      },
      {
        title: "Virgin Falls: Facilitated Backpacking & Camping",
        desc: "Plan & camp with guidance; water, food, and safety coaching.",
        category: "Backpack/Camp",
        tags: ["Backpacking", "Overnight", "Skills"],
      },
      {
        title: "Caney Fork (Virgin Falls Area) — Camping",
        desc: "Laid‑back campout beside the river corridor (permit/conditions).",
        category: "Backpack/Camp",
        tags: ["Camping", "River", "Relaxed"],
      },
      {
        title: "Caney Fork (Clifty) — All‑Inclusive River Day",
        desc: "A turnkey paddle day: boats, PFDs, snacks, and shuttle covered.",
        category: "River Day",
        tags: ["All‑inclusive", "River", "Easy"],
      },

      // State Park & Trails
      {
        title: "Cumberland Mountain State Park: Hike & Kayak Combo",
        desc: "Mix of shoreline hiking and flat‑water paddling in one outing.",
        category: "Park",
        tags: ["Combo", "Family", "Lake"],
      },
      {
        title: "Justin P. Wilson Cumberland Trail — Cave Hike",
        desc: "Cave‑adjacent segment; geology talk and careful exploration.",
        category: "Hike",
        tags: ["Cave", "Geology", "Moderate"],
      },
      {
        title: "Justin P. Wilson Cumberland Trail — Guided Hiking",
        desc: "Choose a segment; bluffs, bridges, and Plateau views.",
        category: "Hike",
        tags: ["Scenic", "Moderate", "Trail"],
      },
      {
        title: "Lost Creek Falls — Guided Hiking",
        desc: "Short approach to a beautiful, lesser‑traveled falls.",
        category: "Hike",
        tags: ["Waterfall", "Short", "Photos"],
      },
      {
        title: "Cummins Falls — Guided Hiking",
        desc: "Popular gorge hike; timing for crowds/flow and safety briefing.",
        category: "Hike",
        tags: ["Waterfall", "Gorge", "Popular"],
      },
      {
        title: "Cummins Falls Cleanup (Community)",
        desc: "Pitch in to keep a beloved site clean; supplies provided.",
        category: "Cleanup",
        tags: ["Community", "Stewardship", "Free"],
      },
      {
        title: "Daddy’s Creek — Guided Hiking",
        desc: "Rocky creek corridor with boulder outcrops and rapids.",
        category: "Hike",
        tags: ["Creek", "Moderate", "Scenic"],
      },
      {
        title: "Fall Creek Falls — Day Excursion",
        desc: "Park highlights tour: overlooks, suspension bridge, and falls.",
        category: "Excursion",
        tags: ["Waterfall", "Park", "Family"],
      },
    ],
    []
  );

  // Filters shown in UI
  const FILTERS = [
    "All",
    "Kayak",
    "Hike",
    "Backpack/Camp",
    "River Day",
    "Cleanup",
    "Park",
    "Excursion",
  ];

  const visibleTours = useMemo(() => {
    if (filter === "All") return TOURS;
    return TOURS.filter((t) => t.category === filter);
  }, [filter, TOURS]);

  function selectTour(title) {
    setSelectedTour(title);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // === UI ====================================================================
  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-brand.heron mb-6">Tours & Sign Up</h1>

     <Seo
       title="Tours — Be Still Crossville"
       description="Kayak, hike, backpacking intros, and stewardship events across Cumberland County & Upper Cumberland."
       url="https://stillcrossville.com/tours"
     />

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Tour list with filters */}
        <div className="space-y-4">
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

          {/* Cards */}
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
                    <h2 className="font-semibold text-brand.heron truncate">{t.title}</h2>
                    <p className="text-sm text-black/70 mt-1">{t.desc}</p>
                    {/* Tags */}
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

        {/* Right: Volunteer form */}
        <form ref={formRef} onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="font-semibold text-brand.heron">Volunteer Sign‑Up (Pay What You Want)</h2>
          <p className="text-sm text-black/70">
            Soft launch: help us refine these experiences. You choose the amount.
          </p>

          {/* Honeypot (spam) */}
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
            <span className="text-sm">Preferred contact</span>
            <select
              name="preferred_contact"
              defaultValue="email"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
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
              {TOURS.map((t) => (
                <option key={t.title} value={t.title}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Preferred Date(s)</span>
            <input
              name="dates"
              placeholder="e.g., Aug 20 or weekends"
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
            Payment options shared after sign‑up (Stripe link, Venmo, or cash in person). PWYW for
            volunteers.
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