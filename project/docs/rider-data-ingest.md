# Rider Data Ingest Process

This document describes how rider data is imported and maintained in the DH League app.

## Data Sources

### 1. UCI Riders API (Primary Filter)
- **Endpoint:** `https://www.uci.org/api/riders/MTB/{year}?page=1&pagesize=500`
- **Purpose:** Defines which riders are eligible to appear in the app
- **Filter:** Only riders with `format === "DH"` are included
- **Fields available:** givenName, familyName, countryCode, teamName, format, url
- **Example response:** `docs/api/uci-riders/001-get-api-riders-mtb-2026-8725ac38.response.json`
- **Typical count:** ~147 DH riders

### 2. UCI Dataride API (Primary Data Source)
- **Endpoint:** UCI Dataride ObjectRankings API
- **Purpose:** Provides detailed rider data including UCI rankings and points
- **Fields available:** UciId, Rank, Points, IndividualFullName, TeamName, CountryIsoCode2, etc.
- **Typical count:** 400+ riders (includes all UCI-registered riders, not just active DH)

## Ingest Process

The rider import follows this process:

```
┌─────────────────────────────────────────────────────────────────┐
│                     RIDER IMPORT FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. Fetch UCI Riders API
   └─→ Filter by format === "DH"
   └─→ Result: ~147 eligible DH riders (the "allowlist")

2. Fetch UCI Dataride API
   └─→ Get Elite Men + Elite Women rankings
   └─→ Result: 400+ riders with detailed ranking data

3. Cross-reference
   └─→ Match Dataride riders against allowlist by name
   └─→ Only keep riders that appear in BOTH sources
   └─→ Result: ~147 riders with full ranking data

4. Merge data
   └─→ Primary data: Dataride (UciId, Rank, Points, etc.)
   └─→ Override team name from UCI Riders API (more current)

5. Calculate derived fields
   └─→ points = 0 (start fresh each season)
   └─→ lastYearStanding = Dataride Rank
   └─→ cost = 500,000 / (lastYearStanding ^ 0.7), min $10,000
   └─→ if Dataride name has a leading `*`, mark rider as `junior`

6. Upsert to database
   └─→ Insert new riders
   └─→ Update existing riders (by uciId)

7. Remove unlisted riders
   └─→ Delete any riders in DB that aren't in the final allowlist
```

## Name Matching Strategy

Since the UCI Riders API doesn't expose UciId directly, we match riders by normalized name:

1. Normalize both names: lowercase, trim whitespace, remove accents
   └─→ strip leading `*` before matching, but record junior status
2. Build lookup key: `${firstName} ${lastName}` normalized
3. Match Dataride riders against UCI Riders allowlist

## Code Locations

- **UCI Riders API client:** `server/services/uciApi.ts` → `getMTBDownhillRiders()`
- **Dataride API client:** `src/integrations/uciDataride/syncRidersFromRankings.ts`
- **Rider normalization:** `src/integrations/uciDataride/normalize.ts`
- **Admin import endpoint:** `server/controllers/admin.controller.ts`

## Feature Flags

- `JUNIOR_TEAM_ENABLED`: When false, only import Elite Men and Elite Women categories

## Running the Import

### Via Admin API (SSE streaming)
```
POST /api/admin/riders/sync-dataride
```
Returns server-sent events with progress updates.

### Programmatically
```typescript
import { syncRidersFromRankings } from './src/integrations/uciDataride/syncRidersFromRankings';

const summary = await syncRidersFromRankings({
  log: console.log,
  filterByUciRidersApi: true,  // Enable cross-reference filtering
});
```

## Data Quality Notes

1. **Team names:** UCI Riders API has more current team names than Dataride
2. **Name formatting:** Dataride uses "LASTNAME Firstname" format; normalize accordingly
3. **Leading asterisks:** `*` indicates a junior rider. Remove the marker for matching but store the rider as `junior`.
4. **Unranked riders:** Riders without a Dataride ranking get lastYearStanding=0 and minimum cost
