# DHLeague Game Mechanics
**File:** `project/docs/game-mechanic.md`  
**Status:** Authoritative Source of Truth  
**Audience:** AI / coding agents implementing scoring, locking, settlement, and standings  
**Scope:** Exact rules for team structure, race lifecycle, and per-race point allocation

---

## 1) Core Principles

1. **Deterministic**  
   Given identical inputs (teams, snapshots, results), outputs must be identical.

2. **Snapshot-based**  
   All scoring uses immutable team snapshots taken at race lock.

3. **Canonical identity**  
   Riders are always identified by `uciId`.

4. **Gender-aware mechanics**  
   Gender is a first-class constraint in team composition and substitutions.

---

## 2) Entities

### 2.1 Season
A **Season** is an ordered collection of Races.
- `seasonId`
- `startAt`, `endAt`

---

### 2.2 Race
A **Race** represents a single competitive event (imported from the UCI API). Races are the source of truth for schedule and lock timing.

Attributes:
- `raceId`
- `discipline`: `DHI` | `XCO`
- `startDate`, `endDate`
- `lockAt` (defaults to `startDate - 1 day`)
- `gameStatus`:  
  `scheduled | locked | provisional | final | settled`
- `needsResettle` (boolean)

A Race is scored for **both team types**. Category eligibility is enforced by rider eligibility on the team (Elite vs Junior).

---

### 2.3 Rider
- `uciId` (canonical, string)
- `gender`: `male | female`
- `categoryEligibility`: `elite | junior | both`
- `cost`
- `injured` (boolean)

---

### 2.4 User
A User participates in a Season by creating **up to two teams**:
- **Elite Team**
- **Junior Team**

Each team scores independently per race.

---

## 3) Team Structure

### 3.1 Team Types

Each user may have:

| Team Type | Category | Budget |
|---------|----------|--------|
| Elite Team | Elite Men + Elite Women | 2,000,000 |
| Junior Team | Junior Men + Junior Women | 500,000 |

---

### 3.2 Team Composition (Starters)

Each team has exactly **6 starters**:

| Gender | Slots |
|------|------|
| Male | 4 |
| Female | 2 |
| **Total** | **6** |

Rules:
- Gender slots are strict.
- Riders must be eligible for the team category (Elite/Junior).
- No duplicate riders.

---

### 3.3 Bench

Each team also has **1 bench rider**.

Bench rules:
- Bench rider may be **male or female**
- Bench does **not** score unless substituted in
- Bench counts toward budget

---

### 3.4 Budget Enforcement

At save time and lock time:
- Sum of **starters + bench** must not exceed team budget
- Budget is enforced **per team**, not per user

---

## 4) Race Lifecycle

### 4.1 Roster Lock

At `race.lockAt`:

- Both Elite and Junior teams (if present) are locked
- A **Team Snapshot** is created per team per race

If a user has:
- no team of that type → scores 0 for that team type
- an invalid team → snapshot is not created → scores 0

---

### 4.2 Team Snapshot

A snapshot contains:

- `raceId`
- `userId`
- `teamType`: `elite | junior`
- `starters`: list of 6 `uciId`s
- `bench`: optional `uciId`
- gender of each rider
- total cost
- snapshot hash
- timestamp

**All scoring uses the snapshot only.**

---

## 5) Scoring Inputs

### 5.1 Results

For a given race, results are provided as rows:

- `uciId`
- `position` (integer)
- `status`: `FIN | DNF | DNS | DSQ`
- optional:
  - `qualificationPosition`

Missing rider → treated as `DNS`.

---

## 6) Base Scoring Model

### 6.1 Base Finish Points (Final Result)

Top 30 scoring table:

| Place | Pts | Place | Pts |
|------:|----:|------:|----:|
| 1 | 100 | 16 | 15 |
| 2 | 80 | 17 | 14 |
| 3 | 70 | 18 | 13 |
| 4 | 60 | 19 | 12 |
| 5 | 55 | 20 | 11 |
| 6 | 50 | 21 | 10 |
| 7 | 45 | 22 | 9 |
| 8 | 40 | 23 | 8 |
| 9 | 35 | 24 | 7 |
| 10 | 30 | 25 | 6 |
| 11 | 25 | 26 | 5 |
| 12 | 22 | 27 | 4 |
| 13 | 20 | 28 | 3 |
| 14 | 18 | 29 | 2 |
| 15 | 16 | 30 | 1 |

Positions > 30 score **0**.

---

### 6.2 Status Handling

| Status | Points |
|------|--------|
| FIN | Base + bonuses |
| DNF | 0 |
| DNS | 0 |
| DSQ | -10 |

---

### 6.3 Qualification Bonus (if enabled)

If qualification results exist:

| Qual Position | Bonus |
|--------------|-------|
| 1 | +10 |
| 2 | +8 |
| 3 | +6 |
| 4–10 | +3 |
| 11–20 | +1 |

Else: +0.

---

## 7) Bench & Auto-Substitution

### 7.1 Auto-Sub Rules

Auto-substitution is **enabled**.

Rules:
1. Only triggers if a **starter is DNS**
2. Bench rider may replace **one starter only**
3. **Gender must match**
   - Male bench → male starter
   - Female bench → female starter
4. Only **one substitution per team per race**
5. Bench rider takes full scoring of substituted slot

Priority:
- Substitute the **lowest starter slot index** (0..5) among same-gender DNS starters

If no valid substitution exists → bench does not score.

---

## 8) Per-Race Scoring Algorithm (Exact)

For each `raceId` and each `teamSnapshot`:

---

### Step 1: Resolve Results

For each starter + bench rider:
- Lookup result by `uciId`
- If missing → `status = DNS`

---

### Step 2: Compute Raw Rider Points

For each rider:
- FIN → base points + qual bonus
- DNF/DNS → 0
- DSQ → -10

---

### Step 3: Apply Auto-Sub

If:
- at least one starter has `DNS`
- bench rider exists
- genders match

Then:
- Replace **one DNS starter** with bench rider
- Bench rider’s points count
- Replaced starter’s points are discarded

---

### Step 4: Sum Team Points

Team race score =
- Sum of **6 final active riders** after substitution

No rounding beyond integer arithmetic.

---

### Step 5: Persist Breakdown

Store:
- per-rider contributions
- substitution details (who replaced whom)
- total team points

---

## 9) User Race Allocation

For each race:

- Elite team score is calculated if an Elite snapshot exists
- Junior team score is calculated if a Junior snapshot exists

Users may score:
- in both team types for the same race
- or only one
- or zero (if no valid snapshot)

---

## 10) Standings

### 10.1 Season Total

For each user:

seasonTotal =
- sum(all Elite race scores)
- sum(all Junior race scores)

Elite and Junior points contribute equally to the overall league.

---

### 10.2 Tie-Breakers

If season totals tie:

1. Most race wins
2. Highest single-race score
3. Most podium finishes
4. Earliest team creation timestamp
5. Stable userId order

---

## 11) Corrections & Re-Settlement

- Settlement must be idempotent
- If results change:
  - mark race `needs_resettle`
  - recompute all affected team scores
  - update standings

Persist:
- `resultsHash`
- `snapshotHash`
- `settledAt`

---

## 12) Validation Rules (Strict)

### Team Save
- Correct gender slots
- Correct category eligibility
- Budget respected
- Exactly 6 starters + 1 bench

### Lock Time
- Invalid teams → no snapshot → score 0
- No auto-correction

---

## 13) Example

Elite DHI race.

Team:
- 4 male starters
- 2 female starters
- 1 female bench

Results:
- One female starter = DNS
- Bench female finishes 8th (40 pts)

Outcome:
- Bench auto-subs in
- Team still has 4M / 2F
- Bench contributes 40 pts

---

## 14) Default Config (Copy/Paste)

```ts
export const TEAM_RULES = {
  TEAM_SIZE: 6,
  BENCH_SIZE: 1,
  GENDER_SLOTS: { male: 4, female: 2 },
  AUTO_SUB_ENABLED: true
};

export const BUDGETS = {
  ELITE: 2_000_000,
  JUNIOR: 500_000
};

export const SCORING = {
  DSQ_PENALTY: -10,
  QUAL_BONUS_ENABLED: true
};
```

---

15) Out of Scope (Explicit)
- Transfers mid-race
- Chips / boosts
- Captain multipliers
- Partial race scoring

These require a versioned amendment if added.
