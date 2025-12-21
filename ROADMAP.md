# Minimum Deliverable Roadmap (Codex Task List)

This roadmap captures the minimum deliverable for the project in a Codex-friendly checklist format. Tasks are ordered by dependency (top to bottom) and can be tracked as they are completed.

## Task List

1. [x] **Baseline deployment & hosting**
   - Stand up two services: (a) the game mechanics service (team builder, roster storage, scoring) and (b) the rider data service (aggregation + public rider/race API).
   - Ensure both services build and deploy in the existing workflow/Docker paths and are reachable by the web app (e.g., `/api/game/*` and `/api/rider-data/*`).
   - Confirm cross-service secrets (data source tokens, admin creds) and inter-service URLs are set before feature work starts.

2. [x] **Core user journey (MVP navigation)**
   - Publish primary navigation with Home, Team Builder, Races, Leaderboard, Rules, and Admin routes so users can reach each page without errors.
   - Keep Home hero, next-race countdown, and featured/top-rider sections functional against live rider data service endpoints (e.g., `/api/rider-data/races`, `/api/rider-data/riders`) to show end-to-end value.

3. [x] **Fantasy team creation flow**
   - Implement minimal Team Builder: fetch riders from the rider data service, enforce budget/slot rules, allow roster assembly, and store the selection via the game mechanics service.
   - Add rule hints/validation consistent with the Rules page and show a confirmation toast on save (align with existing Toaster provider).

4. [x] **Race schedule visibility**
   - Serve a simple races list with status (next/upcoming/completed) and basic race detail pages from the rider data service.
   - Keep the homepage countdown synchronized with rider data service API data for the “next” race.

5. [ ] **Leaderboard visibility**
   - Publish a minimal leaderboard (overall standings and per-race points) so users can see team rankings after each event.
   - Ensure leaderboard queries pull roster/points from the game mechanics service while race metadata comes from the rider data service.

6. [x] **Admin data seeding**
   - Gate Admin tools for authorized users to create/update races and riders in the rider data service and manage scoring inputs/rosters in the game mechanics service; includes Dataride scraping/import for riders, UCI race import, and admin race-result entry to seed standings.
   - Add safe defaults for sessions/auth (password auth or OIDC) before exposing admin write actions across both services.

7. [ ] **Scoring & results pipeline**
   - Define a lightweight scoring model (points per finishing position and bonuses) and apply it to submitted team rosters when a race closes via the game mechanics service.
   - Automate leaderboard recalculation when admins post results, consuming official results from the rider data service.

8. [ ] **Reliability and feedback**
   - Add error boundaries and loading states to all data-driven pages (races, riders, leaderboard).
   - Surface user feedback via toasts for saves/errors and keep Home hero links to Team Builder/Rules prominent.
   - Monitor cross-service health (timeouts/availability) and degrade gracefully if either service is unavailable.

9. [ ] **Harden admin access control**
   - Remove the header-based admin override, derive admin roles from identity provider claims or stored user flags, and add tests that cover admin-only routes.

10. [ ] **Deterministic, efficient leaderboard**
    - Replace random placeholder values, compute last-round points from recent results, and eliminate N+1 queries by batching team/user hydration.

11. [ ] **Result retrieval without N+1 queries**
    - Join rider data when fetching race results to return atomic rows and handle missing riders explicitly.

12. [ ] **Unified schema management**
    - Choose a single migration path (Drizzle migrations or the runtime schema creation), delete redundant DDL, and align unique constraints with the `(user_id, team_type)` model.

13. [ ] **Dead code and import hygiene**
    - Remove unused imports (e.g., `generateRiderId` in storage) and run static analysis to catch drift in data-layer modules.

## Release Criteria for the Minimum Deliverable

- Users can create a team, view upcoming races, and see a leaderboard after at least one race is scored.  
- Admins can seed races/riders and post results without direct database edits.  
- CI build succeeds and the Dockerized app serves both client and API on port 5000 as documented.
