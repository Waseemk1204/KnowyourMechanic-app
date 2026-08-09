-- Bug fix: a garage's rating / total_reviews were never recomputed when reviews
-- were added, edited, or deleted — getGaragePublic reads garages.rating directly,
-- but nothing kept it in sync with the reviews table, so the displayed rating was
-- stale seed data. Recompute it with a trigger on reviews. Idempotent.

create or replace function public.recompute_garage_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_garage uuid := coalesce(new.garage_id, old.garage_id);
  v_avg numeric;
  v_count integer;
begin
  select round(avg(rating)::numeric, 1), count(*)
    into v_avg, v_count
  from public.reviews
  where garage_id = v_garage;

  update public.garages
    set rating = coalesce(v_avg, 0),
        total_reviews = coalesce(v_count, 0),
        updated_at = now()
  where id = v_garage;

  return null; -- AFTER trigger; return value ignored
end;
$$;

drop trigger if exists trg_recompute_garage_rating on public.reviews;
create trigger trg_recompute_garage_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_garage_rating();

-- Backfill: sync aggregates for garages that already have reviews. Garages with
-- no reviews keep their current (seed/demo) values until their first real review,
-- at which point the trigger recomputes from actual rows.
update public.garages g
set rating = sub.avg_rating,
    total_reviews = sub.cnt,
    updated_at = now()
from (
  select garage_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int as cnt
  from public.reviews
  group by garage_id
) sub
where g.id = sub.garage_id;
