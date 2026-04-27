-- BGS (Bushwhackers) schema — isolated from other apps in the shared Supabase project.
-- After apply: Dashboard → Project Settings → API → Exposed schemas → add `bgs`.

create extension if not exists pgcrypto;

create schema if not exists bgs;

-- Scores: one row per (normalized player name, course), matching legacy Google Apps Script behavior.
create table if not exists bgs.scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  player_norm text generated always as (lower(regexp_replace(trim(player_name), E'\\s', '', 'g'))) stored,
  course text not null,
  played_on date not null,
  handicap integer not null default 0,
  holes integer[] not null,
  hole_points integer[] not null,
  total_score integer not null default 0,
  total_points integer not null default 0,
  out_score integer not null default 0,
  out_points integer not null default 0,
  in_score integer not null default 0,
  in_points integer not null default 0,
  back6_score integer not null default 0,
  back6_points integer not null default 0,
  back3_score integer not null default 0,
  back3_points integer not null default 0,
  score_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scores_holes_len check (cardinality(holes) = 18),
  constraint scores_pts_len check (cardinality(hole_points) = 18),
  constraint scores_player_course unique (player_norm, course)
);

create index if not exists idx_scores_course on bgs.scores (course);
create index if not exists idx_scores_timestamp on bgs.scores (score_timestamp desc);

-- Course definitions (pars + stroke index), migrated from Key=Course rows.
create table if not exists bgs.course_defs (
  course_name text primary key,
  pars integer[] not null,
  stroke_indexes integer[] not null,
  updated_at timestamptz not null default now(),
  constraint course_defs_pars_len check (cardinality(pars) = 18),
  constraint course_defs_idx_len check (cardinality(stroke_indexes) = 18)
);

-- Key/value config (NextOuting, Player names, etc.).
create table if not exists bgs.config_kv (
  key text primary key,
  value text not null
);

-- Fixtures / results: one JSON object per row (preserves arbitrary CSV columns).
create table if not exists bgs.fixtures (
  id bigserial primary key,
  sort_order integer not null default 0,
  sheet_row jsonb not null
);

create index if not exists idx_fixtures_sort on bgs.fixtures (sort_order, id);

-- Handicap history.
create table if not exists bgs.handicap_rows (
  id bigserial primary key,
  player_name text not null,
  handicap text not null,
  handicap_date date
);

create index if not exists idx_handicap_player on bgs.handicap_rows (player_name);

-- League grid: raw 2D array for LeagueStandings.processData (header: false).
create table if not exists bgs.league_snapshot (
  id integer primary key check (id = 1),
  cells jsonb not null default '[]'::jsonb
);

insert into bgs.league_snapshot (id, cells)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

-- Editor notes: array of CSV-like rows (first cell = paragraph text).
create table if not exists bgs.editor_notes (
  id integer primary key check (id = 1),
  rows jsonb not null default '[]'::jsonb
);

insert into bgs.editor_notes (id, rows)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

alter table bgs.scores enable row level security;
alter table bgs.course_defs enable row level security;
alter table bgs.config_kv enable row level security;
alter table bgs.fixtures enable row level security;
alter table bgs.handicap_rows enable row level security;
alter table bgs.league_snapshot enable row level security;
alter table bgs.editor_notes enable row level security;

-- PostgREST / Edge (service role) access
grant usage on schema bgs to postgres, anon, authenticated, service_role;
grant all on all tables in schema bgs to postgres, service_role;
grant all on all sequences in schema bgs to postgres, service_role;
grant select on all tables in schema bgs to anon, authenticated;

alter default privileges in schema bgs grant all on tables to postgres, service_role;
alter default privileges in schema bgs grant all on sequences to postgres, service_role;
