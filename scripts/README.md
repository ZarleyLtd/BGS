# Scripts

## generate-gallery-manifest.ps1

Generates `assets/data/gallery-manifest.json` from the convention-based gallery structure.

**Convention:** Albums = direct subfolders of `assets/images/Gallery/`:

- **Year folders:** `2016`, `2017`, … (one album per year)
- **General:** `General` (photos with no identifiable year)

**When to run:** After adding or moving photos in `assets/images/Gallery/`.  
**How to run:** From project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\generate-gallery-manifest.ps1
```

**Output:** `assets/data/gallery-manifest.json` (used by the gallery page).

## archive-gallery-uploads.mjs

Moves or deletes photos from the live **Latest Uploads** holding album (Supabase).

Requires `scripts/.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. From the project root:

```powershell
cd scripts
npm install
cd ..
node scripts/archive-gallery-uploads.mjs --list
node scripts/archive-gallery-uploads.mjs --album 2026
node scripts/archive-gallery-uploads.mjs --delete --yes
```

- `--list` — pending Latest Uploads
- `--album 2026` (or `General`) — download all pending files into `assets/images/Gallery/{album}`, then drop them from Latest
- `--delete --yes` — remove pending junk from Storage and the table (never copied into a year album)

After `--album`, regenerate the manifest (above), then commit the new images and `gallery-manifest.json`.
