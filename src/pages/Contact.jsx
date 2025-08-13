import React, { useState } from "react";
import Seo from "../components/Seo";

export default function Contact() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    // Honeypot
    if ((data._gotcha || "").trim()) {
      setStatus("success");
      form.reset();
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: (data.name || "").toString().trim().slice(0, 100),
            email: (data.email || "").toString().trim().toLowerCase(),
            message: (data.message || "").toString().trim().slice(0, 2000),
          }),
        }
      );
      if (!res.ok) throw new Error(await res.text());

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err.message || "Something went wrong.");
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-4 py-12">
      <Seo
        title="Contact — Be Still Crossville"
        description="Questions about kayak tours or hikes? Send us a note."
        url="https://stillcrossville.com/contact"
      />
      <h1 className="text-3xl font-semibold text-brand.heron mb-6">Contact</h1>

      <form onSubmit={onSubmit} className="card space-y-3 max-w-xl">
        <input type="text" name="_gotcha" style={{ display: "none" }} tabIndex="-1" autoComplete="off" />

        <label className="block">
          <span className="text-sm">Name</span>
          <input name="name" required className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm">Email</span>
          <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm">Message</span>
          <textarea name="message" rows="5" required className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2" />
        </label>

        <button className="button-primary" type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send"}
        </button>

        {status === "success" && <p className="text-green-700 text-sm">Thanks! We’ll get back to you soon.</p>}
        {status === "error" && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </section>
  );
}