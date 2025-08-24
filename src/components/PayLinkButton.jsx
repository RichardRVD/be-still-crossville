// src/components/PayLinkButton.jsx
import React from "react";

export default function PayLinkButton({
  children = "Pay What You Want",
  className = "",
  ariaLabel = "Open secure payment link",
}) {
  const href = import.meta.env.VITE_STRIPE_PWYW_URL;
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={
        "inline-flex items-center gap-2 rounded-xl bg-brand-heron px-4 py-2 " +
        "font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 " +
        "focus:ring-brand.heron/40 " +
        className
      }
    >
      {children}
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className="h-4 w-4 opacity-80"
      >
        <path d="M11 3h6v6h-2V6.414l-7.293 7.293-1.414-1.414L13.586 5H11V3z" />
        <path d="M5 5h4v2H7v8h8v-2h2v4H5V5z" />
      </svg>
    </a>
  );
}