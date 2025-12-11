# Minimum Deliverable Roadmap (Codex Task List)

This roadmap captures the minimum deliverable for the project in a Codex-friendly checklist format. Tasks are ordered by dependency (top to bottom) and can be tracked as they are completed.

## Task List

1. [ ] **Baseline deployment & hosting**  
   - Ensure the combined Vite React + Express app builds and serves correctly in production via the existing workflow and Docker paths.  
   - Confirm secrets and service paths are set for the target host before feature work starts.

2. [ ] **Core user journey (MVP navigation)**  
   - Publish primary navigation with Home, Team Builder, Races, Leaderboard, Rules, and Admin routes so users can reach each page without errors.  
   - Keep Home hero, next-race countdown, and featured/top-rider sections functional against live `/api/races` and `/api/riders` data to show end-to-end value.

3. [ ] **Fantasy team creation flow**  
   - Implement minimal Team Builder: fetch riders, enforce budget/slot rules, allow roster assembly, and store the selection server-side (session or account).  
   - Add rule hints/validation consistent with the Rules page and show a confirmation toast on save (align with existing Toaster provider).

4. [ ] **Race schedule visibility**  
   - Serve a simple races list with status (next/upcoming/completed) and basic race detail pages.  
   - Keep the homepage countdown synchronized with API data for the “next” race.

5. [ ] **Leaderboard visibility**  
   - Publish a minimal leaderboard (overall standings and per-race points) so users can see team rankings after each event.

6. [ ] **Admin data seeding**  
   - Gate an Admin page for authorized users to create/update races, riders, and scoring inputs; target CRUD plus CSV upload for faster seeding.  
   - Add safe defaults for sessions/auth (password auth or OIDC) before exposing admin write actions.

7. [ ] **Scoring & results pipeline**  
   - Define a lightweight scoring model (points per finishing position and bonuses) and apply it to submitted team rosters when a race closes.  
   - Automate leaderboard recalculation when admins post results.

8. [ ] **Reliability and feedback**  
   - Add error boundaries and loading states to all data-driven pages (races, riders, leaderboard).  
   - Surface user feedback via toasts for saves/errors and keep Home hero links to Team Builder/Rules prominent.

## Release Criteria for the Minimum Deliverable

- Users can create a team, view upcoming races, and see a leaderboard after at least one race is scored.  
- Admins can seed races/riders and post results without direct database edits.  
- CI build succeeds and the Dockerized app serves both client and API on port 5000 as documented.
