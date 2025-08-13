// src/pages/Contact.jsx
import React from "react";
import Seo from "../components/Seo";
import { useForm } from "../hooks/useForm";
import { submitContactForm } from "../services/forms";

export default function Contact() {
  const { status, error, handleSubmit } = useForm(submitContactForm);

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <Seo
        title="Contact — Be Still Crossville"
        description="Questions about kayak tours or hikes? Send us a note."
        url="https://stillcrossville.com/contact"
      />

      <h1 className="text-3xl font-semibold text-brand.heron mb-6">Contact</h1>

      <form onSubmit={handleSubmit} className="card space-y-3 max-w-xl" noValidate>
        {/* Honeypot (spam trap) */}
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
          <p className="text-green-700 text-sm" role="status" aria-live="polite">
            Thanks! We’ll get back to you soon.
          </p>
        )}
        {status === "error" && (
          <p className="text-red-600 text-sm" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}