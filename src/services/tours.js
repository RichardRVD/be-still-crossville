import { supabase } from "./supabase";

export async function listPublicTours() {
  const { data, error } = await supabase
    .from("tours")
    .select("id,title,description,category,tags,sort_order,is_public,price_per_person,max_party_size,checkout_enabled")
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertTour(tour) {
  const { data, error } = await supabase
    .from("tours")
    .upsert(tour)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTour(id) {
  const { error } = await supabase.from("tours").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export const listTours = listPublicTours;
