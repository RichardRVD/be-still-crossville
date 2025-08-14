// src/services/events.js
import { supabase } from "./supabase";

// We keep CT handling in the UI; the DB stores UTC.
// This module only normalizes inputs and returns raw rows.

function toISO(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  // If it's already ISO-like, trust it; otherwise coerce via Date.
  return new Date(d).toISOString();
}
function dayAfter(dateLike) {
  const d = new Date(dateLike);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Minimal slugifier for tour_key
function slugify(input) {
  return (input || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "general";
}

/** Public events between optional from/to (inclusive days). */
export async function listPublicEvents({ from, to } = {}) {
  let q = supabase
    .from("events")
    .select("id,title,tour,location,start_at,end_at,capacity,is_public,description")
    .eq("is_public", true)
    .order("start_at", { ascending: true });

  // Use a half-open range [from, dayAfter(to)) to avoid off-by-one with timezones.
  if (from) q = q.gte("start_at", toISO(from));
  if (to)   q = q.lt("start_at", dayAfter(to));

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

/** Upsert an event. Accepts { start_at, end_at } as Date|string (UTC or ISO). */
export async function upsertEvent(ev) {
  const patch = { ...ev };
  if (patch.start_at) patch.start_at = toISO(patch.start_at);
  if (patch.end_at)   patch.end_at   = toISO(patch.end_at);

  // ✅ Ensure tour_key to satisfy NOT NULL constraint
  if (!patch.tour_key) {
    const basis = patch.tour || patch.title || "general";
    patch.tour_key = slugify(basis);
  }

  const { data, error } = await supabase
    .from("events")
    .upsert(patch)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* Alias used by Admin.jsx */
export const listEvents = listPublicEvents;