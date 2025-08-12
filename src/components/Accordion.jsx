import React, { useState } from "react";

export default function Accordion({ items }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white divide-y divide-black/10">
      {items.map((it, i) => (
        <Row key={i} q={it.q} a={it.a} />
      ))}
    </div>
  );
}

function Row({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={[
        "transition-colors",
        "duration-300",
        "relative",
         open ? "bg-brand.heron/80 text-white" : "bg-white text-brand.heron"
      ].join(" ")}
    >
      {/* left accent when open */}
      <span
        className={[
          "absolute left-0 top-0 h-full w-1 rounded-l-2xl transition-opacity duration-300",
          open ? "opacity-100 bg-brand.heron" : "opacity-0",
        ].join(" ")}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 text-left flex items-center justify-between relative"
        aria-expanded={open}
      >
        <span className="font-medium text-brand.heron">{q}</span>
        <span
          className={[
            "ml-4 text-black/60 select-none",
            "transition-transform duration-300",
            open ? "rotate-45" : "rotate-0",
          ].join(" ")}
        >
          +
        </span>
      </button>

      {/* Slide + fade answer */}
      <div
        className={[
          "px-4 pr-6 text-sm text-black/70",
          "overflow-hidden transition-all duration-300",
          open ? "max-h-40 opacity-100 pb-4" : "max-h-0 opacity-0 pb-0",
        ].join(" ")}
      >
        {typeof a === "string" ? <p>{a}</p> : a}
      </div>
    </div>
  );
}
