import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaShieldAlt, FaMapMarkedAlt } from "react-icons/fa";
import Accordion from "../components/Accordion";
import Logo from "../components/Logo";
import { listAboutGallery } from "../services/storage";
import Seo from "../components/Seo";

export default function About() {
  const [lightbox, setLightbox] = useState({ open: false, src: null });
  const [gallery, setGallery] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await listAboutGallery();
        if (!cancelled) setGallery(items.slice(0, 15));
      } catch (e) {
        console.warn("Gallery load failed:", e);
      } finally {
        if (!cancelled) setLoadingGallery(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const faqItems = useMemo(
    () => [
      { q: "Do I need prior experience?", a: "Nope. Our hikes and calm-water paddles are beginner friendly. We set the pace based on the group." },
      { q: "What should I bring?", a: "Water, sunscreen, comfy shoes. For kayaking: quick dry clothing and a towel. We’ll confirm specifics by email." },
      { q: "What happens if the weather looks bad?", a: "Safety first, if conditions aren’t right, we reschedule. We’ll email you updates the day before or morning of." },
      { q: "How does Pay What You Want work?", a: "During our soft launch, you choose the amount, via Stripe, cash, or Venmo after you sign up." },
      { q: "Where do we meet?", a: "We’ll email exact meet-up info (like Meadow Park Lake or the trailhead) after you sign up for a tour." },
    ],
    []
  );

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      {/* Heading */}
      <header className="text-center mb-10">
        <Logo className="mx-auto w-16 h-16 mb-4" />
        <h1 className="text-3xl md:text-4xl font-semibold text-brand.heron">
          About Be Still Crossville
        </h1>
        <p className="mt-2 text-black/70">
          Local, small, and people-first. We help folks slow down and enjoy the lakes and hikes
          around Crossville, TN and Upper Cumberland's beauty.
        </p>
      </header>

      <Seo
        title="About — Be Still Crossville"
        description="Our story, values, and how we keep your experience safe, simple, and peaceful."
        url="https://stillcrossville.com/about"
      />

      {/* Story & Mission */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="card">
          <h2 className="font-semibold text-brand.heron mb-2">Our Story</h2>
          <p className="text-sm text-black/70">
            We started Be Still Crossville to share the quiet side of the Cumberland Plateau —
            calm water paddles, beginner-friendly hikes, and nature walks where conversation and
            observation matter as much as miles. It’s community first, adventure second.
          </p>
        </div>
        <div className="card">
          <h2 className="font-semibold text-brand.heron mb-2">Our Mission</h2>
          <p className="text-sm text-black/70">
            Create accessible outdoor experiences that leave people more grounded than when they arrived,
            with clear planning, steady pacing, and respect for the places we visit.
          </p>
        </div>
      </div>

      {/* Values */}
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {[
          { icon: <FaHeart className="text-brand.heron" size={22} />, title: "People Centered", desc: "Small groups, welcoming pace, and room to breathe." },
          { icon: <FaShieldAlt className="text-brand.heron" size={22} />, title: "Safety First", desc: "Gear checks, weather awareness, and clear expectations." },
          { icon: <FaMapMarkedAlt className="text-brand.heron" size={22} />, title: "Local Focus", desc: "Upper Cumberland (and surrounding areas) lakes, overlooks, and trails we know well." },
        ].map((v) => (
          <div key={v.title} className="card">
            <div className="flex items-center gap-2">
              {v.icon}
              <h3 className="font-semibold text-brand.heron">{v.title}</h3>
            </div>
            <p className="text-sm text-black/70 mt-2">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Gallery (from Supabase Storage) */}
      <div className="mb-10">
        <h2 className="font-semibold text-brand.heron mb-3">A glimpse of the quiet</h2>

        {loadingGallery ? (
          <div className="w-full rounded-xl border border-dashed border-black/20 bg-black/5 p-6 text-center text-black/50">
            Loading photos…
          </div>
        ) : gallery.length === 0 ? (
          <div className="w-full rounded-xl border border-dashed border-black/20 bg-black/5 p-6 text-center text-black/50">
            Add images to <code>Storage → media/about</code> to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gallery.map((img, i) => (
              <button
                key={img.original}
                type="button"
                onClick={() => setLightbox({ open: true, src: img.full })}
                className="group relative overflow-hidden rounded-xl border border-black/5 focus:outline-none"
                aria-label={`Open image ${i + 1}`}
              >
                <img
                  src={img.thumb}
                  srcSet={`${img.thumb} 1x, ${img.thumb2x} 2x`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  alt={`Quiet moments on the Plateau — photo ${i + 1}`}
                  className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                  // Helps avoid layout shift before image paints:
                  style={{ aspectRatio: "16 / 9", backgroundColor: "rgba(0,0,0,0.04)" }}
                />
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox (simple) */}
      {lightbox.open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox({ open: false, src: null })}
        >
          <img
            src={lightbox.src ?? ""}
            alt="Enlarged gallery"
            className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            decoding="async"
          />
        </div>
      )}

      {/* FAQ */}
      <section className="py-10">
        <h2 className="text-xl font-semibold mb-4 text-brand.heron">FAQ</h2>
        <Accordion items={faqItems} />
      </section>

      {/* CTA */}
      <div className="text-center mt-6">
        <Link to="/tours" className="button-primary">Book a Tour</Link>
        <p className="text-xs text-black/60 mt-2">Soft launch: Pay What You Want for volunteers.</p>
      </div>
    </section>
  );
}