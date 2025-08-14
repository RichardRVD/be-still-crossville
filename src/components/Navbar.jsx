// src/components/Navbar.jsx
import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import Logo from "./Logo";

const link = ({ isActive }) =>
  "px-3 py-2 rounded-xl text-sm font-medium " +
  (isActive
    ? "bg-brand.water/20 text-brand.heron"
    : "text-foreground hover:bg-brand.water/10");

export default function Navbar() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-black/5">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo / Brand (never collapses) */}
        <Link
          to="/"
          className="flex items-center gap-3 flex-shrink-0"
          onClick={closeMenu}
        >
          <Logo className="w-10 h-10" />
          <span className="font-semibold tracking-wide text-brand.heron">
            Be Still Crossville
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/" className={link} end onClick={closeMenu}>
            Home
          </NavLink>
          <NavLink to="/tours" className={link} onClick={closeMenu}>
            Tours
          </NavLink>
          <NavLink to="/about" className={link} onClick={closeMenu}>
            About
          </NavLink>
          <NavLink to="/contact" className={link} onClick={closeMenu}>
            Contact
          </NavLink>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-black/5"
          aria-label="Toggle menu"
          aria-expanded={open ? "true" : "false"}
          onClick={() => setOpen((v) => !v)}
        >
          {/* Simple SVG icons (no external lib) */}
          {open ? (
            // X icon
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            // Hamburger icon
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      <div
        className={
          "md:hidden border-t border-black/5 bg-white/95 backdrop-blur transition-[max-height,opacity] overflow-hidden " +
          (open ? "max-h-96 opacity-100" : "max-h-0 opacity-0")
        }
      >
        <nav className="max-w-5xl mx-auto px-4 py-2 flex flex-col gap-2">
          <NavLink to="/" className={link} end onClick={closeMenu}>
            Home
          </NavLink>
          <NavLink to="/tours" className={link} onClick={closeMenu}>
            Tours
          </NavLink>
          <NavLink to="/about" className={link} onClick={closeMenu}>
            About
          </NavLink>
          <NavLink to="/contact" className={link} onClick={closeMenu}>
            Contact
          </NavLink>
        </nav>
      </div>
    </header>
  );
}