# Code review summary (2025-12-21)

This review focuses on security boundaries, data correctness, and operational risks in the current services.

## Key findings

- **Admin elevation bypass**: The `isAdmin` middleware trusts a static `x-my-secret` header to flip `user.isAdmin` at runtime. That allows anyone who knows the string to gain admin rights without persistence or audit, and the change is not written back to the database. 【F:server/middleware/auth.middleware.ts†L5-L25】
- **Leaderboard correctness & performance gaps**: Leaderboard rows rely on a random `lastRoundPoints` value and make per-row user/team lookups. That makes responses non-deterministic, blocks ranking verification, and causes N+1 queries as teams grow. 【F:server/storage.ts†L842-L875】
- **Result aggregation N+1**: Race results fetch each rider individually per row, producing N+1 queries and no guardrails for missing riders; a join would be safer and faster. 【F:server/storage.ts†L793-L808】
- **Schema management drift**: `ensureDatabaseSchema` hand-writes DDL that diverges from the Drizzle schema (e.g., re-adding the existing `category` column) while the unused `runMigrations` file still adds a unique `teams.user_id` constraint that conflicts with multi-team types. The server currently invokes only the ad-hoc statements, so the tracked migration logic is obsolete and risks future conflicts. 【F:server/setupDatabase.ts†L4-L107】【F:server/migrations.ts†L8-L293】
- **Unused import noise**: `generateRiderId` is imported into storage but never used, hinting at stale refactors and adding lint churn. 【F:server/storage.ts†L1-L43】

## Recommended plan

1) **Lock down admin authorization**: Remove the header-based elevation path, derive admin role from OIDC claims or persisted user flags, and add tests around admin-only routes. 【F:server/middleware/auth.middleware.ts†L5-L25】
2) **Make leaderboard deterministic and efficient**: Compute `lastRoundPoints` from the most recent race results, hydrate teams and users in a single query or view, and add contract tests to prevent regressions. 【F:server/storage.ts†L793-L875】
3) **Batch result joins**: Replace per-row rider lookups in `getResults` with a joined query that returns rider fields atomically and handles missing riders explicitly. 【F:server/storage.ts†L793-L808】
4) **Consolidate schema management**: Choose a single migration path (Drizzle or `ensureDatabaseSchema`), remove redundant column/constraint alterations, and align unique constraints with the `(user_id, team_type)` model to avoid dead migrations. 【F:server/setupDatabase.ts†L4-L107】【F:server/migrations.ts†L8-L293】
5) **Tighten dead-code hygiene**: Drop unused imports like `generateRiderId` in storage and run static analysis to keep drift out of critical data paths. 【F:server/storage.ts†L1-L43】

Tracking these items in the roadmap will surface the work and keep the team aligned on priorities.

## Actionable tasks

- [ ] Remove the `x-my-secret` admin bypass and assert admin role from OIDC claims or persisted `users.is_admin`; add route-level tests covering success and rejection cases for admin-only endpoints. 【F:server/middleware/auth.middleware.ts†L5-L25】
- [ ] Refactor leaderboard construction to compute `lastRoundPoints` from recent results and batch user/team hydration to avoid N+1 queries; codify behavior in contract tests. 【F:server/storage.ts†L793-L875】
- [ ] Rewrite race result retrieval to join rider rows in a single query, returning atomic result+rider payloads and explicit handling when riders are missing. 【F:server/storage.ts†L793-L808】
- [ ] Pick a single migration strategy, remove redundant/obsolete DDL in `ensureDatabaseSchema`, and align uniqueness constraints with `(user_id, team_type)` to prevent multi-team conflicts. 【F:server/setupDatabase.ts†L4-L107】【F:server/migrations.ts†L8-L293】
- [ ] Clean unused imports (e.g., `generateRiderId` in storage) and run static analysis/lint to keep the data layer free of dead code. 【F:server/storage.ts†L1-L43】
