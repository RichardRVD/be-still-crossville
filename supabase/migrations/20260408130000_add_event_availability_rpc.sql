create or replace function public.get_event_availability(event_ids uuid[] default null)
returns table (
  event_id uuid,
  reserved_spots integer,
  spots_left integer,
  is_sold_out boolean
)
language sql
security definer
set search_path = public
as $$
  select
    e.id as event_id,
    coalesce(sum(
      case
        when b.payment_status in ('pending', 'processing', 'paid') then coalesce(b.party_size, 0)
        else 0
      end
    ), 0)::integer as reserved_spots,
    case
      when e.capacity is null then null
      else greatest(
        e.capacity - coalesce(sum(
          case
            when b.payment_status in ('pending', 'processing', 'paid') then coalesce(b.party_size, 0)
            else 0
          end
        ), 0),
        0
      )::integer
    end as spots_left,
    case
      when e.capacity is null then false
      else coalesce(sum(
        case
          when b.payment_status in ('pending', 'processing', 'paid') then coalesce(b.party_size, 0)
          else 0
        end
      ), 0) >= e.capacity
    end as is_sold_out
  from public.events e
  left join public.bookings b on b.event_id = e.id
  where event_ids is null or e.id = any(event_ids)
  group by e.id, e.capacity
$$;

grant execute on function public.get_event_availability(uuid[]) to anon, authenticated;
