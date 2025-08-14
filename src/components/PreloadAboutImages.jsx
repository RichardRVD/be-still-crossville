import { useEffect } from "react";

// --- CONFIG — tweak these if your storage layout is different ---
const BUCKET = "media";         // your Supabase Storage bucket name
const FOLDER = "about";          // folder inside the bucket ("" if at root)
const FILES = [
  "about1.jpeg",
  "about2.jpeg",
  "about3.jpeg",
  "about4.jpeg",
  "about5.jpeg",
  "about6.jpeg",
  "about7.jpeg",
  "about8.jpeg",
  "about9.jpeg",
  "about10.jpeg",
  "about11.jpeg",
  "about12.jpeg",
  "about13.jpeg",
  "about14.jpeg",
  "about15.jpeg",
  "about16.jpeg"
];
// ---------------------------------------------------------------

const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "");

function supabasePublicUrl(key) {
  // key is like "about/about1.jpeg" or "about1.jpeg"
  return `${base}/storage/v1/object/public/${BUCKET}/${key}`;
}

function preload(urls) {
  urls.forEach((url) => {
    const img = new Image();
    img.loading = "eager";
    img.decoding = "async";
    img.src = url;
  });
}

export default function PreloadAboutImages() {
  useEffect(() => {
    // Don’t compete with initial paint; also skip very slow connections
    const run = () => {
      const net = navigator.connection?.effectiveType || "";
      if (net.includes("2g")) return;

      const keys = FILES.map((name) =>
        FOLDER ? `${FOLDER}/${name}` : name
      );
      const urls = keys.map(supabasePublicUrl);
      preload(urls);
    };

    if (!base) return; // safety: missing env

    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 600);
    }

    // Prefetch again on About hover/click (helps on fast nav)
    const navLink = document.querySelector('a[href="/about"]');
    const onHover = () => run();
    navLink?.addEventListener("mouseenter", onHover);
    navLink?.addEventListener("focus", onHover);
    return () => {
      navLink?.removeEventListener("mouseenter", onHover);
      navLink?.removeEventListener("focus", onHover);
    };
  }, []);

  return null;
}