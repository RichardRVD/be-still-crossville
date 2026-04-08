alter table public.events
  add column if not exists tour_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_tour_id_fkey'
  ) then
    alter table public.events
      add constraint events_tour_id_fkey
      foreign key (tour_id) references public.tours(id) on delete set null;
  end if;
end $$;

update public.events e
set tour_id = t.id
from public.tours t
where e.tour_id is null
  and (
    lower(trim(coalesce(e.tour, ''))) = lower(trim(coalesce(t.title, '')))
    or lower(trim(coalesce(e.title, ''))) = lower(trim(coalesce(t.title, '')))
  );

create index if not exists events_tour_id_idx on public.events(tour_id);
