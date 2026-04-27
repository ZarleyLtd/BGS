# BGS Supabase cutover runbook

## Prerequisites (do in this order)

1. **Apply migrations** so schema `bgs` and tables exist: `supabase db push`, or run the SQL files under `supabase/migrations/` in the SQL editor (in filename order).
2. **Expose `bgs` to the API** (only after the schema exists): **Project Settings → API → Exposed schemas** → add **`bgs`**.
3. **Deploy Edge Function**: `supabase functions deploy bgs-api --no-verify-jwt`
4. **Function secrets**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Edge Functions → bgs-api → Secrets).

## Data import (optional)

1. Copy `scripts/migration-config.example.json` to `scripts/migration-config.json` and fill data sources (published CSVs, `scoresCsvPath`/`scoresCsvUrl`, or `legacyApiUrl` for score fallback).
2. `cd scripts && npm install`
3. Create `scripts/.env` from `.env.example` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; optional `SUPABASE_SCHEMA`, `LEGACY_API_URL`).
4. Dry run: `node migrate-sheets-to-supabase.mjs --dry-run`
5. Full refresh import: `node migrate-sheets-to-supabase.mjs --truncate-first`
6. Row counts: `node reconcile-bgs-vs-sheet.mjs`

## Frontend

1. Set [`assets/js/config/app-config.js`](../assets/js/config/app-config.js): `AppConfig.apiUrl` to  
   `https://<project-ref>.functions.supabase.co/bgs-api`
2. Deploy static site assets.

## Smoke tests

- Home: editor notes, next outing (if rows exist in `editor_notes`, `config_kv`).
- Scorecard: courses + players from API; save / load / delete score.
- Leaderboard: loads scores + course defs.

## Rollback

1. Point `AppConfig.apiUrl` back to the legacy Google Apps Script URL (if still deployed), **or** leave API blank to fall back to hardcoded scorecard courses only.
2. Redeploy frontend.

## Troubleshooting: `Remote migration versions not found in local migrations directory`

Your linked database already has entries in **`supabase_migrations.schema_migrations`** for migration **versions** that do not exist as files under **`supabase/migrations/`** in this repo (common on a **shared** Supabase project).

**Fix (recommended): align local files with remote history**

1. In **SQL Editor**, run:
   ```sql
   select version, name
   from supabase_migrations.schema_migrations
   order by version;
   ```
2. For **each** `version` that has **no** matching file `supabase/migrations/<version>_*.sql` here, add that file from the **project/repo that originally ran those migrations** (same version prefix and body). Place them in **timestamp order** next to the BGS migrations.
3. Run `supabase db push` again. Only migrations **after** the last applied version should run (e.g. the BGS `2026042612…` files).

**If you cannot recover the old SQL files:** do not guess. Options: ask whoever owns the other repo, or open a Supabase support thread about reconciling migration history. **`supabase migration repair`** can desync history from the real schema if used wrongly.

**Bypass the CLI for schema only (short term):** you can paste and run `supabase/migrations/*.sql` in the SQL Editor to create `bgs`. The CLI will **still** complain on `db push` until step 1–2 above are satisfied.

## Security notes

- The browser only receives the **public** function URL. **`SUPABASE_SERVICE_ROLE_KEY` must never** be committed or embedded in static assets.
- `verify_jwt = false` matches anonymous society-site traffic; tighten later with auth or a shared secret if needed.
