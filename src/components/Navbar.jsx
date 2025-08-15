// src/components/Navbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

const link = ({ isActive }) =>
  "block w-full text-left px-4 py-3 rounded-xl text-base font-medium " +
  (isActive
    ? "bg-brand.water/20 text-brand.heron"
    : "text-foreground hover:bg-brand.water/10");

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onDocClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-white/80 border-b border-black/5">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <span className="text-lg md:text-xl font-semibold tracking-wide text-brand.heron">
            Be Still Crossville
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2">
          <NavLink to="/" className={link} end>
            Home
          </NavLink>
          <NavLink to="/tours" className={link}>
            Tours
          </NavLink>
          <NavLink to="/about" className={link}>
            About
          </NavLink>
          <NavLink to="/contact" className={link}>
            Contact
          </NavLink>
        </nav>

        {/* Mobile Menu Button */}
        <button
          ref={btnRef}
          className="md:hidden p-3 rounded-xl hover:bg-brand.water/10"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
        >
          <svg
            className="w-7 h-7 text-brand.heron"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Nav (animated) */}
      <div
        id="mobile-nav"
        ref={menuRef}
        className={
          "md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out " +
          (menuOpen ? "opacity-100 max-h-[320px]" : "opacity-0 max-h-0")
        }
      >
        <nav className="px-2 pb-3">
          <NavLink to="/" className={link} end>
            Home
          </NavLink>
          <NavLink to="/tours" className={link}>
            Tours
          </NavLink>
          <NavLink to="/about" className={link}>
            About
          </NavLink>
          <NavLink to="/contact" className={link}>
            Contact
          </NavLink>
        </nav>
      </div>
    </header>
  );
}