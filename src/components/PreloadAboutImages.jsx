// src/components/PreloadAboutImages.jsx
import { useEffect } from "react";
import { listAboutGallery } from "../services/storage"; // already used by About page

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
    let cancelled = false;

    const run = async () => {
      const net = navigator.connection?.effectiveType || "";
      if (net.includes("2g")) return;

      try {
        const items = await listAboutGallery();
        if (cancelled) return;

        const urls = items.map((i) => i.full || i.thumb);
        preload(urls);
      } catch (e) {
        console.warn("PreloadAboutImages failed:", e);
      }
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 600);
    }

    const aboutLink = document.querySelector('a[href="/about"]');
    const onHover = () => run();
    aboutLink?.addEventListener("mouseenter", onHover);
    aboutLink?.addEventListener("focus", onHover);

    return () => {
      cancelled = true;
      aboutLink?.removeEventListener("mouseenter", onHover);
      aboutLink?.removeEventListener("focus", onHover);
    };
  }, []);

  return null;
}