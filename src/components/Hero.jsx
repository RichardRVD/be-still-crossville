import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHeroImageUrl } from "../services/storage";

export default function Hero() {
  const [heroUrl, setHeroUrl] = useState(null);
  const [loadingHero, setLoadingHero] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getHeroImageUrl();
        if (!cancelled) setHeroUrl(url);
      } catch (e) {
        console.warn("Hero image load failed:", e);
      } finally {
        if (!cancelled) setLoadingHero(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative bg-black text-white">
      {loadingHero ? (
        <div className="h-[60vh] flex items-center justify-center text-white/70">
          Loading hero…
        </div>
      ) : heroUrl ? (
        <img
          src={heroUrl}
          alt="Be Still Crossville Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="h-[60vh] flex items-center justify-center text-white/70">
          No hero image found
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-[60vh] bg-black/40 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Be Still Crossville
        </h1>
        <p className="max-w-xl mb-6">
          Guided Kayaking & Hiking Tours, Camping, and
                    Community Events in Cumberland County, TN
        </p>
        <Link to="/tours" className="button-primary">Book a Tour</Link>
      </div>
    </section>
  );
}