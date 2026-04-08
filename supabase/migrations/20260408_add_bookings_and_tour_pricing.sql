alter table public.tours
  add column if not exists price_per_person numeric(10,2) not null default 0,
  add column if not exists max_party_size integer not null default 8,
  add column if not exists checkout_enabled boolean not null default true;

alter table public.events
  add column if not exists checkout_enabled boolean not null default true;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  preferred_contact text not null default 'email',
  tour_title text not null,
  event_id uuid references public.events(id) on delete set null,
  event_title text,
  requested_dates text not null,
  party_size integer not null check (party_size > 0),
  currency text not null default 'usd',
  unit_amount integer not null check (unit_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  payment_processor text not null default 'stripe',
  payment_status text not null default 'pending',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists bookings_event_id_idx on public.bookings(event_id);
create index if not exists bookings_payment_status_idx on public.bookings(payment_status);
create index if not exists bookings_customer_email_idx on public.bookings(customer_email);
create unique index if not exists bookings_stripe_checkout_session_id_idx
  on public.bookings(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "service role manages bookings" on public.bookings;
create policy "service role manages bookings"
on public.bookings
for all
to service_role
using (true)
with check (true);
