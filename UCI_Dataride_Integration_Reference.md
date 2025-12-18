# UCI Dataride Integration Reference (v3 — Confirmed ObjectRankings Fields)

This document is a **machine-readable** reference for integrating with the UCI Dataride web backend at `https://dataride.uci.ch/`.
It includes **confirmed response fields** from an `ObjectRankings` JSON payload and the recommended mapping into your `riders` table.

---

## Scope

- Sport page: MTB (`disciplineId`/sportId = `7`)
- Target race types:
  - Downhill: `raceTypeId = 19`, code `DHI`
  - Cross-country Olympic: `raceTypeId = 92`, code `XCO`
- Target categories (discovered dynamically via `GetRankingsCategories`):
  - Elite Men, Elite Women, Junior Men, Junior Women
- Primary ingestion products:
  - `riders` (canonical identity by **UCI ID**)
  - ranking entries (position/points snapshots) — optional table recommended

---

## Constants

```ts
export const DATARIDE_BASE_URL = "https://dataride.uci.ch";

export const SPORT = { MTB: 7 } as const;

export const RACE_TYPE = {
  DHI: { id: 19, code: "DHI" },
  XCO: { id: 92, code: "XCO" },
} as const;

export const DEFAULT_RIDER_IMAGE =
  "https://www.uci.org/assets/media/img/defaultMetaImage.jpg?f=&fit=thumb&q=80&fl=progressive&w=1200&h=800";
```

---

## Endpoints (HAR-derived)

### Seasons
`GET {BASE}/iframe/GetDisciplineSeasons/?disciplineId=7`

### Categories (per season)
`GET {BASE}/iframe/GetRankingsCategories/?disciplineId=7&disciplineSeasonId={seasonId}`

### Race types (per season)
`GET {BASE}/iframe/GetRankingsRaceTypes/?disciplineId=7&disciplineSeasonId={seasonId}`

### Rankings list (ranking definitions) for a filter set
`POST {BASE}/iframe/RankingsDiscipline/`
- `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- Required Kendo-style filters:
  - `SeasonId = {seasonId}`
  - `RaceTypeId = 0` (request “All” race types; the API only returns the complete list when `value=0`)
  - `CategoryId = 0` (request “All” categories for the same reason)
- Paging: `take`, `skip`, `page`, `pageSize`

**Important:** Even though we fetch the definitions with `RaceTypeId=0` and `CategoryId=0`, the response still includes the true `RaceTypeId`, `CategoryId`, `RankingTypeId`, and `MomentId` for each ranking. Filter those client-side to isolate:

- Race types: Downhill (`19`) and Cross-country Olympic (`92`)
- Categories: Elite Men (`22`), Elite Women (`23`), Junior Men (`24`), Junior Women (`25`)
- Ranking type: `1` (individual rankings)

Without the “All” filters, Dataride omits the women’s groups entirely.

The filters follow the standard Telerik/Kendo syntax. A canonical body looks like:

```
disciplineId=7
&take=100&skip=0&page=1&pageSize=100
&filter[filters][0][field]=RaceTypeId
&filter[filters][0][value]=0
&filter[filters][1][field]=CategoryId
&filter[filters][1][value]=0
&filter[filters][2][field]=SeasonId
&filter[filters][2][value]={seasonId}
```

Note: The live site requests do not include `filter[logic]` or `filter[filters][i][operator]` — just `field` + `value`.

Reuse the same structure for `ObjectRankings`, swapping the `value` entries for the actual `RaceTypeId`/`CategoryId` you’re processing so pagination stays scoped correctly.

### Ranking rows (the table data)
`POST {BASE}/iframe/ObjectRankings/`
- `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`
- Required fields (minimum):
  - `rankingId={rankingId}`
  - `disciplineId=7`
  - `rankingTypeId=1` (treat as configurable; observed in request)
  - paging: `take`, `skip`, `page`, `pageSize`
- Optional filters:
  - `RaceTypeId`, `CategoryId`, `SeasonId`, `MomentId`, etc. (Kendo filter list)

---

## Confirmed ObjectRankings Response Shape

The response is an object:

```ts
type ObjectRankingsResponse = {
  data: ObjectRankingRow[];
  total: number;
};
```

### Confirmed row fields (partial; stable fields in sample)

```ts
type ObjectRankingRow = {
  ObjectId: number;                 // internal entity id (unstable)
  ObjectTypeId: number;             // typically 1 for individual
  Rank: number;                     // numeric rank
  UciId: number;                    // rider UCI ID (numeric; canonical)
  DisplayName: string;              // e.g. "BRUNI Loic"
  IndividualFullName: string;       // e.g. "BRUNI Loic"
  TeamName: string | null;          // may be null
  TeamCode: string | null;          // may be null
  DisplayTeam: string | null;       // e.g. "SPECIALIZED GRAVITY (SGR)" (may be null)
  Points: number;                   // floating number, e.g. 1474.00
  NationName: string;               // may include padding spaces, e.g. "FRA       "
  NationFullName: string;           // e.g. "FRANCE"
  CountryIsoCode2: string;          // e.g. "FR"
  CountryId: number;                // internal id for country
  BirthDate: string;                // "/Date(768780000000)/"
  Ages: number;                     // integer
  DisciplineSeasonId: number;       // season id
  MomentId: number;                 // ranking snapshot id
  FlagCode: string;                 // e.g. "fr"
  Position: string;                 // e.g. "2nd"
  ComputationDate: string;          // "/Date(1765846809555)/"
};
```

NOTES:
- `UciId` is numeric (e.g. `10007544358`) and should be stored as **string** in your DB (safe for JS/TS and consistent).
- `TeamName` can be null — ingestion must coerce to empty string if your schema requires non-null.

---

## Database Mapping (Your `riders` Table)

Your current Drizzle table includes:

- `riderId` (unique) — currently described as a “consistent ID based on name”.  
For Dataride ingestion, this should become the canonical **UCI ID** (recommended).

### Recommended identity rules

- Canonical rider key: `uciIdString = String(row.UciId)`
- Store Dataride internal ids separately (optional):
  - `datarideObjectId = String(row.ObjectId)` (unstable)
  - You may also store `TeamCode`, `CountryId` if useful.

### Minimal schema change options

Option A (recommended):
- Use existing `riderId` to store UCI ID string.
- Add nullable columns for unstable ids:
  - `datarideObjectId` (text)
  - (optional) `datarideTeamCode` (text)

Option B:
- Add `uciId` column unique, keep `riderId` for app-owned id.

---

## Field mapping (confirmed)

Machine-readable mapping:

```json
{
  "riders.riderId": "String(row.UciId)",
  "riders.name": "row.IndividualFullName ?? row.DisplayName",
  "riders.gender": "derived from category (Elite Men/Women, Junior Men/Women)",
  "riders.team": "row.TeamName ?? row.DisplayTeam ?? ''",
  "riders.country": "row.CountryIsoCode2",
  "riders.points": "Math.round(row.Points) (or keep float -> int strategy)",
  "riders.cost": "points * 1000 (configurable)",
  "riders.image": "DEFAULT_RIDER_IMAGE"
}
```

### Notes on numeric handling

- `Points` arrives as a floating number; your schema stores `points` as integer.
  - Default approach: `pointsInt = Math.round(row.Points)`
  - Alternative: `Math.floor` (deterministic) — choose one and document it.

---

## Pagination

- `ObjectRankingsResponse.total` indicates the total rows available.
- Continue requesting pages until `skip >= total` or `data.length === 0`.

---

## No-cookie ingestion guideline

Your example curl included cookies, but ingester should:
- **not rely on cookies**
- use only the request headers required for JSON responses:
  - `Accept: application/json, text/javascript, */*; q=0.01`
  - `X-Requested-With: XMLHttpRequest`
  - `Content-Type: application/x-www-form-urlencoded; charset=UTF-8`

If the server ever returns 403 without cookies, add a fallback mode that can include a session cookie provided via env var.
