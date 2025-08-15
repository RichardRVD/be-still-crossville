// src/pages/Contact.jsx
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { submitContactForm } from "../services/forms";

export default function Contact() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot
    if ((data.get("_gotcha") || "").toString().trim()) {
      setStatus("success");
      form.reset();
      return;
    }

    try {
      await submitContactForm(data);
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err?.message || "Something went wrong.");
    }
  }

  return (
    <>
      <Helmet>
        <title>Contact — Be Still Crossville</title>
        <meta
          name="description"
          content="Questions about kayak tours or hikes? Send us a note."
        />
        <link rel="canonical" href="https://stillcrossville.com/contact" />

        {/* Social */}
        <meta property="og:title" content="Contact — Be Still Crossville" />
        <meta
          property="og:description"
          content="Questions about kayak tours or hikes? Send us a note."
        />
        <meta property="og:image" content="https://stillcrossville.com/og.jpg" />
        <meta property="og:url" content="https://stillcrossville.com/contact" />
        <meta property="og:type" content="website" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact — Be Still Crossville" />
        <meta
          name="twitter:description"
          content="Questions about kayak tours or hikes? Send us a note."
        />
        <meta name="twitter:image" content="https://stillcrossville.com/og.jpg" />
      </Helmet>

      {/* JSON-LD: ContactPage + Organization contactPoint */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Contact — Be Still Crossville",
            "url": "https://stillcrossville.com/contact"
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Be Still Crossville",
            "url": "https://stillcrossville.com/",
            "contactPoint": [{
              "@type": "ContactPoint",
              "contactType": "customer support",
              "email": "info@stillcrossville.com",
              "areaServed": "US",
              "availableLanguage": ["English"]
            }]
          })}
        </script>
      </Helmet>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-semibold text-brand.heron mb-6">Contact</h1>

        <form onSubmit={onSubmit} className="card space-y-3 max-w-xl">
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
            <input
              name="phone"
              inputMode="tel"
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
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
            <span className="text-sm">Message</span>
            <textarea
              name="message"
              rows="5"
              required
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2"
            />
          </label>

          <button className="button-primary" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Sending…" : "Send"}
          </button>

          {status === "success" && (
            <p className="text-green-700 text-sm">Thanks! We’ll get back to you soon.</p>
          )}
          {status === "error" && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      </section>
    </>
  );
}