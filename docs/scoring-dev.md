# Scoring Dev Notes

## Lock + Settle

Use either the admin API endpoints or the CLI scripts:

- API:
  - `POST /api/admin/races/:raceId/lock`
  - `POST /api/admin/races/:raceId/settle`
  - `POST /api/admin/races/:raceId/results`
- CLI:
  - `tsx server/scripts/lock-race.ts --raceId=123 [--force]`
  - `tsx server/scripts/settle-race.ts --raceId=123 [--force]`

Locking uses `race.lockAt` (defaults to `startDate - 1 day`). Running lock before `lockAt` is a no-op unless `--force` is provided. Locking creates immutable snapshots for valid teams. Settlement scores every snapshot and persists results in `race_scores`.

## Breakdown + Hashes

Each settlement writes:

- `race_scores.breakdown_json`: per-rider points, bench contribution, and substitution details.
- `race_scores.snapshot_hash_used`: hash of the locked snapshot payload.
- `race_scores.results_hash_used`: hash of the sorted result set payload.

Race-level hashes are tracked in `race_result_sets`.

## Determinism Guarantees

Determinism is enforced by:

- Stable payload hashing (`GAME_VERSION` + sorted keys/rows).
- Starter order defined by `starterIndex` (0..5).
- Auto-sub selects the **lowest starter slot index** among same-gender DNS starters.
- Results are sorted by `uciId` before hashing.

Re-running lock/settle with identical inputs produces identical hashes and scores.
