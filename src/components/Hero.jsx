// src/components/Hero.jsx
import React from "react";
import { Link } from "react-router-dom";
import heroImage from "../assets/placeholder.jpeg";
import logo from "../assets/logo.png";

export default function Hero() {
  return (
    <section
      className="relative h-[70vh] md:h-[80vh] flex items-center justify-center text-white text-center"
      style={{
        backgroundImage: `url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center 65%",
      }}
    >
      <div className="absolute inset-0 bg-black/45 md:bg-black/40" />

      <div className="relative px-4 max-w-4xl">
        <img
          src={logo}
          alt="Be Still Crossville logo"
          className="mx-auto w-28 md:w-36 mb-6 drop-shadow"
        />
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Explore Crossville’s Hidden Gems
        </h1>
        <p className="mt-4 text-lg md:text-xl opacity-95">
          Accessible, affordable, and unforgettable kayaking, hiking, and guided tours
          with <span className="font-semibold">Be Still Crossville</span>.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <Link to="/tours" className="button-primary" aria-label="View Tours">
            View Tours
          </Link>
          <a
            href="#learn-more"
            className="px-4 py-2 rounded-xl border border-white/80 text-white hover:bg-white/10 transition"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
