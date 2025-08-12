import React, { useMemo, useState, useRef } from 'react'
import { useForm } from '../hooks/useForm'
import { submitVolunteerForm } from '../services/forms'

export default function Tours() {
  const { status, error, handleSubmit } = useForm(submitVolunteerForm)
  const [selectedTour, setSelectedTour] = useState('Sunset Kayak – Meadow Park Lake')
  const [filter, setFilter] = useState('All')
  const formRef = useRef(null)

  // Catalog with categories + tags
  const TOURS = useMemo(() => ([
    // Water
    { title: 'Sunset Kayak – Meadow Park Lake', desc: 'Calm-water paddle, ~2 hours. Great for beginners.', category: 'Kayak', tags: ['Easy','Sunset','Water'] },
    { title: 'Lake Tansi Morning Kayak',          desc: 'Early paddle for wildlife spotting on mellow water.', category: 'Kayak', tags: ['Easy','Wildlife','Water'] },

    // Hikes / Overlooks
    { title: 'Black Mountain Overlook Hike',      desc: 'Scenic hills, light elevation, photo-friendly spots.', category: 'Hike', tags: ['Scenic','Easy','Photos'] },
    { title: 'Ozone Falls Hike',                   desc: 'Short trail to a dramatic waterfall; shaded and easy.', category: 'Hike', tags: ['Waterfall','Easy','Shade'] },
    { title: 'Lily Bluff Trail – Obed River',      desc: 'Moderate hike with fantastic river overlooks.', category: 'Hike', tags: ['Moderate','River Views','Scenic'] },

    // Walks / Nature
    { title: 'Soldier’s Beach Nature Walk',        desc: 'Gentle shoreline walk with plant & wildlife notes.', category: 'Walk', tags: ['Easy','Shoreline','Nature'] },
    { title: 'Birdwatching – Cumberland Mtn SP',   desc: 'Easy loop focused on spotting local birds.', category: 'Walk', tags: ['Easy','Wildlife','Family'] },

    // Seasonal
    { title: 'Fall Colors Hike (Seasonal)',        desc: 'Peak color walk; leisurely pace for photos.', category: 'Seasonal', tags: ['Scenic','Photos','Easy'] },
    { title: 'Winter Stillness Walk (Seasonal)',   desc: 'Quiet, mindful nature walk when trails are calm.', category: 'Seasonal', tags: ['Mindful','Easy','Quiet'] },
  ]), [])

  const FILTERS = ['All','Kayak','Hike','Walk','Seasonal']

  const visibleTours = useMemo(() => {
    if (filter === 'All') return TOURS
    return TOURS.filter(t => t.category === filter)
  }, [filter, TOURS])

  function selectTour(title) {
    setSelectedTour(title)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-brand.heron mb-6">Tours & Sign Up</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Tour list with filters */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => {
              const active = f === filter
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition ' +
                    (active
                      ? 'bg-brand-heron text-white'
                      : 'border border-black/10 hover:bg-brand.water/10 text-brand.heron')
                  }
                >
                  {f}
                </button>
              )
            })}
          </div>

          {/* Cards */}
          {visibleTours.map((t) => {
            const active = selectedTour === t.title
            return (
              <div
                key={t.title}
                className={
                  'card transition ring-0 ' +
                  (active ? 'border-brand.heron/50 ring-1 ring-brand.heron/30' : '')
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-brand.heron truncate">{t.title}</h2>
                    <p className="text-sm text-black/70 mt-1">{t.desc}</p>
                    {/* Tags */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {t.tags.map(tag => (
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
                      'shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition ' +
                      (active
                        ? 'bg-brand-heron text-white'
                        : 'border border-black/10 hover:bg-brand.water/10 text-brand.heron')
                    }
                    aria-pressed={active}
                  >
                    {active ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Volunteer form */}
        <form ref={formRef} onSubmit={handleSubmit} className="card space-y-3">
          <h2 className="font-semibold text-brand.heron">Volunteer Sign-Up (Pay What You Want)</h2>
          <p className="text-sm text-black/70">
            Soft launch: help us refine these experiences. You choose the amount.
          </p>

          {/* Honeypot (spam) */}
          <input type="text" name="_gotcha" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

          <label className="block">
            <span className="text-sm">Name</span>
            <input name="name" required className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
          </label>

          <label className="block">
            <span className="text-sm">Email</span>
            <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
          </label>

          <label className="block">
            <span className="text-sm">Phone (optional)</span>
            <input name="phone" className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
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
                <option key={t.title} value={t.title}>{t.title}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm">Preferred Date(s)</span>
            <input name="dates" placeholder="e.g., Aug 20 or weekends" className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
          </label>

          <label className="block">
            <span className="text-sm">Notes</span>
            <textarea name="notes" rows="3" className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" placeholder="Gear needs, questions, etc." />
          </label>

          <div className="text-xs text-black/60">
            Payment options shared after sign-up (Stripe link, Venmo, or cash in person). PWYW for volunteers.
          </div>

          <button className="button-primary" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting…' : 'Submit'}
          </button>

          {status === 'success' && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <p><strong>Thanks!</strong> We’ll be in touch soon.</p>

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
          {status === 'error' && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </div>
    </section>
  )
}
