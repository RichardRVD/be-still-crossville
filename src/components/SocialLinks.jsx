// src/components/SocialLinks.jsx
import React from "react";
import { FaInstagram, FaFacebook, FaTiktok } from "react-icons/fa";

export default function SocialLinks() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      {/* Heading */}
      <h2 className="text-lg font-semibold text-brand.heron">Find us on:</h2>

      {/* Social Icons */}
      <div className="flex gap-6 text-2xl text-black/70">
        <a
          href="https://www.instagram.com/bestillcrossville/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand.heron"
        >
          <FaInstagram />
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=61579414521058"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand.heron"
        >
          <FaFacebook />
        </a>
        <a
          href="https://www.tiktok.com/@bestillcrossville"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-brand.heron"
        >
          <FaTiktok />
        </a>
      </div>
    </div>
  );
}
