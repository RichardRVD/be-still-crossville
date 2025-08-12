import { supabase } from "./supabase";

/** List public URLs for gallery images in `media/about`.
 *  Falls back to probing numbered files if list() returns nothing.
 */
export async function listAboutGallery() {
  // 1) Try the normal list()
  try {
    const { data, error } = await supabase
      .storage
      .from("media")
      .list("about", { limit: 200, sortBy: { column: "name", order: "asc" } });

    if (!error && Array.isArray(data) && data.length) {
      const urls = data
        .filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
        .map(f => supabase.storage.from("media").getPublicUrl(`about/${f.name}`).data.publicUrl);

      if (urls.length) return urls;
    }
  } catch (_) {
    // ignore and use fallback
  }

  // 2) Fallback: probe common numbered filenames (about1..about20)
  const exts = ["jpeg", "jpg", "png", "webp"];
  const candidates = [];
  for (let i = 1; i <= 20; i++) {
    for (const ext of exts) {
      candidates.push(`about/${`about${i}.${ext}`}`);
    }
  }

  const urls = [];
  await Promise.all(
    candidates.map(async (key) => {
      const url = supabase.storage.from("media").getPublicUrl(key).data.publicUrl;
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (res.ok) urls.push(url);
      } catch {
        /* skip */
      }
    })
  );

  // natural sort by embedded number
  urls.sort((a, b) => {
    const na = a.match(/about(\d+)/i)?.[1];
    const nb = b.match(/about(\d+)/i)?.[1];
    return (parseInt(na || 9999, 10) - parseInt(nb || 9999, 10));
  });

  return urls;
}

/** Get the hero image URL. Try a known path, then list fallback. */
export async function getHeroImageUrl() {
  const specific = supabase.storage
    .from("media")
    .getPublicUrl("hero/hero.jpeg").data.publicUrl;
  if (specific) return specific;

  const { data, error } = await supabase
    .storage
    .from("media")
    .list("hero", { limit: 100, sortBy: { column: "name", order: "asc" } });

  if (error || !data || !data.length) return null;

  const firstImg = data.find(f => /\.(jpe?g|png|webp)$/i.test(f.name));
  if (!firstImg) return null;

  return supabase.storage.from("media").getPublicUrl(`hero/${firstImg.name}`).data.publicUrl;
}