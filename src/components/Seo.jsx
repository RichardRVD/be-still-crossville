// src/components/Seo.jsx
import { useEffect } from "react";

function setMeta(name, content, attr = "name") {
  if (!content) return;
  let el = document.head.querySelector(`[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function Seo({
  title,
  description,
  url,
  image,
}) {
  useEffect(() => {
    if (title) document.title = title;

    setMeta("description", description);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    if (url)   setMeta("og:url", url, "property");
    if (image) setMeta("og:image", image, "property");
    setMeta("og:type", "website", "property");
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) setMeta("twitter:image", image);
  }, [title, description, url, image]);

  return null;
}