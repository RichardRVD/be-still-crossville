// src/components/Accordion.jsx
import React, { useState } from "react";

export default function Accordion({ items = [], singleExpand = true }) {
  const [openIndex, setOpenIndex] = useState(null);
  const [openSet, setOpenSet] = useState(new Set());

  function toggle(i) {
    if (singleExpand) {
      setOpenIndex((prev) => (prev === i ? null : i));
    } else {
      setOpenSet((prev) => {
        const next = new Set(prev);
        next.has(i) ? next.delete(i) : next.add(i);
        return next;
      });
    }
  }

  const isOpen = (i) => (singleExpand ? openIndex === i : openSet.has(i));

  return (
    <div className="rounded-2xl border border-black/5 divide-y">
      {items.map((item, i) => {
        const open = isOpen(i);
        return (
          <div
            key={i}
            className={
              "transition-colors " +
              (open ? "bg-brand.heron/10" : "bg-white")
            }
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={open}
              className={
                "w-full flex items-center justify-between gap-4 px-4 py-3 text-left " +
                (open ? "text-brand.heron" : "text-foreground")
              }
            >
              <span className="font-medium">{item.q}</span>
              <span
                className={
                  "inline-flex h-6 w-6 items-center justify-center rounded-md border border-black/10 " +
                  (open ? "bg-brand.heron text-white" : "bg-white text-black/60")
                }
                aria-hidden="true"
              >
                {open ? "−" : "+"}
              </span>
            </button>

            {/* Answer */}
            <div
              className={
                "px-4 text-sm text-black/70 transition-[max-height,opacity] duration-200 " +
                (open ? "opacity-100 max-h-64" : "opacity-0 max-h-0 overflow-hidden")
              }
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}