import React from "react";
import Hero from "../components/Hero";
import { FaHiking, FaWater, FaLeaf, FaMapMarkerAlt, FaShieldAlt, FaHandshake } from "react-icons/fa";

export default function Home() {
  return (
    <>
      <Hero />

      {/* What we offer */}
      <section id="learn-more" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-4 text-brand.heron">What we offer</h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Guided Hikes",
              desc: "Beginner-friendly trails with local history and nature highlights.",
              icon: <FaHiking className="text-brand.heron/90" size={20} />,
            },
            {
              title: "Kayak Trips",
              desc: "Calm water paddles perfect for sunset and early mornings.",
              icon: <FaWater className="text-brand.heron/90" size={20} />,
            },
            {
              title: "Nature Walks",
              desc: "Gentle walks focused on presence and observation.",
              icon: <FaLeaf className="text-brand.heron/90" size={20} />,
            },
          ].map((c) => (
            <div key={c.title} className="card">
              <div className="flex items-center gap-2">
                {c.icon}
                <h3 className="font-semibold text-brand.heron">{c.title}</h3>
              </div>
              <p className="text-sm text-black/70 mt-2">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-brand.heron/5 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-xl font-semibold mb-6 text-center text-brand.heron">Why Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              {
                title: "Local Expertise",
                desc: "Led by Cumberland County locals who know the trails and waters.",
                icon: <FaMapMarkerAlt size={24} className="mx-auto text-brand.heron" />,
              },
              {
                title: "Safety First",
                desc: "Guided with proper gear, safety protocols, and local knowledge.",
                icon: <FaShieldAlt size={24} className="mx-auto text-brand.heron" />,
              },
              {
                title: "Pay What You Want",
                desc: "Soft launch pricing for volunteers—accessible for everyone.",
                icon: <FaHandshake size={24} className="mx-auto text-brand.heron" />,
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl shadow-sm p-4">
                {item.icon}
                <h3 className="mt-3 font-semibold text-brand.heron">{item.title}</h3>
                <p className="text-sm text-black/70 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
