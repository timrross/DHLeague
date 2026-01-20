# Rider Data Ingest Process

This document describes how rider data is imported, reconciled, and maintained in the DH League app.

## Data Sources (Priority Order)

### 1. UCI Dataride API (Primary Truth)
- **Purpose:** Authoritative source for participation and rankings identity
- **Data:** Rankings lists, round start lists, results
- **Fields:** UciId, Rank, Points, IndividualFullName, TeamName, CountryIsoCode2, etc.
- **Code:** `src/integrations/uciDataride/syncRidersFromRankings.ts`

### 2. Pinkbike Fantasy Athlete List (Secondary Roster Seed)
- **Purpose:** Captures privateers and riders not in UCI rankings
- **Data:** Season roster candidates from Pinkbike fantasy game
- **Fields:** name, country, team, pinkbikeProfileUrl
- **Schema:** `docs/api/schemas/pinkbike-dh-fantasy-athletes.schema.json`
- **Fixture:** `docs/api/fixtures/pinkbike/pinkbike-dh-fantasy-athletes.json`

### 3. UCI Rider API (Tertiary Enrichment Only)
- **Endpoint:** `https://www.uci.org/api/riders/MTB/{year}?page=1&pagesize=500`
- **Purpose:** Optional enrichment (team names, images, metadata)
- **Code:** `server/services/uciApi.ts` → `getMTBDownhillRiders()`

**CRITICAL:** UCI Rider API is **never** used as an allowlist. Never delete/filter riders based on this source.

## Key Rule

**Never delete or filter out riders because they are missing from the UCI Rider API.**

UCI Rider API is optional enrichment, not a gatekeeper. Riders may be privateers, late entries, or simply not in the UCI system.

## Data Model

### Required Fields on Rider Entity

```typescript
interface Rider {
  // Identity (at least one should be set)
  uciId: string | null;              // Canonical when known
  datarideId: number | null;         // Dataride ObjectId
  pinkbikeProfileUrl: string | null; // Pinkbike profile link

  // Source tracking
  sourceFlags: {
    dataride: boolean;
    pinkbikeFantasy: boolean;
    uciRiderApi: boolean;
  };

  // Display identity
  name: string;                      // Original display name
  firstName?: string;
  lastName?: string;
  country?: string;
  gender?: 'male' | 'female' | 'unknown';

  // Team & status
  teamName: string | null;
  isPrivateer: boolean | null;       // true if no team after merge

  // Activation status
  activeCandidate: boolean;          // In any source roster candidate set
  activeThisSeason: boolean;         // Seen in round OR explicitly seeded
  lastSeenRoundId?: string;

  // Match resolution tracking
  needsReview: boolean;              // Low confidence match, needs manual review
  resolutionConfidence: number;      // 0-1 scale
  resolutionMethod: 'uciId' | 'datarideId' | 'pbUrl' | 'nameCountryGender' | 'manual';

  // Soft delete (never hard delete)
  isArchived: boolean;               // Default false
}
```

## Canonical Identity Strategy

Match riders in this priority order:

| Priority | Method | Confidence |
|----------|--------|------------|
| 1 | Exact match by `uciId` | 1.0 (best) |
| 2 | Exact match by `datarideId` | 0.95 (strong) |
| 3 | Match by `pinkbikeProfileUrl` | 0.9 (strong within Pinkbike) |
| 4 | Match by normalized (name + country + gender) | 0.7 (medium) |
| 5 | Create new record | 0.3 (low, mark `needsReview=true`) |

### Name Normalization

For matching purposes:
1. Trim whitespace
2. Collapse multiple spaces to single space
3. Remove diacritics (store original display name separately)
4. Uppercase for key comparisons

Example: `"  Löïc  BRUNI "` → `"LOIC BRUNI"` (for matching key)

## Reconciliation Steps

### Step 0 — Load Inputs

```
┌─────────────────────────────────────────────────────────────────┐
│ Load Dataride riders (from rankings + round participants)       │
│ Load Pinkbike athletes (from saved JSON fixture)                │
│ Load UCI Rider API riders (for enrichment only)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1 — Upsert Dataride Riders (Primary)

For each Dataride candidate:
- Upsert using `uciId` if present, else `datarideId`
- Set:
  - `sourceFlags.dataride = true`
  - `activeCandidate = true`
- Do NOT clear `teamName` if missing; only update if value present

### Step 2 — Upsert Pinkbike Riders (Secondary)

For each Pinkbike athlete:
1. Find match in DB via:
   - `uciId` (if present in Pinkbike data)
   - `pinkbikeProfileUrl`
   - Normalized (name + country + gender)
2. Upsert/create if not found
3. Set:
   - `sourceFlags.pinkbikeFantasy = true`
   - `pinkbikeProfileUrl = ...`
   - `activeCandidate = true`
4. If no `teamName` after merge: set `isPrivateer = true`

### Step 3 — Enrich from UCI Rider API (Tertiary)

For each UCI Rider API rider:
1. Match via:
   - `uciId` (best)
   - Normalized (name + country + gender) as fallback
2. If matched:
   - Set `sourceFlags.uciRiderApi = true`
   - Enrich: `teamName`, `country`, `gender`, image URLs
3. If NOT matched:
   - OPTIONAL: Create record with `activeCandidate = false`
   - These riders are not draftable unless also in Dataride/Pinkbike

**CRITICAL:** UCI Rider API must NEVER remove riders or mark them inactive.

### Step 4 — Season Activation & Pruning (Non-Destructive)

Two boolean concepts:
- `activeCandidate` = "in any source roster candidate set"
- `activeThisSeason` = "seen participating in a round OR explicitly seeded"

Rules:
- If seen in round participants/results:
  - Set `activeThisSeason = true`
  - Set `lastSeenRoundId = <roundId>`
- Else if in Dataride rankings OR Pinkbike list:
  - Keep `activeCandidate = true`
  - Allow drafting
- **Never delete**; only archive riders absent for N seasons (manual job)

## Ingest Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     RIDER IMPORT FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. Fetch UCI Dataride API (PRIMARY)
   └─→ Get Elite Men + Elite Women rankings
   └─→ Upsert all riders, set sourceFlags.dataride=true
   └─→ Set activeCandidate=true

2. Load Pinkbike Fantasy Athletes (SECONDARY)
   └─→ Read local JSON fixture
   └─→ Match/upsert riders, set sourceFlags.pinkbikeFantasy=true
   └─→ Set activeCandidate=true
   └─→ Mark isPrivateer=true if no team

3. Fetch UCI Rider API (ENRICHMENT ONLY)
   └─→ Filter by format === "DH"
   └─→ Match existing riders by uciId or name
   └─→ Enrich: teamName, country, images
   └─→ Set sourceFlags.uciRiderApi=true
   └─→ DO NOT delete or filter riders!

4. Calculate derived fields
   └─→ points = 0 (start fresh each season)
   └─→ lastYearStanding = Dataride Rank
   └─→ cost = 500,000 / (lastYearStanding ^ 0.7), min $10,000

5. No deletion step
   └─→ Riders persist unless manually archived
```

## Code Locations

| Component | Location |
|-----------|----------|
| Dataride sync | `src/integrations/uciDataride/syncRidersFromRankings.ts` |
| Dataride normalization | `src/integrations/uciDataride/normalize.ts` |
| UCI riders sync script | `server/scripts/sync-uci-riders.ts` |
| Pinkbike athletes sync | `server/scripts/sync-pinkbike-athletes.ts` |
| Rider activation | `server/scripts/activate-top-riders.ts` |
| UCI Rider API (enrichment) | `server/services/uciApi.ts` |
| Riders storage | `server/storage.ts` |
| Riders controller | `server/controllers/riders.controller.ts` |
| Admin endpoints | `server/controllers/admin.controller.ts` |
| Schema | `shared/schema.ts` |
| Migration | `migrations/0003_add_rider_active_flag.sql` |

## Feature Flags

- `JUNIOR_TEAM_ENABLED`: When false, only import Elite Men and Elite Women categories from Dataride

## Running the Import

### Step 1: Sync UCI Dataride Riders (Primary)
```bash
npx tsx server/scripts/sync-uci-riders.ts
# Options:
#   --season=<id>   Specific season ID or "latest"
#   --dry-run       Preview changes without writing
#   --debug         Enable debug logging
```
This step now auto-activates the top 200 riders per gender when the sync finishes.

### Step 2: Sync Pinkbike Athletes (Secondary)
```bash
npx tsx server/scripts/sync-pinkbike-athletes.ts
# Options:
#   --dry-run       Preview changes without writing
```
This step also re-runs the activation logic to keep the top riders list current.

### Step 3: Activate Top Riders (Optional)
```bash
npx tsx server/scripts/activate-top-riders.ts
# Options:
#   --limit=<n>     Number of riders per gender (default: 200)
#   --dry-run       Preview changes without writing
```

### Dataride Only (via Admin API, SSE streaming)
```
POST /api/admin/riders/sync-dataride
```

## Schema Changes

### Implemented
- `active` (boolean, default false) - Only active riders are shown in team builder (top 200 per gender)

### Future Enhancements (Optional)
- `pinkbikeProfileUrl` (nullable string) - Link to Pinkbike profile
- `sourceDataride` (boolean, default false) - Track if rider came from Dataride
- `sourcePinkbikeFantasy` (boolean, default false) - Track if rider came from Pinkbike
- `sourceUciRiderApi` (boolean, default false) - Track if enriched from UCI Rider API
- `isPrivateer` (nullable boolean) - True if rider has no team
- `lastSeenRoundId` (nullable string) - Last race where rider participated
- `needsReview` (boolean, default false) - Flag for manual review
- `resolutionConfidence` (numeric, default 1.0) - Match confidence score
- `resolutionMethod` (string, nullable) - How the rider was matched
- `isArchived` (boolean, default false) - Soft delete flag

## Behavioral Changes from Previous System

1. **REMOVED:** Logic that deletes riders based on UCI Rider API
2. **REMOVED:** UCI Rider API as "allowlist filter"
3. **CHANGED:** UCI Rider API is now "enrichment pass" only
4. **ADDED:** Pinkbike athlete import step
5. **ADDED:** Soft delete (`isArchived`) instead of hard delete
6. **ADDED:** Source tracking flags per rider
7. **ADDED:** Resolution confidence tracking

## Data Quality Notes

1. **Team names:** UCI Rider API has more current team names than Dataride
2. **Name formatting:** Dataride uses "LASTNAME Firstname" format; normalize accordingly
3. **Privateers:** Riders without a team after all sources merge get `isPrivateer=true`
4. **Unranked riders:** Riders without a Dataride ranking get lastYearStanding=0 and minimum cost
