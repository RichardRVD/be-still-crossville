// src/pages/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Hero from "../components/Hero";
import { FaHiking, FaWater, FaLeaf, FaMapMarkerAlt, FaShieldAlt, FaHandshake } from "react-icons/fa";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Be Still Crossville — Guided Kayak & Hike Tours in Cumberland County, TN</title>
        <meta
          name="description"
          content="Small-group kayak tours, guided hikes, and community cleanups around Crossville, TN. Soft launch: pay what you want for volunteers."
        />
        <link rel="canonical" href="https://stillcrossville.com/" />

        {/* Social preview */}
        <meta property="og:title" content="Be Still Crossville — Guided Kayak & Hike Tours" />
        <meta
          property="og:description"
          content="Small-group kayak tours, guided hikes, and community cleanups in Cumberland County, TN."
        />
        <meta property="og:image" content="https://stillcrossville.com/og.jpg" />
        <meta property="og:url" content="https://stillcrossville.com/" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Be Still Crossville — Guided Kayak & Hike Tours" />
        <meta
          name="twitter:description"
          content="Small-group kayak tours, guided hikes, and community cleanups in Cumberland County, TN."
        />
        <meta name="twitter:image" content="https://stillcrossville.com/og.jpg" />
      </Helmet>

      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context":"https://schema.org",
            "@type":"Organization",
            "name":"Be Still Crossville",
            "url":"https://stillcrossville.com/",
            "logo":"https://stillcrossville.com/logo.png",
            "sameAs":[
              "https://www.facebook.com/profile.php?id=61579414521058",
              "https://www.instagram.com/bestillcrossville/",
              "https://www.tiktok.com/@bestillcrossville"
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context":"https://schema.org",
            "@type":"WebSite",
            "name":"Be Still Crossville",
            "url":"https://stillcrossville.com/",
            "potentialAction":{
              "@type":"SearchAction",
              "target":"https://stillcrossville.com/?q={search_term_string}",
              "query-input":"required name=search_term_string"
            }
          })}
        </script>
      </Helmet>

      <Hero />

      {/* What we offer */}
      <section id="learn-more" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-4 text-brand.heron">What we offer</h2>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Guided Hikes",
              desc: "Beginner-friendly trails with local history and waterfall highlights.",
              icon: <FaHiking className="text-brand.heron/90" size={20} />,
            },
            {
              title: "Kayak Trips",
              desc: "Calm-water paddles on local lakes and rivers — sunrise to sunset.",
              icon: <FaWater className="text-brand.heron/90" size={20} />,
            },
            {
              title: "Community & Cleanups",
              desc: "Beach cleanups, stewardship days, and volunteer meetups.",
              icon: <FaHandshake className="text-brand.heron/90" size={20} />,
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
                desc: "Clear planning, right-sized groups, and weather-aware guiding.",
                icon: <FaShieldAlt size={24} className="mx-auto text-brand.heron" />,
              },
              {
                title: "Pay What You Want",
                desc: "Soft-launch pricing so everyone can join in.",
                icon: <FaLeaf size={24} className="mx-auto text-brand.heron" />,
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl shadow-sm p-4">
                {item.icon}
                <h3 className="mt-3 font-semibold text-brand.heron">{item.title}</h3>
                <p className="text-sm text-black/70 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <Link to="/tours" className="button-primary inline-block">
              View Tours
            </Link>
            <p className="text-xs text-black/60 mt-2">
              Soft launch: Pay What You Want for volunteers.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}