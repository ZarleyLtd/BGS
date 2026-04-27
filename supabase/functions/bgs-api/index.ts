import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toInt(v: unknown, fallback = 0): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeName(name: string): string {
  if (!name) return "";
  return name.toLowerCase().replace(/\s+/g, "");
}

function toDateString(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return String(v || "").trim();
  return d.toISOString().slice(0, 10);
}

function normalizeDateForMatch(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().split("T")[0];
  let str = String(value).trim().replace(/\+/g, " ");
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  if (str.includes("T") && str.length > 10) return str.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str;
}

function normalizeTimestampForMatch(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function padIntArray18(arr: unknown): number[] {
  const a = Array.isArray(arr) ? arr.map((v) => toInt(v, 0)) : [];
  const out: number[] = [];
  for (let i = 0; i < 18; i++) out.push(a[i] ?? 0);
  return out;
}

function mapScoreRow(row: Record<string, unknown>) {
  const holesRaw = (row.holes as number[]) || [];
  const holes = holesRaw.map((h) => (toInt(h, 0) === 0 ? "" : toInt(h, 0)));
  const holePoints = padIntArray18(row.hole_points);
  const ts = row.score_timestamp;
  let timestamp = "";
  if (ts instanceof Date) timestamp = ts.toISOString();
  else if (ts) timestamp = String(ts);

  return {
    playerName: String(row.player_name ?? ""),
    course: String(row.course ?? ""),
    date: toDateString(row.played_on),
    handicap: toInt(row.handicap, 0),
    holes,
    holePoints,
    totalScore: toInt(row.total_score, 0),
    totalPoints: toInt(row.total_points, 0),
    outScore: toInt(row.out_score, 0),
    outPoints: toInt(row.out_points, 0),
    inScore: toInt(row.in_score, 0),
    inPoints: toInt(row.in_points, 0),
    back6Score: toInt(row.back6_score, 0),
    back6Points: toInt(row.back6_points, 0),
    back3Score: toInt(row.back3_score, 0),
    back3Points: toInt(row.back3_points, 0),
    timestamp,
  };
}

async function loadScores(
  sb: ReturnType<typeof createClient>,
  args: Record<string, unknown>,
) {
  const limit = Math.max(1, Math.min(5000, toInt(args.limit, 50)));
  const playerName = String(args.playerName || "").trim();
  const course = String(args.course || "").trim();

  let query = sb.from("scores").select("*").order("score_timestamp", { ascending: false });
  if (course) query = query.eq("course", course);
  const preLimit = playerName && !course ? Math.min(5000, Math.max(limit * 20, 200)) : limit;
  query = query.limit(preLimit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = data || [];
  if (playerName) {
    const want = normalizeName(playerName);
    rows = rows.filter((r: { player_name?: string }) => normalizeName(String(r.player_name || "")) === want);
  }
  rows = rows.slice(0, limit);
  return { success: true, scores: rows.map(mapScoreRow) };
}

async function checkExistingScore(
  sb: ReturnType<typeof createClient>,
  args: Record<string, unknown>,
) {
  const playerName = String(args.playerName || "").trim();
  const course = String(args.course || "").trim();
  if (!playerName || !course) return { success: true, exists: false };

  const { data, error } = await sb.from("scores").select("*").eq("course", course);
  if (error) throw new Error(error.message);
  const want = normalizeName(playerName);
  const row = (data || []).find((r: { player_name?: string }) =>
    normalizeName(String(r.player_name || "")) === want
  );
  if (!row) return { success: true, exists: false };
  return { success: true, exists: true, score: mapScoreRow(row as Record<string, unknown>) };
}

async function saveScore(sb: ReturnType<typeof createClient>, data: Record<string, unknown>) {
  const playerName = String(data.playerName || "").trim();
  const course = String(data.course || "").trim();
  if (!playerName || !course) throw new Error("playerName and course are required");

  const playedOn = toDateString(data.date || new Date().toISOString().slice(0, 10));
  const holes = padIntArray18(data.holes);
  const holePoints = padIntArray18(data.holePoints);

  const { data: existingRows, error: exErr } = await sb.from("scores").select("*").eq("course", course);
  if (exErr) throw new Error(exErr.message);
  const want = normalizeName(playerName);
  const existing = (existingRows || []).find((r: { player_name?: string }) =>
    normalizeName(String(r.player_name || "")) === want
  );

  const now = new Date().toISOString();
  const payload = {
    player_name: playerName,
    course,
    played_on: playedOn,
    handicap: toInt(data.handicap, 0),
    holes,
    hole_points: holePoints,
    total_score: toInt(data.totalScore, 0),
    total_points: toInt(data.totalPoints, 0),
    out_score: toInt(data.outScore, 0),
    out_points: toInt(data.outPoints, 0),
    in_score: toInt(data.inScore, 0),
    in_points: toInt(data.inPoints, 0),
    back6_score: toInt(data.back6Score, 0),
    back6_points: toInt(data.back6Points, 0),
    back3_score: toInt(data.back3Score, 0),
    back3_points: toInt(data.back3Points, 0),
    score_timestamp: existing?.score_timestamp ? String(existing.score_timestamp) : now,
    updated_at: now,
  };

  if (existing?.id) {
    const { error } = await sb.from("scores").update(payload).eq("id", existing.id as string);
    if (error) throw new Error(error.message);
    return { success: true, message: "Score updated successfully", timestamp: payload.score_timestamp };
  }
  const insertRow = { ...payload, score_timestamp: now, created_at: now };
  const { error } = await sb.from("scores").insert(insertRow);
  if (error) throw new Error(error.message);
  return { success: true, message: "Score saved successfully", timestamp: now };
}

async function deleteScore(sb: ReturnType<typeof createClient>, data: Record<string, unknown>) {
  const searchPlayerName = String(data.playerName || "").trim();
  const searchCourse = String(data.course || "").trim();
  const searchDate = normalizeDateForMatch(data.date || "");
  const searchTimestamp = normalizeTimestampForMatch(data.timestamp || "");

  const { data: rows, error } = await sb.from("scores").select("*").eq("course", searchCourse);
  if (error) throw new Error(error.message);

  const want = normalizeName(searchPlayerName);
  const row = (rows || []).find((r: { player_name?: string }) =>
    normalizeName(String(r.player_name || "")) === want
  );
  if (!row) return { success: false, error: "Score not found" };

  const rowDate = normalizeDateForMatch((row as { played_on?: string }).played_on);
  const rowTs = normalizeTimestampForMatch((row as { score_timestamp?: string }).score_timestamp);
  if (rowDate !== searchDate || rowTs !== searchTimestamp) {
    return { success: false, error: "Score not found" };
  }

  const { error: delErr } = await sb.from("scores").delete().eq("id", (row as { id: string }).id);
  if (delErr) throw new Error(delErr.message);
  return { success: true, message: "Score deleted successfully" };
}

async function getFixtures(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("fixtures").select("sheet_row").order("sort_order", { ascending: true }).order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const fixtures = (data || []).map((r: { sheet_row: Record<string, unknown> }) => r.sheet_row as Record<string, unknown>);
  return { success: true, fixtures };
}

async function getHandicaps(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("handicap_rows").select("player_name, handicap, handicap_date").order("handicap_date", { ascending: true });
  if (error) throw new Error(error.message);
  const handicaps = (data || []).map((r: { player_name: string; handicap: string; handicap_date: string }) => ({
    "Player Name": r.player_name,
    "Handicap": r.handicap,
    "Handicap Date": r.handicap_date ? toDateString(r.handicap_date) : "",
  }));
  return { success: true, handicaps };
}

async function getLeagueCells(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("league_snapshot").select("cells").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  const cells = data?.cells ?? [];
  return { success: true, data: cells };
}

async function getEditorNotesRows(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("editor_notes").select("rows").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  const rows = data?.rows ?? [];
  return { success: true, rows };
}

async function getCourseDefsObject(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("course_defs").select("course_name, pars, stroke_indexes");
  if (error) throw new Error(error.message);
  const courses: Record<string, { pars: number[]; indexes: number[] }> = {};
  for (const r of data || []) {
    const row = r as { course_name: string; pars: number[]; stroke_indexes: number[] };
    courses[row.course_name] = {
      pars: row.pars || [],
      indexes: row.stroke_indexes || [],
    };
  }
  return { success: true, courses };
}

async function getConfigKvRows(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("config_kv").select("key, value");
  if (error) throw new Error(error.message);
  const rows = (data || []).map((r: { key: string; value: string }) => ({
    Key: r.key,
    Value: r.value,
  }));
  return { success: true, rows };
}

async function dispatchGet(sb: ReturnType<typeof createClient>, action: string, params: URLSearchParams) {
  const args = Object.fromEntries(params.entries());
  if (action === "getFixtures") return await getFixtures(sb);
  if (action === "getHandicaps") return await getHandicaps(sb);
  if (action === "getLeagueCells") return await getLeagueCells(sb);
  if (action === "getEditorNotesRows") return await getEditorNotesRows(sb);
  if (action === "getCourseDefs") return await getCourseDefsObject(sb);
  if (action === "getConfigKvRows") return await getConfigKvRows(sb);
  if (action === "loadScores") return await loadScores(sb, args);
  if (action === "checkExistingScore") return await checkExistingScore(sb, args);
  return { success: false, error: `Unknown action: ${action}` };
}

async function dispatchPost(
  sb: ReturnType<typeof createClient>,
  action: string,
  body: Record<string, unknown>,
) {
  const data = (body.data as Record<string, unknown>) || body;
  if (action === "saveScore") return await saveScore(sb, data);
  if (action === "deleteScore") return await deleteScore(sb, data);
  if (action === "loadScores") return await loadScores(sb, data);
  if (action === "checkExistingScore") return await checkExistingScore(sb, data);
  return { success: false, error: `Unknown action: ${action}` };
}

async function parsePostBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const form = new URLSearchParams(text);
    const dataBlob = form.get("data");
    if (!dataBlob) return {};
    try {
      return JSON.parse(dataBlob);
    } catch {
      return {};
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Missing Supabase credentials" }, 500);
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, { db: { schema: "bgs" } });

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action") || "";
      const result = await dispatchGet(sb, action, url.searchParams);
      return jsonResponse(result);
    }
    if (req.method === "POST") {
      const body = await parsePostBody(req);
      const action = String(body.action || "");
      const result = await dispatchPost(sb, action, body);
      return jsonResponse(result);
    }
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
