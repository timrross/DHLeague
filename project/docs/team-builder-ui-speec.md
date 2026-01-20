# Team Builder UI Spec

Your task is to refactor and improve the Team Builder screen UI/UX based on the requirements below. You must implement changes end-to-end (components, layout, styling, responsive behavior) until the new UI is complete and working.

## Repo context
Client code lives in:
- `client/src/`
  - `pages/`
  - `components/`
  - `services/`
  - `types/`
Use existing patterns and styling system (do not introduce a new framework). Reuse existing components where possible.

## Goal
Make the Team Builder screen:
- clearer for first-time users
- faster for repeat users
- strongly constraint-guided (budget + gender slots)
- mobile-first responsive (over 50% users on handheld)
- visually hierarchical with a single primary workflow:
  Pick riders -> Validate team -> Save team -> Wait for lock

## Non-negotiable UX changes (implement all)

### 1) Switch to a 2-panel layout (remove 3-column competition)
Current: left team, middle performance, right rider list.

New desktop layout:
- Primary column (left, ~65-70%): Team Builder (selected riders, bench, constraints, actions)
- Secondary column (right, ~30-35%): Rider Search/List (filters, sort, add)

Remove the current middle "Team Performance" panel from the Team Builder page.
- Move "Team Performance / Season total" to:
  - a tab inside Team Builder ("Performance"), OR
  - a separate page (preferred if already exists)
- On Team Builder, replace that space with a Validation/Readiness panel (see #3)

### 2) Mobile-first layout (must be excellent)
On mobile:
- Use a single-column layout with sticky affordances:
  - Sticky header showing lock countdown + lock state
  - Sticky bottom action bar with primary CTA ("Save Team" / "Update Team")
- Rider list should be in a collapsible drawer/modal OR below team builder with strong section headers
- Ensure touch targets meet minimum size (44px) and spacing works for thumbs
- No horizontal scrolling

### 3) Replace "Team Performance" with a "Team Status" validation panel
Create a panel that always shows, in priority order:
- Lock countdown + lock status (e.g. "Locks in 23h 51m" / "Locked")
- Team validity status:
  - OK: Team valid
  - WARN: Missing slots (e.g. "Need 1 female rider")
  - ERROR: Over budget by $X
  - WARN: Bench missing (if bench is required/encouraged)
- Short explanatory copy:
  - "After lock, changes won't affect this round."
  - "Bench auto-subs only if a same-gender starter DNS."

This panel must be driven by computed state (not static text).

### 4) Make constraints loud and contextual: Budget + Gender slots
#### Budget
- Replace text-only budget with:
  - a progress bar + clear remaining amount (large)
  - color states:
    - Green: safe
    - Amber: low remaining (<=10% of cap)
    - Red: over budget
- Always show both:
  - "$X remaining"
  - "$Y / $CAP used"

#### Gender slots
- Replace subtle bars with explicit slot indicators:
  - Display 6 slots: 4 male, 2 female
  - Use icons or labels and show filled/empty clearly
  - Show "Valid/Invalid" indicator next to slots
- Must update live as users add/remove riders

### 5) Selected riders section improvements (starters vs bench clarity)
- Visually separate:
  - Starters (6) and Bench (1)
- Bench must include explanatory microcopy:
  "Bench rider only scores if a same-gender starter DNS. Only one auto-sub per round."
- Make destructive actions (remove) less visually dominant than add
- Provide clear empty states:
  - "Add 4 men and 2 women to starters"
  - "Optional: choose a bench rider" (or required if rules require)

### 6) Rider list should explain "why you can't add"
In the rider list:
- Disable the "Add (+)" button if adding would violate:
  - budget cap
  - gender slot limits
  - roster full
- Provide an inline reason:
  - tooltip on desktop
  - helper text / toast on mobile
Examples:
- "Roster full"
- "Too many men"
- "Need 1 woman"
- "Over budget"

Also add visible tags if already available in data:
- Injured
- Locked (if applicable)

### 7) Countdown and lock status: increase salience
Move countdown into the page header area, above the fold, and duplicate it in the Team Status panel.
Use clear language:
- "Editing Open" instead of "Team Unlocked"
- If locked: "Locked for this round"

### 8) Button/CTA clarity
- Replace ambiguous CTAs:
  - "Done Editing" -> "Save Team"
  - "Update Team" should be disabled until changes exist
- On mobile, primary CTA should be sticky in bottom bar:
  - Show label + budget remaining + validity summary if possible

### 9) Information architecture cleanup
On Team Builder page, remove or de-emphasize anything not directly supporting building a valid team:
- Season totals/performance should not occupy prime space during selection
- If you keep a tab, default to "Build", not "Performance"

## Implementation details

### Files / components to touch (expected)
Locate existing Team Builder page in `client/src/pages/` and refactor.
Create/modify components in `client/src/components/`:
- `TeamStatusPanel` (new)
- `BudgetBar` (new or refactor existing)
- `GenderSlotsIndicator` (new)
- `SelectedRidersList` (refactor)
- `BenchSelector` (refactor)
- `RiderList` (refactor to support disabled reasons)
- `StickyMobileActions` (new)

Do not add new UI frameworks. Use existing styling approach (Tailwind, etc.).

### State + computed logic
Implement computed selectors/helpers in `client/src/lib/` or within the page:
- `getBudgetState(used, cap)` -> { remaining, percent, level: green|amber|red }
- `getGenderCounts(starters)` -> { maleCount, femaleCount }
- `getTeamValidity(...)` -> { valid, issues[] }
- `getAddDisabledReason(rider, currentTeamState)` -> string | null

### Accessibility
- Proper aria labels for buttons
- Focus states
- Keyboard nav on desktop
- Tooltips should have accessible fallbacks

## Acceptance Criteria (MANDATORY)
- Desktop: clear 2-column layout, no middle performance panel
- Mobile: single-column, no cramped 3-pane view, sticky header + sticky bottom CTA
- Budget and gender constraints are immediately understandable and update live
- Rider list prevents invalid adds and explains why
- Bench behavior is clearly communicated in UI
- Save button states correct (disabled until changes, disabled if invalid, shows reasons)
- No regressions: existing team save/load still works

## QA checklist (perform)
- Start with empty team: user understands what to do
- Fill team incorrectly (too many men): UI blocks and explains
- Go over budget: UI clearly red + blocks save
- Add bench and trigger "DNS substitution explanation" visible
- Mobile viewport 375x667 and 390x844: usable, no overflow
- Tablet viewport: sensible layout (either 2-column or stacked)

## Deliverable
Implement all UI changes and ensure the page is complete and working. Continue iterating until all acceptance criteria are met.
