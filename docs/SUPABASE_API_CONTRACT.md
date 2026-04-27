# BGS Supabase API (`bgs-api`)

Public Edge Function. All responses are JSON with `success: boolean`. Errors use `success: false` and `error: string`.

## POST body

Compatible with the legacy Apps Script client:

- `Content-Type: application/x-www-form-urlencoded` with a single field `data` whose value is JSON: `{"action":"...","data":{...}}`
- Or `Content-Type: application/json` with the same object shape.

## GET

Query parameter `action` is required. Additional parameters are passed as query keys (e.g. `loadScores` uses `limit`, `playerName`, `course`).

## Actions

| Action | Method | Purpose |
|--------|--------|---------|
| `getFixtures` | GET | `{ success, fixtures: object[] }` — each item is one row object (CSV-shaped keys). |
| `getHandicaps` | GET | `{ success, handicaps: { "Player Name", "Handicap", "Handicap Date" }[] }` |
| `getLeagueCells` | GET | `{ success, data: unknown[][] }` — raw grid for `LeagueStandings.processData`. |
| `getEditorNotesRows` | GET | `{ success, rows: unknown[][] }` — first column = paragraph text per row. |
| `getCourseDefs` | GET | `{ success, courses: { [name]: { pars: number[], indexes: number[] } } }` |
| `getConfigKvRows` | GET | `{ success, rows: { Key, Value }[] }` — includes `NextOuting`, `Player`, etc. |
| `loadScores` | GET/POST | `{ success, scores: Score[] }` — optional `limit` (default 50, max 5000), `playerName`, `course`. |
| `checkExistingScore` | GET/POST | `{ success, exists, score? }` — body/query: `playerName`, `course`. |
| `saveScore` | POST | Body data: full score payload (`playerName`, `course`, `date`, `handicap`, `holes`, `holePoints`, totals, `back*`). Returns `{ success, message, timestamp }`. |
| `deleteScore` | POST | Body data: `playerName`, `course`, `date`, `timestamp` (must match stored row). |

## Score object (camelCase)

Matches the legacy sheet/API: `playerName`, `course`, `date` (YYYY-MM-DD), `handicap`, `holes` (length 18, `""` or stroke count), `holePoints`, `totalScore`, `totalPoints`, `outScore`, `outPoints`, `inScore`, `inPoints`, `back6Score`, `back6Points`, `back3Score`, `back3Points`, `timestamp` (ISO).
