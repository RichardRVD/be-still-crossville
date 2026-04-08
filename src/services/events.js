// src/services/events.js
import { supabase } from "./supabase";

function toISO(d) {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}
function dayAfter(dateLike) {
  const d = new Date(dateLike);
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function slugify(input) {
  return (input || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "general";
}

export async function listPublicEvents({ from, to } = {}) {
  let q = supabase
    .from("events")
    .select("id,title,tour,tour_id,location,start_at,end_at,capacity,is_public,description,price_per_person,checkout_enabled,series_id")
    .eq("is_public", true)
    .order("start_at", { ascending: true });

  if (from) q = q.gte("start_at", toISO(from));
  if (to)   q = q.lt("start_at", dayAfter(to));

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getEventAvailability(eventIds = []) {
  const { data, error } = await supabase.rpc("get_event_availability", {
    event_ids: eventIds.length > 0 ? eventIds : null,
  });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertEvent(ev) {
  const patch = { ...ev };
  if (patch.start_at) patch.start_at = toISO(patch.start_at);
  if (patch.end_at)   patch.end_at   = toISO(patch.end_at);

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

export async function createEventsBatch(events) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const rows = events.map((ev) => {
    const patch = { ...ev };
    if (patch.start_at) patch.start_at = toISO(patch.start_at);
    if (patch.end_at) patch.end_at = toISO(patch.end_at);
    if (!patch.tour_key) {
      const basis = patch.tour || patch.title || "general";
      patch.tour_key = slugify(basis);
    }
    return patch;
  });

  const { data, error } = await supabase
    .from("events")
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateFutureSeriesEvents({ seriesId, fromStartAt, patch }) {
  const nextPatch = { ...patch };
  if (nextPatch.start_at) delete nextPatch.start_at;
  if (nextPatch.end_at) delete nextPatch.end_at;
  if (nextPatch.capacity === "") nextPatch.capacity = null;
  if (nextPatch.price_per_person === "") nextPatch.price_per_person = null;

  if (!nextPatch.tour_key) {
    const basis = nextPatch.tour || nextPatch.title || "general";
    nextPatch.tour_key = slugify(basis);
  }

  const { data, error } = await supabase
    .from("events")
    .update(nextPatch)
    .eq("series_id", seriesId)
    .gte("start_at", toISO(fromStartAt))
    .select();

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteFutureSeriesEvents({ seriesId, fromStartAt }) {
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("series_id", seriesId)
    .gte("start_at", toISO(fromStartAt))
    .select("id");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const listEvents = listPublicEvents;
