-- Weirdlings leaderboard: paste this whole file into Supabase > SQL Editor and click Run.

-- One row per player. The secret stays private (no one can read this table directly).
create table if not exists public.players (
  id uuid primary key,
  secret text not null,
  name text not null check (char_length(name) between 1 and 16),
  levels integer not null default 0 check (levels between 0 and 99999),
  updated_at timestamptz not null default now()
);
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

-- Public, read-only view of the scores (names and totals only).
create or replace view public.leaderboard as
  select id, name, levels, updated_at from public.players;
grant select on public.leaderboard to anon, authenticated;

-- The only way to write a score. A player can only update their own row
-- (matching secret), totals are capped at 99999 and can never go down.
create or replace function public.submit_score(p_id uuid, p_secret text, p_name text, p_levels integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_levels < 0 or p_levels > 99999 then
    raise exception 'levels out of range';
  end if;
  p_name := left(btrim(regexp_replace(p_name, '\s+', ' ', 'g')), 16);
  if p_name = '' then
    raise exception 'name required';
  end if;
  if char_length(p_secret) < 20 then
    raise exception 'bad secret';
  end if;
  insert into players (id, secret, name, levels)
  values (p_id, p_secret, p_name, p_levels)
  on conflict (id) do update
    set name = excluded.name,
        levels = greatest(players.levels, excluded.levels),
        updated_at = case when excluded.levels > players.levels then now() else players.updated_at end
    where players.secret = excluded.secret;
end;
$$;
revoke all on function public.submit_score(uuid, text, text, integer) from public;
grant execute on function public.submit_score(uuid, text, text, integer) to anon, authenticated;
