-- =====================================================================
-- Balón de Oro — esquema inicial
-- Tablas, helpers, RLS, RPCs y vistas de ranking.
-- Ejecutar en Supabase: SQL Editor → pegar → Run
-- (o `supabase db push` si usas la CLI).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Temporadas. Los pesos de puntuación viven aquí, así cada año podéis
-- cambiar la fórmula sin tocar código y el ranking se recalcula solo.
create table public.seasons (
  id               bigint generated always as identity primary key,
  year             int  not null unique,
  name             text not null,
  is_active        boolean not null default false,
  pts_win          int not null default 3,
  pts_draw         int not null default 1,
  pts_goal         int not null default 2,
  pts_assist       int not null default 1,
  pts_clean_sheet  int not null default 2,
  pts_mvp          int not null default 3,
  -- % mínimo de partidos jugados para optar al premio (0.5 = 50 %)
  min_attendance   numeric(3,2) not null default 0.50
                   check (min_attendance between 0 and 1),
  created_at       timestamptz not null default now()
);

-- Solo una temporada activa a la vez
create unique index seasons_one_active on public.seasons (is_active) where is_active;

-- Jugadores. user_id es opcional: un invitado puede tener stats sin cuenta.
-- email sirve para vincular automáticamente la cuenta al primer login.
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  nickname    text,
  avatar_url  text,
  email       text unique,
  user_id     uuid unique references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Quién puede registrar partidos y gestionar jugadores
create table public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.matches (
  id                uuid primary key default gen_random_uuid(),
  season_id         bigint not null references public.seasons (id) on delete restrict,
  played_at         date not null default current_date,
  score_a           int not null check (score_a >= 0),
  score_b           int not null check (score_b >= 0),
  notes             text,
  voting_closes_at  timestamptz not null default now() + interval '48 hours',
  created_by        uuid references auth.users (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now()
);

create index matches_season_idx on public.matches (season_id, played_at desc);

-- Los equipos cambian cada partido → el equipo va aquí, no en players
create table public.match_players (
  match_id       uuid not null references public.matches (id) on delete cascade,
  player_id      uuid not null references public.players (id) on delete restrict,
  team           char(1) not null check (team in ('A', 'B')),
  goals          int not null default 0 check (goals >= 0),
  assists        int not null default 0 check (assists >= 0),
  is_goalkeeper  boolean not null default false,
  primary key (match_id, player_id)
);

create index match_players_player_idx on public.match_players (player_id);

-- Votos de MVP (fase 2, pero el esquema ya queda listo)
create table public.mvp_votes (
  match_id         uuid not null references public.matches (id) on delete cascade,
  voter_player_id  uuid not null references public.players (id) on delete cascade,
  voted_player_id  uuid not null references public.players (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (match_id, voter_player_id),
  check (voter_player_id <> voted_player_id)
);

-- ---------------------------------------------------------------------
-- 2. HELPERS (security definer para que las policies no se llamen en bucle)
-- ---------------------------------------------------------------------

create function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create function public.current_player_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select id from public.players where user_id = (select auth.uid());
$$;

-- Miembro = jugador vinculado o admin. Un desconocido que se registre
-- con el magic link no ve nada.
create function public.is_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or public.current_player_id() is not null;
$$;

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.seasons        enable row level security;
alter table public.players        enable row level security;
alter table public.admins         enable row level security;
alter table public.matches        enable row level security;
alter table public.match_players  enable row level security;
alter table public.mvp_votes      enable row level security;

-- seasons
create policy "miembros leen temporadas" on public.seasons
  for select to authenticated using ((select public.is_member()));
create policy "admins gestionan temporadas" on public.seasons
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- players
create policy "miembros leen jugadores" on public.players
  for select to authenticated using ((select public.is_member()));
create policy "admins gestionan jugadores" on public.players
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "cada uno edita su perfil" on public.players
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- admins: cada uno solo ve si él mismo es admin
create policy "ver mi fila de admin" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- matches
create policy "miembros leen partidos" on public.matches
  for select to authenticated using ((select public.is_member()));
create policy "admins gestionan partidos" on public.matches
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- match_players
create policy "miembros leen alineaciones" on public.match_players
  for select to authenticated using ((select public.is_member()));
create policy "admins gestionan alineaciones" on public.match_players
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- mvp_votes: voto anónimo → solo ves tu propio voto
create policy "ver mi voto" on public.mvp_votes
  for select to authenticated
  using (voter_player_id = (select public.current_player_id()));

-- Solo vota quien jugó, a alguien que jugó, y antes del cierre
create policy "votar mvp" on public.mvp_votes
  for insert to authenticated
  with check (
    voter_player_id = (select public.current_player_id())
    and exists (
      select 1 from public.matches m
      where m.id = match_id and now() < m.voting_closes_at
    )
    and exists (
      select 1 from public.match_players mp
      where mp.match_id = mvp_votes.match_id and mp.player_id = voter_player_id
    )
    and exists (
      select 1 from public.match_players mp
      where mp.match_id = mvp_votes.match_id and mp.player_id = voted_player_id
    )
  );

-- ---------------------------------------------------------------------
-- 4. RPCs
-- ---------------------------------------------------------------------

-- Vincula la cuenta logueada con su fila de players por email.
-- La app la llama tras cada login.
create function public.claim_player()
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id    uuid;
  v_email text := lower((select auth.jwt()) ->> 'email');
begin
  select id into v_id from public.players where user_id = (select auth.uid());
  if v_id is not null then
    return v_id;
  end if;

  update public.players
     set user_id = (select auth.uid())
   where lower(email) = v_email and user_id is null
  returning id into v_id;

  return v_id;  -- null si su email no está dado de alta
end;
$$;

-- Registra partido + alineaciones en una sola transacción.
-- p_players: [{"player_id": "...", "team": "A", "goals": 2, "assists": 1, "is_goalkeeper": false}, ...]
-- security invoker → las policies de admin siguen aplicando.
create function public.register_match(
  p_season_id  bigint,
  p_played_at  date,
  p_score_a    int,
  p_score_b    int,
  p_players    jsonb,
  p_notes      text default null
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo los admins pueden registrar partidos' using errcode = '42501';
  end if;

  insert into public.matches (season_id, played_at, score_a, score_b, notes)
  values (p_season_id, p_played_at, p_score_a, p_score_b, p_notes)
  returning id into v_id;

  insert into public.match_players (match_id, player_id, team, goals, assists, is_goalkeeper)
  select v_id, x.player_id, x.team, coalesce(x.goals, 0), coalesce(x.assists, 0),
         coalesce(x.is_goalkeeper, false)
  from jsonb_to_recordset(p_players)
       as x(player_id uuid, team char(1), goals int, assists int, is_goalkeeper boolean);

  if not exists (select 1 from public.match_players where match_id = v_id and team = 'A')
     or not exists (select 1 from public.match_players where match_id = v_id and team = 'B') then
    raise exception 'Cada equipo necesita al menos un jugador';
  end if;

  return v_id;
end;
$$;

revoke execute on function public.claim_player()  from public, anon;
revoke execute on function public.register_match(bigint, date, int, int, jsonb, text) from public, anon;
grant  execute on function public.claim_player()  to authenticated;
grant  execute on function public.register_match(bigint, date, int, int, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. VISTAS
-- ---------------------------------------------------------------------

-- Resultados de MVP: solo recuentos, nunca quién votó a quién.
-- Es security definer a propósito (lee todos los votos); se filtra con is_member().
-- Empate en votos → todos los empatados se llevan el MVP.
create view public.mvp_results as
with counts as (
  select match_id, voted_player_id as player_id, count(*)::int as votes
  from public.mvp_votes
  group by 1, 2
)
select c.match_id,
       c.player_id,
       c.votes,
       c.votes = max(c.votes) over (partition by c.match_id) as is_winner,
       now() >= m.voting_closes_at as voting_closed
from counts c
join public.matches m on m.id = c.match_id
where public.is_member();

revoke all on public.mvp_results from anon;

-- Clasificación del Balón de Oro. Los puntos se calculan al vuelo
-- con los pesos de la temporada. El MVP solo puntúa con la votación cerrada.
create view public.season_standings with (security_invoker = true) as
with season_totals as (
  select s.id as season_id, count(m.id) as total_matches
  from public.seasons s
  left join public.matches m on m.season_id = s.id
  group by s.id
),
player_matches as (
  select m.season_id, mp.player_id, mp.goals, mp.assists, mp.is_goalkeeper,
         case when mp.team = 'A' then m.score_a else m.score_b end as goals_for,
         case when mp.team = 'A' then m.score_b else m.score_a end as goals_against
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
),
agg as (
  select season_id, player_id,
         count(*)::int                                                  as played,
         count(*) filter (where goals_for > goals_against)::int         as wins,
         count(*) filter (where goals_for = goals_against)::int         as draws,
         count(*) filter (where goals_for < goals_against)::int         as losses,
         sum(goals)::int                                                as goals,
         sum(assists)::int                                              as assists,
         count(*) filter (where is_goalkeeper and goals_against = 0)::int as clean_sheets
  from player_matches
  group by season_id, player_id
),
mvps as (
  select m.season_id, r.player_id, count(*)::int as mvps
  from public.mvp_results r
  join public.matches m on m.id = r.match_id
  where r.is_winner and r.voting_closed
  group by 1, 2
)
select a.season_id,
       a.player_id,
       p.name,
       p.nickname,
       p.avatar_url,
       a.played, a.wins, a.draws, a.losses,
       a.goals, a.assists, a.clean_sheets,
       coalesce(v.mvps, 0) as mvps,
       ( a.wins          * s.pts_win
       + a.draws         * s.pts_draw
       + a.goals         * s.pts_goal
       + a.assists       * s.pts_assist
       + a.clean_sheets  * s.pts_clean_sheet
       + coalesce(v.mvps, 0) * s.pts_mvp )::int as points,
       t.total_matches::int as season_matches,
       a.played >= ceil(t.total_matches * s.min_attendance) as eligible
from agg a
join public.players p        on p.id = a.player_id
join public.seasons s        on s.id = a.season_id
join season_totals t         on t.season_id = a.season_id
left join mvps v             on v.season_id = a.season_id and v.player_id = a.player_id;

revoke all on public.season_standings from anon;

-- ---------------------------------------------------------------------
-- 6. DATOS INICIALES
-- ---------------------------------------------------------------------

insert into public.seasons (year, name, is_active)
values (2026, 'Balón de Oro 2026', true);
