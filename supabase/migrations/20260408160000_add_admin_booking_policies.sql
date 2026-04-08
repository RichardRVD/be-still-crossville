drop policy if exists "authenticated users can read bookings" on public.bookings;
create policy "authenticated users can read bookings"
on public.bookings
for select
to authenticated
using (true);

drop policy if exists "authenticated users can update bookings" on public.bookings;
create policy "authenticated users can update bookings"
on public.bookings
for update
to authenticated
using (true)
with check (true);
