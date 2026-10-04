#!/usr/bin/env node
/**
 * Archive or delete BGS Gallery "Latest Uploads" holding photos.
 *
 * Env (scripts/.env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage (from project root):
 *   node scripts/archive-gallery-uploads.mjs --list
 *   node scripts/archive-gallery-uploads.mjs --album 2026
 *   node scripts/archive-gallery-uploads.mjs --delete --yes
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCHEMA = "thegolfapp";
const BUCKET = "bgs-gallery-uploads";
const GALLERY_ROOT = path.join(repoRoot, "assets", "images", "Gallery");

const args = process.argv.slice(2);
function flagValue(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] && !args[idx + 1].startsWith("--") ? args[idx + 1] : "";
}

const LIST = args.includes("--list");
const DELETE = args.includes("--delete");
const YES = args.includes("--yes");
const ALBUM = flagValue("--album");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in scripts/.env");
  process.exit(1);
}

if (!LIST && !DELETE && !ALBUM) {
  console.error("Usage:");
  console.error("  node scripts/archive-gallery-uploads.mjs --list");
  console.error("  node scripts/archive-gallery-uploads.mjs --album 2026");
  console.error("  node scripts/archive-gallery-uploads.mjs --delete --yes");
  process.exit(1);
}

if (ALBUM && !/^[A-Za-z0-9 _-]{1,40}$/.test(ALBUM)) {
  console.error("Album name must be a simple folder name (e.g. 2026 or General).");
  process.exit(1);
}

const restHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  Accept: "application/json",
  "Accept-Profile": SCHEMA,
  "Content-Type": "application/json",
  "Content-Profile": SCHEMA,
};

async function listPending() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/gallery_uploads`);
  url.searchParams.set("society_id", "eq.botanic");
  url.searchParams.set("archived_at", "is.null");
  url.searchParams.set("order", "uploaded_at.desc");
  url.searchParams.set("select", "id,storage_path,public_url,original_filename,byte_size,uploaded_at");
  const res = await fetch(url, { headers: restHeaders });
  if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function extFromPath(storagePath, fallback = ".jpg") {
  const ext = path.extname(storagePath || "");
  return ext || fallback;
}

function archiveFilename(row) {
  const stamp = String(row.uploaded_at || "").replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z").replace("T", "-").slice(0, 15);
  const idPart = String(row.id || "photo").slice(0, 8);
  return `${stamp || "photo"}-${idPart}${extFromPath(row.storage_path)}`;
}

async function downloadTo(row, destPath) {
  const url = row.public_url || `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${row.storage_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${row.id}: ${res.status}`);
  await fs.writeFile(destPath, Buffer.from(await res.arrayBuffer()));
}

async function markArchived(id, album) {
  const url = `${SUPABASE_URL}/rest/v1/gallery_uploads?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...restHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({
      archived_at: new Date().toISOString(),
      archived_to_album: album,
    }),
  });
  if (!res.ok) throw new Error(`Archive ${id}: ${res.status} ${await res.text()}`);
}

async function deleteRow(id) {
  const url = `${SUPABASE_URL}/rest/v1/gallery_uploads?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: "DELETE", headers: restHeaders });
  if (!res.ok) throw new Error(`Delete row ${id}: ${res.status} ${await res.text()}`);
}

async function deleteStorage(storagePath) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok && res.status !== 404) {
    console.warn(`Storage delete ${storagePath}: ${res.status} ${await res.text()}`);
  }
}

const rows = await listPending();

if (LIST) {
  if (!rows.length) {
    console.log("No pending Latest Uploads.");
    process.exit(0);
  }
  for (const row of rows) {
    const kb = Math.round((row.byte_size || 0) / 1024);
    console.log(`${row.id}  ${row.uploaded_at}  ${kb}KB  ${row.original_filename || row.storage_path}`);
  }
  console.log(`${rows.length} pending photo(s).`);
  process.exit(0);
}

if (!rows.length) {
  console.log("No pending Latest Uploads.");
  process.exit(0);
}

if (DELETE) {
  if (!YES) {
    console.error("Refusing to delete without --yes");
    process.exit(1);
  }
  for (const row of rows) {
    await deleteStorage(row.storage_path);
    await deleteRow(row.id);
    console.log(`Deleted ${row.id}`);
  }
  console.log(`Removed ${rows.length} photo(s) from Latest Uploads.`);
  process.exit(0);
}

const destDir = path.join(GALLERY_ROOT, ALBUM);
await fs.mkdir(destDir, { recursive: true });

for (const row of rows) {
  const dest = path.join(destDir, archiveFilename(row));
  await downloadTo(row, dest);
  await markArchived(row.id, ALBUM);
  console.log(`Archived ${row.id} -> ${path.relative(repoRoot, dest)}`);
}

console.log(`Copied ${rows.length} photo(s) into assets/images/Gallery/${ALBUM}.`);
console.log("Next: powershell -ExecutionPolicy Bypass -File scripts\\generate-gallery-manifest.ps1");
console.log("Then commit the new images + assets/data/gallery-manifest.json and deploy the static site.");
