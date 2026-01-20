# Reconciliation Checklist (Spec vs Implementation)

Source of truth: `project/docs/game-mechanic.md`

Status legend: yes | no | unknown

| Rule | Enforcement location | Status | Notes |
| --- | --- | --- | --- |
| Discipline: DHI only | `server/services/game/config.ts`, `server/services/game/resultImports.ts`, `server/services/game/uciResults.ts` | yes | Discipline resolver normalizes to DHI. |
| Elite team mandatory | none | no | No server-side enforcement; teams can be absent. |
| Junior team optional, gated by `FEATURE_JUNIOR_TEAM_ENABLED` | `server/services/features.ts`, `server/controllers/*`, `server/services/game/teams.ts` | yes | Junior create/update gated; junior snapshots/results gated. |
| Valid team requires 6 starters, 4M/2F | `server/storage.ts`, `server/services/game/validateTeam.ts` | yes | Enforced on create/update/upsert. |
| Bench optional (0 or 1) | `server/storage.ts`, `server/services/game/validateTeam.ts` | yes | Bench may be null. |
| Team cannot be saved if invalid or over budget at save time | `server/storage.ts`, `server/services/game/validateTeam.ts` | yes | Budget uses cost-at-save overrides to prevent inflation exploits. |
| Budgets: Elite 2,000,000; Junior 500,000 | `server/services/game/config.ts` | yes | |
| Locking: `lockAt = startAt - 48h` | `server/services/game/lockRace.ts`, `server/storage.ts`, `server/setupDatabase.ts` | yes | 48h lead time enforced. |
| Admin can early-lock | `server/controllers/gameRaces.controller.ts`, `server/services/game/lockRace.ts` | yes | `force` flag. |
| Pre Round 1: unlimited changes | `server/services/game/editingWindow.ts`, `server/controllers/teams.controller.ts`, `server/services/game/teams.ts` | yes | Transfers enforced only after first settled round. |
| After Round 1 settles: 2 transfers per round (bench changes count) | `server/controllers/teams.controller.ts`, `server/services/game/teams.ts` | yes | Transfers enforced per save; bench counted. |
| Transfer consumption on Save, net-change only | `server/services/game/transfers.ts`, `server/controllers/teams.controller.ts`, `server/services/game/teams.ts` | yes | Uses roster diff. |
| Joker: once per season, usable between settlement and next lock | `server/controllers/teams.controller.ts`, `server/services/game/editingWindow.ts` | yes | Requires settled round + editing window open. |
| Joker clears roster; unlimited changes until next lock | `server/controllers/teams.controller.ts`, `server/services/game/teams.ts` | yes | Team deleted; transfer enforcement skipped while active. |
| Scoring: finals results only | `server/services/game/settleRace.ts`, `server/services/game/resultImports.ts` | yes | Qual bonus disabled; final imports required. |
| Elite score = EM + EW event points | `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | Sum of starters (4M/2F). |
| Junior score = JM + JW (when enabled) | `server/services/game/settleRace.ts` | yes | Junior required when feature enabled + junior in use. |
| Points table top 20 (1st=200 ... 20th=10; >20=0) | `server/services/game/config.ts` | yes | Top-20 table only. |
| DNS/DNF/DNQ => 0 and eligible for substitution | `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | Eligible statuses set to DNS/DNF/DNQ. |
| DSQ => 0 and NOT eligible for substitution | `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | DSQ excluded from substitution. |
| Bench substitution same gender only | `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | |
| Max 1 substitution per team per round | `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | |
| Sub replaces highest snapshot cost, tie-break lowest slot index | `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | Uses snapshot costAtLock. |
| Bench replaces starter only (no extra points) | `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | |
| Substitution uses snapshot cost at lock | `server/services/game/lockRace.ts`, `server/services/game/scoring/scoreTeamSnapshot.ts` | yes | costAtLock stored in snapshots. |
| Over-budget after cost inflation allowed | `server/services/game/teams.ts`, `server/storage.ts`, `server/services/game/validateTeam.ts` | yes | Budget uses min(costAtSave, current cost) for retained riders. |
| Settlement blocks until required finals exist (EM/EW; JM/JW if enabled) | `server/services/game/resultImports.ts`, `server/services/game/settleRace.ts` | yes | Includes junior when enabled and in use. |
| Rider cost updates after settlement (top 10 +%, 11+ no change; DNS/DNF/DNQ/DSQ -10%; round up 1000) | `server/services/game/costUpdates.ts`, `server/services/game/settleRace.ts` | yes | Cost updates applied after settlement. |
