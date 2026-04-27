#!/usr/bin/env node
/**
 * One-shot import from published Google Sheet CSVs into Supabase schema `bgs`.
 *
 * Env (see .env.example):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_SCHEMA (optional, default: bgs)
 *   MIGRATION_CONFIG path to JSON (optional; defaults ./scripts/migration-config.json)
 *   LEGACY_API_URL (optional; used as fallback score source)
 *   IMPORT_BATCH_SIZE (optional; default: 100)
 *   IMPORT_TRUNCATE_RPC (optional; default: bgs_truncate_for_sheet_import)
 *
 * Usage:
 *   node scripts/migrate-sheets-to-supabase.mjs --dry-run
 *   node scripts/migrate-sheets-to-supabase.mjs --truncate-first
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA || "bgs";
const LEGACY_API_URL = process.env.LEGACY_API_URL?.replace(/\/$/, "");
const BATCH_SIZE = Math.max(1, parseInt(process.env.IMPORT_BATCH_SIZE || "100", 10) || 100);
const TRUNCATE_RPC = process.env.IMPORT_TRUNCATE_RPC || "bgs_truncate_for_sheet_import";
const DRY_RUN = process.argv.includes("--dry-run");
const TRUNCATE_FIRST = process.argv.includes("--truncate-first");
const CONFIG_PATH = process.env.MIGRATION_CONFIG || path.join(__dirname, "migration-config.json");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sbHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  "Accept-Profile": SUPABASE_SCHEMA,
  "Content-Profile": SUPABASE_SCHEMA,
  Prefer: "resolution=merge-duplicates,return=minimal",
};

const reportDir = path.join(__dirname, "migration-reports");
await fs.mkdir(reportDir, { recursive: true });

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    if (e && e.code !== "ENOENT") {
      throw new Error(`Invalid migration config JSON at ${CONFIG_PATH}: ${e.message}`);
    }
    return {};
  }
}

async function fetchText(url) {
  if (!url) return null;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch ${url}: ${res.status}`);
  return res.text();
}

async function readLocal(filePath) {
  if (!filePath) return null;
  const p = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  return fs.readFile(p, "utf8");
}

async function sbTruncateImportTables() {
  if (DRY_RUN) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${TRUNCATE_RPC}`, {
    method: "POST",
    headers: sbHeaders,
    body: "{}",
  });
  if (!res.ok) throw new Error(`RPC ${TRUNCATE_RPC}: ${res.status} ${await res.text()}`);
}

async function sbInsert(table, rows) {
  if (!rows.length) return;
  if (DRY_RUN) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`INSERT ${table}: ${res.status} ${await res.text()}`);
}

async function sbUpsert(table, rows, onConflict) {
  if (!rows.length) return;
  if (DRY_RUN) return;
  const q = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : "";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${q}`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`UPSERT ${table}: ${res.status} ${await res.text()}`);
}

function parseCsv(text, options = {}) {
  return Papa.parse(text, {
    header: options.header ?? true,
    skipEmptyLines: options.skipEmptyLines ?? true,
    delimiter: options.delimiter,
  }).data;
}

async function fetchLegacyScores(legacyApiUrl) {
  const u = new URL(legacyApiUrl);
  u.searchParams.set("limit", "5000");
  const res = await fetch(u.toString(), { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`LEGACY_API_URL loadScores failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (!json?.success) {
    throw new Error(`LEGACY_API_URL returned error: ${json?.error || "unknown"}`);
  }
  return Array.isArray(json.scores) ? json.scores : [];
}

function toInt(v, d = 0) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : d;
}

function pad18(arr) {
  const a = Array.isArray(arr) ? arr.map((x) => toInt(x, 0)) : [];
  const out = [];
  for (let i = 0; i < 18; i++) out.push(a[i] ?? 0);
  return out;
}

/** Parse config/courses tab: Key / Value rows + Course rows → config_kv + course_defs */
function splitConfigAndCourses(rows) {
  const configKv = [];
  const courseDefs = [];

  for (const row of rows) {
    const key = (row.Key || row.key || "").toString().trim();
    const val = (row.Value || row.value || "").toString();
    if (!key) continue;

    if (key.toLowerCase() === "course") {
      const rowKeys = Object.keys(row);
      const keyIdx = rowKeys.findIndex((k) => k.toLowerCase() === "key");
      let valueColumn = "";
      if (keyIdx >= 0 && keyIdx < rowKeys.length - 1) {
        const parts = [];
        for (let i = keyIdx + 1; i < rowKeys.length; i++) {
          const v = row[rowKeys[i]];
          if (v !== undefined && v !== null && v !== "") parts.push(String(v));
        }
        valueColumn = parts.join(",");
      } else {
        valueColumn = val;
      }
      const csvData = valueColumn.split(",");
      if (csvData.length < 37) continue;
      const courseName = csvData[0].trim();
      const pars = [];
      for (let i = 1; i <= 18; i++) pars.push(toInt(csvData[i], 0));
      const stroke_indexes = [];
      for (let i = 19; i <= 36; i++) stroke_indexes.push(toInt(csvData[i], 0));
      courseDefs.push({ course_name: courseName, pars, stroke_indexes });
    } else {
      configKv.push({ key, value: val });
    }
  }
  return { configKv, courseDefs };
}

/** Scores sheet: header row with Player Name, Course, ... */
function parseScoresCsv(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const out = [];
  for (const r of parsed.data) {
    const playerName = (r["Player Name"] || r["player name"] || "").toString().trim();
    const course = (r.Course || r.course || "").toString().trim();
    if (!playerName || !course) continue;
    const holes = [];
    const hole_points = [];
    for (let i = 1; i <= 18; i++) {
      holes.push(toInt(r[`Hole${i}`] ?? r[`hole${i}`], 0));
      hole_points.push(toInt(r[`Points${i}`] ?? r[`points${i}`], 0));
    }
    const played_on = (r.Date || r.date || "").toString().trim().slice(0, 10);
    out.push({
      player_name: playerName,
      course,
      played_on: played_on || "1970-01-01",
      handicap: toInt(r.Handicap ?? r.handicap, 0),
      holes: pad18(holes),
      hole_points: pad18(hole_points),
      total_score: toInt(r["Total Score"] ?? r.total_score, 0),
      total_points: toInt(r["Total Points"] ?? r.total_points, 0),
      out_score: toInt(r["Out Score"] ?? r.out_score, 0),
      out_points: toInt(r["Out Points"] ?? r.out_points, 0),
      in_score: toInt(r["In Score"] ?? r.in_score, 0),
      in_points: toInt(r["In Points"] ?? r.in_points, 0),
      back6_score: toInt(r["Back 6 Score"] ?? r.back6_score, 0),
      back6_points: toInt(r["Back 6 Points"] ?? r.back6_points, 0),
      back3_score: toInt(r["Back 3 Score"] ?? r.back3_score, 0),
      back3_points: toInt(r["Back 3 Points"] ?? r.back3_points, 0),
      score_timestamp: (r.Timestamp || r.timestamp || new Date().toISOString()).toString(),
    });
  }
  return out;
}

function parseLegacyScoreObjects(scores) {
  return scores
    .map((sc) => ({
      player_name: String(sc.playerName || "").trim(),
      course: String(sc.course || "").trim(),
      played_on: String(sc.date || "").trim().slice(0, 10) || "1970-01-01",
      handicap: toInt(sc.handicap, 0),
      holes: pad18(Array.isArray(sc.holes) ? sc.holes : []),
      hole_points: pad18(Array.isArray(sc.holePoints) ? sc.holePoints : []),
      total_score: toInt(sc.totalScore, 0),
      total_points: toInt(sc.totalPoints, 0),
      out_score: toInt(sc.outScore, 0),
      out_points: toInt(sc.outPoints, 0),
      in_score: toInt(sc.inScore, 0),
      in_points: toInt(sc.inPoints, 0),
      back6_score: toInt(sc.back6Score, 0),
      back6_points: toInt(sc.back6Points, 0),
      back3_score: toInt(sc.back3Score, 0),
      back3_points: toInt(sc.back3Points, 0),
      score_timestamp: String(sc.timestamp || new Date().toISOString()),
    }))
    .filter((r) => r.player_name && r.course);
}

const cfg = await loadConfig();
const report = {
  dryRun: DRY_RUN,
  startedAt: new Date().toISOString(),
  schema: SUPABASE_SCHEMA,
  configPath: CONFIG_PATH,
  batchSize: BATCH_SIZE,
  counts: {},
  warnings: [],
  errors: [],
};

try {
  console.log(`Starting migration (schema=${SUPABASE_SCHEMA}, dryRun=${DRY_RUN}, truncateFirst=${TRUNCATE_FIRST})`);

  if (TRUNCATE_FIRST) {
    await sbTruncateImportTables();
  }

  if (cfg.configCoursesCsvUrl) {
    const text = await fetchText(cfg.configCoursesCsvUrl);
    const rows = parseCsv(text, { header: true, delimiter: "," });
    const { configKv, courseDefs } = splitConfigAndCourses(rows);
    await sbUpsert("config_kv", configKv, "key");
    await sbUpsert("course_defs", courseDefs, "course_name");
    report.counts.configKv = configKv.length;
    report.counts.courseDefs = courseDefs.length;
  }

  if (cfg.fixturesCsvUrl) {
    const text = await fetchText(cfg.fixturesCsvUrl);
    const rows = parseCsv(text, { header: true });
    if (!TRUNCATE_FIRST) console.warn("fixtures: use --truncate-first to avoid duplicate rows.");
    const fixtures = rows
      .filter((r) => r && Object.keys(r).length)
      .map((row, i) => ({ sort_order: i, sheet_row: row }));
    await sbInsert("fixtures", fixtures);
    report.counts.fixtures = fixtures.length;
  } else {
    report.warnings.push("fixturesCsvUrl not set; skipping fixtures import.");
  }

  if (cfg.handicapsCsvUrl) {
    const text = await fetchText(cfg.handicapsCsvUrl);
    const rows = parseCsv(text, { header: true });
    if (!TRUNCATE_FIRST) console.warn("handicaps: use --truncate-first to avoid duplicate rows.");
    const handicaps = rows
      .map((r) => ({
        player_name: (r["Player Name"] || "").toString().trim(),
        handicap: (r.Handicap || "").toString().trim(),
        handicap_date: (r["Handicap Date"] || "").toString().trim().slice(0, 10) || null,
      }))
      .filter((r) => r.player_name);
    await sbInsert("handicap_rows", handicaps);
    report.counts.handicaps = handicaps.length;
  } else {
    report.warnings.push("handicapsCsvUrl not set; skipping handicaps import.");
  }

  if (cfg.leaguesCsvUrl) {
    const text = await fetchText(cfg.leaguesCsvUrl);
    const grid = Papa.parse(text, { header: false, skipEmptyLines: false }).data;
    await sbUpsert("league_snapshot", [{ id: 1, cells: grid }], "id");
    report.counts.leagueRows = grid.length;
  } else {
    report.warnings.push("leaguesCsvUrl not set; skipping leagues import.");
  }

  if (cfg.editorNotesCsvUrl) {
    const text = await fetchText(cfg.editorNotesCsvUrl);
    const rows = Papa.parse(text, { header: false, skipEmptyLines: false, delimiter: "," }).data;
    await sbUpsert("editor_notes", [{ id: 1, rows }], "id");
    report.counts.editorNoteRows = rows.length;
  } else {
    report.warnings.push("editorNotesCsvUrl not set; skipping editor notes import.");
  }

  let scoreRows = [];
  if (cfg.scoresCsvPath || cfg.scoresCsvUrl) {
    const text = cfg.scoresCsvUrl ? await fetchText(cfg.scoresCsvUrl) : await readLocal(cfg.scoresCsvPath);
    if (text) scoreRows = parseScoresCsv(text);
  } else if (cfg.legacyApiUrl || LEGACY_API_URL) {
    const source = cfg.legacyApiUrl || LEGACY_API_URL;
    const legacyScores = await fetchLegacyScores(source);
    scoreRows = parseLegacyScoreObjects(legacyScores);
  } else {
    report.warnings.push("No score source configured (scoresCsvPath/scoresCsvUrl/legacyApiUrl).");
  }

  if (scoreRows.length) {
    if (!TRUNCATE_FIRST) console.warn("scores: use --truncate-first or you will append duplicate scores.");
    for (let i = 0; i < scoreRows.length; i += BATCH_SIZE) {
      const chunk = scoreRows.slice(i, i + BATCH_SIZE);
      await sbInsert("scores", chunk);
    }
    report.counts.scores = scoreRows.length;
  }

  report.finishedAt = new Date().toISOString();
  const reportPath = path.join(reportDir, `migration-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log("Migration report:", reportPath);
  console.log(JSON.stringify(report.counts, null, 2));
} catch (e) {
  report.error = e instanceof Error ? e.message : String(e);
  await fs.writeFile(path.join(reportDir, `migration-error-${Date.now()}.json`), JSON.stringify(report, null, 2), "utf8");
  console.error(e);
  process.exit(1);
}
