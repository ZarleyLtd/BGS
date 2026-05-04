import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/** BGS public site always uses this society in the shared `thegolfapp` schema. */
const SOCIETY_ID = "botanic";

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

function normalizeCourseKey(name: string): string {
  return String(name || "").toLowerCase().replace(/\s+/g, "");
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

function generatePlayerId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

/** Parse `courses.par_indx`: 18 pars + 18 stroke indexes (comma-separated). Optional leading course name token if length >= 37. */
function parseParIndx(parIndx: string): { pars: number[]; indexes: number[] } {
  const s = String(parIndx || "").trim();
  const parts = s.split(",").map((p) => p.trim());
  let offset = 0;
  if (parts.length >= 37) {
    offset = 1;
  }
  const pars: number[] = [];
  const indexes: number[] = [];
  for (let i = 0; i < 18; i++) {
    pars.push(toInt(parts[offset + i], 0));
  }
  if (parts.length - offset >= 36) {
    for (let i = 0; i < 18; i++) {
      indexes.push(toInt(parts[offset + 18 + i], 0));
    }
  } else {
    for (let i = 0; i < 18; i++) indexes.push(0);
  }
  return { pars, indexes };
}

type ScoreJoinRow = {
  outing_id: string;
  player_id: string;
  handicap?: number;
  holes?: number[];
  hole_points?: number[];
  total_score?: number;
  total_points?: number;
  out_score?: number;
  out_points?: number;
  in_score?: number;
  in_points?: number;
  back6_score?: number;
  back6_points?: number;
  back3_score?: number;
  back3_points?: number;
  score_timestamp?: string;
  outings?: { course_name?: string; outing_date?: string } | null;
  players?: { player_name?: string } | null;
};

function mapScoreRow(row: ScoreJoinRow): Record<string, unknown> {
  const holesRaw = (row.holes as number[]) || [];
  const holes = holesRaw.map((h) => (toInt(h, 0) === 0 ? "" : toInt(h, 0)));
  const holePoints = padIntArray18(row.hole_points);
  const ts = row.score_timestamp;
  let timestamp = "";
  if (ts instanceof Date) timestamp = ts.toISOString();
  else if (ts) timestamp = String(ts);

  const outingDate = row.outings?.outing_date;

  return {
    playerId: String(row.player_id ?? ""),
    playerName: String(row.players?.player_name ?? row.player_id ?? ""),
    course: String(row.outings?.course_name ?? ""),
    date: outingDate ? toDateString(outingDate) : "",
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

function courseMatches(a: string, b: string): boolean {
  return normalizeCourseKey(a) === normalizeCourseKey(b);
}

async function fetchScoresJoined(
  sb: ReturnType<typeof createClient>,
  limit: number,
): Promise<ScoreJoinRow[]> {
  const { data, error } = await sb
    .from("scores")
    .select(
      "outing_id, player_id, handicap, holes, hole_points, total_score, total_points, out_score, out_points, in_score, in_points, back6_score, back6_points, back3_score, back3_points, score_timestamp, outings!scores_outing_fk(course_name, outing_date), players!scores_player_fk(player_name)",
    )
    .eq("society_id", SOCIETY_ID)
    .order("score_timestamp", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as ScoreJoinRow[];
}

async function loadScores(
  sb: ReturnType<typeof createClient>,
  args: Record<string, unknown>,
) {
  const limit = Math.max(1, Math.min(5000, toInt(args.limit, 50)));
  const playerName = String(args.playerName || "").trim();
  const course = String(args.course || "").trim();

  const preLimit = playerName && !course ? Math.min(5000, Math.max(limit * 20, 200)) : limit;
  let rows = await fetchScoresJoined(sb, preLimit);

  if (course) {
    rows = rows.filter((r) => courseMatches(String(r.outings?.course_name || ""), course));
  }
  if (playerName) {
    const want = normalizeName(playerName);
    rows = rows.filter((r) => normalizeName(String(r.players?.player_name || "")) === want);
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

  const rows = await fetchScoresJoined(sb, 500);
  const want = normalizeName(playerName);
  const matching = rows.filter(
    (r) =>
      courseMatches(String(r.outings?.course_name || ""), course) &&
      normalizeName(String(r.players?.player_name || "")) === want,
  );
  const row = matching[0];
  if (!row) return { success: true, exists: false };
  return { success: true, exists: true, score: mapScoreRow(row) };
}

async function resolveOrCreatePlayerId(
  sb: ReturnType<typeof createClient>,
  playerName: string,
): Promise<string> {
  const want = normalizeName(playerName);
  const { data: players, error } = await sb.from("players").select("player_id, player_name").eq(
    "society_id",
    SOCIETY_ID,
  );
  if (error) throw new Error(error.message);
  const found = (players || []).find((p: { player_name: string }) =>
    normalizeName(String(p.player_name || "")) === want
  );
  if (found) return String(found.player_id);

  const playerId = generatePlayerId();
  const now = new Date().toISOString();
  const { error: insErr } = await sb.from("players").insert({
    society_id: SOCIETY_ID,
    player_id: playerId,
    player_name: playerName,
    handicap: 0,
    created_at: now,
    updated_at: now,
  });
  if (insErr) throw new Error(insErr.message);
  return playerId;
}

async function resolveOutingIdForDateAndCourse(
  sb: ReturnType<typeof createClient>,
  playedOn: string,
  course: string,
): Promise<string | null> {
  const { data: outings, error } = await sb
    .from("outings")
    .select("outing_id, course_name, outing_date, outing_time")
    .eq("society_id", SOCIETY_ID)
    .eq("outing_date", playedOn)
    .order("outing_time", { ascending: true })
    .order("outing_id", { ascending: true });
  if (error) throw new Error(error.message);
  const match = (outings || []).find((o: { course_name: string }) =>
    courseMatches(String(o.course_name || ""), course)
  );
  return match ? String(match.outing_id) : null;
}

class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}

async function saveScore(sb: ReturnType<typeof createClient>, data: Record<string, unknown>) {
  const playerName = String(data.playerName || "").trim();
  const course = String(data.course || "").trim();
  if (!playerName || !course) throw new Error("playerName and course are required");

  const playedOn = toDateString(data.date || new Date().toISOString().slice(0, 10));
  const holes = padIntArray18(data.holes);
  const holePoints = padIntArray18(data.holePoints);

  const outingId = await resolveOutingIdForDateAndCourse(sb, playedOn, course);
  if (!outingId) {
    throw new ClientError(
      "No outing found for this date and course in society botanic. Create the outing in the admin first.",
    );
  }

  const playerId = await resolveOrCreatePlayerId(sb, playerName);
  const now = new Date().toISOString();

  const { data: existing, error: exErr } = await sb
    .from("scores")
    .select("score_timestamp")
    .eq("society_id", SOCIETY_ID)
    .eq("outing_id", outingId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (exErr) throw new Error(exErr.message);

  const scoreTimestamp = existing?.score_timestamp ? String(existing.score_timestamp) : now;

  const rowBody = {
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
    score_timestamp: scoreTimestamp,
    updated_at: now,
  };

  if (existing) {
    const { error } = await sb
      .from("scores")
      .update(rowBody)
      .eq("society_id", SOCIETY_ID)
      .eq("outing_id", outingId)
      .eq("player_id", playerId);
    if (error) throw new Error(error.message);
    return { success: true, message: "Score updated successfully", timestamp: scoreTimestamp };
  }

  const { error } = await sb.from("scores").insert({
    society_id: SOCIETY_ID,
    outing_id: outingId,
    player_id: playerId,
    ...rowBody,
    created_at: now,
  });
  if (error) throw new Error(error.message);
  return { success: true, message: "Score saved successfully", timestamp: scoreTimestamp };
}

async function deleteScore(sb: ReturnType<typeof createClient>, data: Record<string, unknown>) {
  const searchPlayerName = String(data.playerName || "").trim();
  const searchCourse = String(data.course || "").trim();
  const searchDate = normalizeDateForMatch(data.date || "");
  const searchTimestamp = normalizeTimestampForMatch(data.timestamp || "");

  const rows = await fetchScoresJoined(sb, 2000);
  const want = normalizeName(searchPlayerName);
  const candidates = rows.filter(
    (r) =>
      courseMatches(String(r.outings?.course_name || ""), searchCourse) &&
      normalizeName(String(r.players?.player_name || "")) === want,
  );
  const row = candidates.find((r) => {
    const rowDate = normalizeDateForMatch(r.outings?.outing_date);
    const rowTs = normalizeTimestampForMatch(r.score_timestamp);
    return rowDate === searchDate && rowTs === searchTimestamp;
  });
  if (!row) return { success: false, error: "Score not found" };

  const { error: delErr } = await sb
    .from("scores")
    .delete()
    .eq("society_id", SOCIETY_ID)
    .eq("outing_id", row.outing_id)
    .eq("player_id", row.player_id);
  if (delErr) throw new Error(delErr.message);
  return { success: true, message: "Score deleted successfully" };
}

async function getSociety(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb
    .from("societies")
    .select("*")
    .eq("society_id", SOCIETY_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { success: false, error: "Society not found" };
  return {
    success: true,
    society: {
      societyId: data.society_id,
      societyName: data.society_name,
      contactPerson: data.contact_person,
      numberOfPlayers: data.number_of_players,
      numberOfOutings: data.number_of_outings,
      status: data.status,
      createdDate: data.created_date ? toDateString(data.created_date) : "",
      captainsNotes: data.captains_notes || "",
    },
  };
}

async function getOutingsList(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb
    .from("outings")
    .select("*")
    .eq("society_id", SOCIETY_ID)
    .order("outing_date", { ascending: true })
    .order("outing_time", { ascending: true })
    .order("outing_id", { ascending: true });
  if (error) throw new Error(error.message);
  return {
    success: true,
    outings: (data || []).map((row: Record<string, unknown>) => ({
      outingId: row.outing_id,
      date: toDateString(row.outing_date),
      time: String(row.outing_time || ""),
      courseName: String(row.course_name || ""),
      comps: String(row.comps || ""),
    })),
  };
}

async function getCoursesList(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb.from("courses").select("*").order("course_name");
  if (error) throw new Error(error.message);
  return {
    success: true,
    courses: (data || []).map((row: Record<string, unknown>) => ({
      courseName: String(row.course_name || ""),
      parIndx: String(row.par_indx || ""),
      courseURL: String(row.course_url || ""),
      courseMaploc: String(row.course_maploc || ""),
      clubName: String(row.club_name || ""),
      courseImage: String(row.course_image || ""),
    })),
  };
}

async function getEditorNotesRows(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb
    .from("societies")
    .select("captains_notes")
    .eq("society_id", SOCIETY_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const text = String(data?.captains_notes || "").trim();
  if (!text) return { success: true, rows: [] as string[][] };
  const chunks = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const rows = chunks.length > 0 ? chunks.map((c) => [c]) : [[text]];
  return { success: true, rows };
}

async function getCourseDefsObject(sb: ReturnType<typeof createClient>) {
  const { data: outings, error: oErr } = await sb
    .from("outings")
    .select("course_name")
    .eq("society_id", SOCIETY_ID);
  if (oErr) throw new Error(oErr.message);
  const outingCourseNorm = new Set(
    (outings || []).map((o: { course_name: string }) => normalizeCourseKey(String(o.course_name || ""))),
  );

  const { data: courses, error: cErr } = await sb.from("courses").select("course_name, par_indx");
  if (cErr) throw new Error(cErr.message);

  const coursesOut: Record<string, { pars: number[]; indexes: number[] }> = {};
  for (const r of courses || []) {
    const row = r as { course_name: string; par_indx: string };
    const keyNorm = normalizeCourseKey(row.course_name);
    if (!outingCourseNorm.has(keyNorm)) continue;
    const { pars, indexes } = parseParIndx(row.par_indx || "");
    coursesOut[row.course_name] = { pars, indexes };
  }
  return { success: true, courses: coursesOut };
}

async function getSocietyPlayers(sb: ReturnType<typeof createClient>) {
  const { data, error } = await sb
    .from("players")
    .select("player_id, player_name, visitor")
    .eq("society_id", SOCIETY_ID)
    .order("player_name");
  if (error) throw new Error(error.message);
  return {
    success: true,
    players: (data || []).map(
      (p: { player_id: string; player_name: string; visitor?: boolean | null }) => ({
        playerId: p.player_id,
        playerName: p.player_name,
        visitor: p.visitor === true,
      }),
    ),
  };
}

async function getNextOuting(sb: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: outings, error: oErr } = await sb
    .from("outings")
    .select("outing_id, outing_date, outing_time, course_name, comps")
    .eq("society_id", SOCIETY_ID)
    .gte("outing_date", today)
    .order("outing_date", { ascending: true })
    .order("outing_time", { ascending: true })
    .order("outing_id", { ascending: true })
    .limit(1);
  if (oErr) throw new Error(oErr.message);
  const o = outings?.[0] as
    | {
      outing_id: string;
      outing_date: string;
      outing_time: string;
      course_name: string;
      comps: string;
    }
    | undefined;
  if (!o) {
    return {
      success: true,
      outing: null as Record<string, unknown> | null,
    };
  }

  const { data: courseRow, error: cErr } = await sb
    .from("courses")
    .select("course_name, course_url, course_maploc, club_name, course_image")
    .eq("course_name", o.course_name)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  const c = courseRow as {
    course_name: string;
    course_url: string;
    course_maploc: string;
    club_name: string;
    course_image: string;
  } | null;

  return {
    success: true,
    outing: {
      outingId: o.outing_id,
      date: toDateString(o.outing_date),
      time: o.outing_time || "",
      courseName: o.course_name || "",
      comps: o.comps || "",
      clubName: c?.club_name || "",
      courseUrl: c?.course_url || "",
      courseMaploc: c?.course_maploc || "",
      courseImage: c?.course_image || "",
    },
  };
}

async function dispatchGet(sb: ReturnType<typeof createClient>, action: string, params: URLSearchParams) {
  const args = Object.fromEntries(params.entries());
  if (action === "getSociety") return await getSociety(sb);
  if (action === "getOutings") return await getOutingsList(sb);
  if (action === "getCourses") return await getCoursesList(sb);
  if (action === "getEditorNotesRows") return await getEditorNotesRows(sb);
  if (action === "getCourseDefs") return await getCourseDefsObject(sb);
  if (action === "getSocietyPlayers") return await getSocietyPlayers(sb);
  if (action === "getNextOuting") return await getNextOuting(sb);
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
  // Read-only actions (same as GET) — supports POST clients and form-encoded `data` JSON.
  if (action === "getSociety") return await getSociety(sb);
  if (action === "getOutings") return await getOutingsList(sb);
  if (action === "getCourses") return await getCoursesList(sb);
  if (action === "getEditorNotesRows") return await getEditorNotesRows(sb);
  if (action === "getCourseDefs") return await getCourseDefsObject(sb);
  if (action === "getSocietyPlayers") return await getSocietyPlayers(sb);
  if (action === "getNextOuting") return await getNextOuting(sb);
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

  const sb = createClient(supabaseUrl, serviceRoleKey, { db: { schema: "thegolfapp" } });

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
    if (err instanceof ClientError) {
      return jsonResponse({ success: false, error: err.message }, 400);
    }
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
