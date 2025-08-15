// src/components/Seo.jsx
import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * <Seo />
 * Page-level SEO with sane defaults + social cards + JSON-LD.
 *
 * Props:
 * - title:        string (required)
 * - description:  string (required)
 * - url:          canonical URL for this page (required)
 * - image:        absolute URL for social share image (1200x630 recommended)
 * - noindex:      boolean (optional)
 * - type:         OpenGraph type (e.g., 'website', 'article') default 'website'
 * - locale:       e.g., 'en_US'
 * - siteName:     e.g., 'Be Still Crossville'
 * - twitter:      { site:'@handle', card:'summary_large_image' }
 * - schema:       JSON object or array of JSON-LD entries to embed
 */
export default function Seo({
  title,
  description,
  url,
  image,
  noindex = false,
  type = "website",
  locale = "en_US",
  siteName = "Be Still Crossville",
  twitter = { site: "@", card: "summary_large_image" },
  schema,
}) {
  const jsonLd = Array.isArray(schema) ? schema : schema ? [schema] : [];

  return (
    <Helmet>
      {/* Base */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      )}

      {/* Open Graph */}
      <meta property="og:locale" content={locale} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:alt" content={title} />}

      {/* Twitter */}
      {twitter?.card && <meta name="twitter:card" content={twitter.card} />}
      {twitter?.site && <meta name="twitter:site" content={twitter.site} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* JSON-LD */}
      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
}