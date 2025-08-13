import { supabase } from "./supabase";

const projectBase = import.meta.env.VITE_SUPABASE_URL;
const OBJECT_BASE  = `${projectBase}/storage/v1/object/public`;

// Encode each path segment but keep slashes
const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

function buildImageVariants(bucket, path) {
  const p = encodePath(path);
  const original = `${OBJECT_BASE}/${bucket}/${p}`;
  return { thumb: original, thumb2x: original, full: original, original };
}

/** List gallery image variants in `media/about` */
export async function listAboutGallery() {
  const bucket = "media";
  let files = [];

  try {
    const { data, error } = await supabase
      .storage.from(bucket)
      .list("about", { limit: 200, sortBy: { column: "name", order: "asc" } });

    if (!error && Array.isArray(data) && data.length) {
      files = data
        .filter(f => /\.(jpe?g|png|webp)$/i.test(f.name))
        .map(f => `about/${f.name}`);
    }
  } catch {/* ignore; fallback below */}

  if (!files.length) {
    const exts = ["jpeg", "jpg", "png", "webp"];
    const candidates = [];
    for (let i = 1; i <= 20; i++) for (const ext of exts) candidates.push(`about/about${i}.${ext}`);

    const ok = [];
    await Promise.all(candidates.map(async (key) => {
      const url = supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
      try { const r = await fetch(url, { method: "HEAD" }); if (r.ok) ok.push(key); } catch {}
    }));

    files = ok.sort((a, b) => (parseInt(a.match(/about(\d+)/i)?.[1]||9999,10) - parseInt(b.match(/about(\d+)/i)?.[1]||9999,10)));
  }

  return files.map(path => buildImageVariants(bucket, path));
}

export async function getHeroImageUrl() {
  const specific = supabase.storage.from("media").getPublicUrl("hero/hero.jpeg").data.publicUrl;
  if (specific) return specific;

  const { data, error } = await supabase.storage.from("media")
    .list("hero", { limit: 100, sortBy: { column: "name", order: "asc" } });

  if (error || !data?.length) return null;
  const firstImg = data.find(f => /\.(jpe?g|png|webp)$/i.test(f.name));
  return firstImg ? supabase.storage.from("media").getPublicUrl(`hero/${firstImg.name}`).data.publicUrl : null;
}