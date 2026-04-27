#!/usr/bin/env node
/**
 * Compare row counts in Supabase `bgs` schema vs local migration-config expectations.
 * Extend with sheet API queries if you automate Google side.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  Accept: "application/json",
  "Accept-Profile": "bgs",
};

async function count(table, filter = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id&${filter}`.replace(/\?&/, "?");
  const res = await fetch(url, { headers: { ...headers, Prefer: "count=exact" } });
  const range = res.headers.get("content-range");
  const m = range && range.match(/\/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

async function snapshotRow() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/league_snapshot?id=eq.1&select=cells`, { headers });
  const j = await res.json();
  const cells = j[0]?.cells;
  return Array.isArray(cells) ? cells.length : 0;
}

const tables = ["scores", "fixtures", "handicap_rows", "course_defs", "config_kv"];
for (const t of tables) {
  const c = await count(t);
  console.log(`${t}: ${c}`);
}
console.log(`league_snapshot cells (rows in grid): ${await snapshotRow()}`);
