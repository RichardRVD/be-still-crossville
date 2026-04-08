alter table public.events
  add column if not exists price_per_person numeric(10,2);
