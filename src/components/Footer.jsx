import React from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5">
      <div className="max-w-5xl mx-auto px-4 py-6 text-sm text-center text-black/60">
        © {currentYear} Be Still Crossville • Established 2025 • Crossville, TN
      </div>
    </footer>
  );
}
