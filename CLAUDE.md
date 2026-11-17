# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static website for the BGS golf society (Botanic): outings, leaderboard, handicaps, scorecards and a photo gallery. Plain HTML + vanilla JS, no build step. Data comes from the Supabase Edge Function `bgs-api`, which reads and writes the **`thegolfapp`** schema for society **`botanic`**, the same tables as theGolfApp (`../theGolfApp`).

## Dev server / port

There's no dev server script. Serve the folder statically from the project root:

```powershell
npx serve .        # http://localhost:3000
```

(`python -m http.server 8000` also works, on http://localhost:8000.) The frontend calls the deployed `bgs-api` URL in `assets/js/config/app-config.js`, so local pages hit live data.

## Commands

```powershell
supabase functions deploy bgs-api --no-verify-jwt                    # deploy the Edge Function
powershell -ExecutionPolicy Bypass -File scripts\generate-gallery-manifest.ps1   # rebuild assets/data/gallery-manifest.json
cd scripts; npm install; cd ..                                       # once, for the node scripts
node scripts/archive-gallery-uploads.mjs --list                      # needs scripts/.env (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

There are no automated tests.

## Architecture

- **HTML components:** the shared header, nav, footer and hero live in `components/*.html` and are **pasted into every page** (there's no include system). When asked to change the header or footer, update `components/` first, then copy the change into every `.html` file.
- **JS layout:** `assets/js/config/` (`app-config.js` holds `AppConfig.apiUrl`; also outings and gallery config), `utils/` (`bgs-data.js` GET helpers, `api-client.js` POST/GET for scores, formatters, `handicap-rules.js`, shared UI such as `brief-message.js` and `confirm-dialog.js`), `components/` (reusable UI such as league standings, knockout renderer and gallery upload), `pages/` (one module per page), and `main.js` (router).
- **Script load order in each HTML page:** config → utils → components → pages → main.js.
- **No duplication:** put common code in `utils/` or `components/`, never copy it between pages. When changing behaviour, update the shared utils or components first, then the page modules.
- **Backend:** `supabase/functions/bgs-api`. The API contract is in `docs/SUPABASE_API_CONTRACT.md`. Responses are `{ success, ... }` or `{ success: false, error }`. POST accepts form-encoded `data=<json>` (legacy Apps Script compatible) or JSON `{action, data}`. `saveScore` needs an existing outing for that date and course.
- **Legacy:** `backend/code.gs` (Google Apps Script plus Sheets) and `scripts/migrate-sheets-to-supabase.mjs` (the old `bgs` schema) are deprecated. Don't use them unless asked.
- `rnrREADME.md` belongs to another project and is kept for reference. **Do not change it.**

## Gallery holding photos

"Latest Uploads" is a live Supabase holding album (table `thegolfapp.gallery_uploads`, bucket `bgs-gallery-uploads`). Year albums are files under `assets/images/Gallery/{year}` (or `General`). The website must never write holding photos into those folders. To move holding photos into an album:

```powershell
node scripts/archive-gallery-uploads.mjs --list
node scripts/archive-gallery-uploads.mjs --album 2026        # or --album General
powershell -ExecutionPolicy Bypass -File scripts\generate-gallery-manifest.ps1
```

Then commit the new images together with `assets/data/gallery-manifest.json`. To delete junk instead of archiving it, run `node scripts/archive-gallery-uploads.mjs --delete --yes`. More detail is in `scripts/README.md`.

## Rules

- Use relative paths only (`assets/css/style.css`, not `/assets/...`). Never add `http://localhost` or drive letters such as `C:/Users/` to the site.
- The Supabase project `yzyipxvlsoxfphwobfkb` ("Apps") is shared with other CursorSites apps.

## Edison tickets

GitHub issues labelled `edison` come from Edison, the ticket tracker. When asked to implement one:

1. Read the issue body, comments and linked screenshots.
2. If a PR for the issue is already open, continue on that branch rather than opening a new PR, and act on every note left since the last round, oldest first.
3. Otherwise, work on a new branch and open a PR that references the issue. Don't merge it.
4. Comment a short summary of what changed and how to review it.
5. When the round is on the PR, swap the `stage:working` label for `stage:review`, even when no code change was needed.
6. If you're blocked, comment the question and swap `stage:working` for `stage:needs-input`.
