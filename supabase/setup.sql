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

-- Read the leaderboard through normal permissions (fixes the "security definer view" advisor).
alter view public.leaderboard set (security_invoker = on);
grant select (id, name, levels, updated_at) on public.players to anon, authenticated;
create policy "Anyone can read leaderboard rows" on public.players
  for select to anon, authenticated using (true);

-- ===== All-time record per level =====
create table if not exists public.level_records (
  level integer primary key check (level between 1 and 99999),
  ms integer not null check (ms between 1500 and 86400000),
  name text not null check (char_length(name) between 1 and 16),
  player_id uuid not null,
  set_at timestamptz not null default now()
);
alter table public.level_records enable row level security;
revoke all on public.level_records from anon, authenticated;
grant select (level, ms, name, player_id, set_at) on public.level_records to anon, authenticated;
create policy "Anyone can read level records" on public.level_records
  for select to anon, authenticated using (true);

create or replace function public.submit_time(p_id uuid, p_secret text, p_name text, p_level integer, p_ms integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_name text; v_secret text; v_count integer;
begin
  if p_level < 1 or p_level > 99999 then raise exception 'level out of range'; end if;
  if p_ms < 1500 or p_ms > 86400000 then raise exception 'time out of range'; end if;
  if char_length(coalesce(p_secret, '')) < 20 then raise exception 'bad secret'; end if;
  select name, secret into v_name, v_secret from players where id = p_id;
  if found and v_secret <> p_secret then raise exception 'not allowed'; end if;
  if v_name is null then
    v_name := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 16);
    if v_name = '' then v_name := 'Anonymous'; end if;
  end if;
  insert into level_records (level, ms, name, player_id) values (p_level, p_ms, v_name, p_id)
  on conflict (level) do update
    set ms = excluded.ms, name = excluded.name, player_id = excluded.player_id, set_at = now()
    where excluded.ms < level_records.ms;
  get diagnostics v_count = row_count;
  return v_count > 0;
end; $$;
revoke all on function public.submit_time(uuid, text, text, integer, integer) from public;
grant execute on function public.submit_time(uuid, text, text, integer, integer) to anon, authenticated;

-- ===== Records belong to boards (1-200), not level numbers =====
-- Every rotated/recolored replay after level 200 shares its board's record.
alter table public.level_records rename column level to board;
alter table public.level_records drop constraint if exists level_records_level_check;
alter table public.level_records add constraint level_records_board_check check (board between 1 and 200);
alter table public.level_records rename to board_records;
alter policy "Anyone can read level records" on public.board_records rename to "Anyone can read board records";
grant select (board, ms, name, player_id, set_at) on public.board_records to anon, authenticated;
drop function if exists public.submit_time(uuid, text, text, integer, integer);
create function public.submit_time(p_id uuid, p_secret text, p_name text, p_board integer, p_ms integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_name text; v_secret text; v_count integer;
begin
  if p_board < 1 or p_board > 200 then raise exception 'board out of range'; end if;
  if p_ms < 1500 or p_ms > 86400000 then raise exception 'time out of range'; end if;
  if char_length(coalesce(p_secret, '')) < 20 then raise exception 'bad secret'; end if;
  select name, secret into v_name, v_secret from players where id = p_id;
  if found and v_secret <> p_secret then raise exception 'not allowed'; end if;
  if v_name is null then
    v_name := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 16);
    if v_name = '' then v_name := 'Anonymous'; end if;
  end if;
  insert into board_records (board, ms, name, player_id) values (p_board, p_ms, v_name, p_id)
  on conflict (board) do update
    set ms = excluded.ms, name = excluded.name, player_id = excluded.player_id, set_at = now()
    where excluded.ms < board_records.ms;
  get diagnostics v_count = row_count;
  return v_count > 0;
end; $$;
revoke all on function public.submit_time(uuid, text, text, integer, integer) from public;
grant execute on function public.submit_time(uuid, text, text, integer, integer) to anon, authenticated;
