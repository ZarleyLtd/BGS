# BGS Supabase API (`bgs-api`)

Public Edge Function. All responses are JSON with `success: boolean`. Errors use `success: false` and `error: string`.

**Data source:** Postgres schema **`thegolfapp`**, fixed society **`botanic`** (no `societyId` parameter on the public BGS API). Reads/writes use the same tables as the main Golf App for that society.

## POST body

Compatible with the legacy Apps Script client:

- `Content-Type: application/x-www-form-urlencoded` with a single field `data` whose value is JSON: `{"action":"...","data":{...}}`
- Or `Content-Type: application/json` with the same object shape.

`saveScore` with no matching **outing** for the given `date` + `course` returns **HTTP 400** with `{ success: false, error: "..." }`.

## GET

Query parameter `action` is required. Additional parameters are passed as query keys (e.g. `loadScores` uses `limit`, `playerName`, `course`).

## Actions

| Action | Method | Purpose |
|--------|--------|---------|
| `getSociety` | GET | `{ success, society: { societyId, societyName, status, … } }` — `societies` row for botanic (`status` e.g. `O10` / `OAP` drives leaderboard overall). |
| `getOutings` | GET | `{ success, outings: { outingId, date, time, courseName, comps }[] }` — all `outings` for botanic, date ascending. |
| `getCourses` | GET | `{ success, courses: { courseName, parIndx, courseURL, courseMaploc, clubName, courseImage }[] }` — all `courses` (for outings page / imagery). |
| `getEditorNotesRows` | GET | `{ success, rows: unknown[][] }` — from `societies.captains_notes` (botanic); first column = paragraph text per row. |
| `getCourseDefs` | GET | `{ success, courses: { [name]: { pars: number[], indexes: number[] } } }` — from `courses.par_indx` for courses that appear on botanic `outings`. |
| `getSocietyPlayers` | GET | `{ success, players: { playerId, playerName, visitor }[] }` — from `players` for botanic. `visitor` is `true` for guest / non-member players (default `false`). See [VISITOR_LEADERBOARD_ENCODING.md](./VISITOR_LEADERBOARD_ENCODING.md). |
| `getNextOuting` | GET | `{ success, outing: null \| { outingId, date, time, courseName, comps, clubName, courseUrl, courseMaploc, courseImage } }` — earliest `outings` row with `outing_date >= today`, joined to `courses`. |
| `loadScores` | GET/POST | `{ success, scores: Score[] }` — optional `limit` (default 50, max 5000), `playerName`, `course`. |
| `checkExistingScore` | GET/POST | `{ success, exists, score? }` — query/body: `playerName`, `course`. If multiple scores match, returns the **latest** by `score_timestamp`. |
| `saveScore` | POST | Body data: full score payload (`playerName`, `course`, `date`, …). Requires an existing outing for that date/course. Returns `{ success, message, timestamp }`. |
| `deleteScore` | POST | Body data: `playerName`, `course`, `date`, `timestamp` (must match stored row). |

Removed from this API (BGS site no longer uses them): `getFixtures`, `getHandicaps`, `getLeagueCells`, `getConfigKvRows`.

## Score object (camelCase)

Matches the legacy sheet/API: `playerId`, `playerName`, `course`, `date` (YYYY-MM-DD), `handicap`, `holes` (length 18, `""` or stroke count), `holePoints`, `totalScore`, `totalPoints`, `outScore`, `outPoints`, `inScore`, `inPoints`, `back6Score`, `back6Points`, `back3Score`, `back3Points`, `timestamp` (ISO). `playerId` is the canonical foreign key into `players`; clients should prefer it over `playerName` for visitor/handicap lookups.
