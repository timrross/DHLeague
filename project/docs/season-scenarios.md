# Season Scenario End-to-End Testing Protocol

This document describes the Season Scenario Runner, a deterministic end-to-end testing system used to validate the DHLeague game mechanic across an entire race season.

It is the authoritative protocol for how round-by-round simulation tests are authored, executed, and validated.

⸻

## Purpose

The Season Scenario Runner exists to:
	•	Validate the full game mechanic as described in docs/game-mechanic.md
	•	Simulate a real season round by round
	•	Ensure scoring, substitutions, transfers, joker usage, and cost updates behave correctly
	•	Catch regressions that unit tests cannot detect
	•	Provide auditable, human-readable output for debugging

This is not a mock system. It drives the same domain logic used in production.

⸻

## Core Principles
	•	Deterministic
Given the same inputs, the runner always produces the same outputs.
	•	Idempotent
Settlement and cost updates can be run multiple times without changing results.
	•	Production-faithful
Uses real services, validation rules, and Postgres database.
	•	Round-aware
Time, locks, and settlement windows are explicitly controlled.

⸻

## High-Level Architecture

Scenario JSON
     ↓
Scenario Runner CLI
     ↓
Fresh Postgres schema
     ↓
Seed riders / users / rounds
     ↓
For each round:
  - save teams
  - lock round
  - ingest results
  - settle
  - update costs
  - apply transfers / joker
     ↓
Audit outputs + scoreboard
     ↓
Compare to expected fixtures


⸻

## Database Strategy
	•	Uses PostgreSQL (same engine as production)
	•	Scenario runner resets the database before execution by:
	•	Dropping and recreating the public schema
	•	Re-running migrations

This ensures:
	•	No cross-test contamination
	•	Identical starting state every run

⸻

## Deterministic Time Control

All time-dependent logic flows through a single clock helper.

Clock behaviour
	•	If process.env.TEST_NOW_ISO is set:
	•	That value is used as “current time”
	•	Otherwise:
	•	System time is used

Why this matters

This allows the runner to explicitly control:
	•	Team editing windows
	•	Lock deadlines
	•	Settlement eligibility

Without mocking globals or patching Date.now().

⸻

## Scenario Fixture Format

Each scenario is described by a single JSON file.

Location

server/test-utils/scenarios/

Example

season-smoke-3round.json

Structure (simplified)

{
  "meta": {
    "name": "season-smoke-3round",
    "featureFlags": {
      "juniorTeamEnabled": false
    }
  },
  "seedData": {
    "season": { ... },
    "ridersFixture": "...",
    "users": [ ... ]
  },
  "rounds": [
    {
      "roundId": "round-001",
      "startAt": "...",
      "lockAt": "...",
      "teamsBeforeLock": { ... },
      "finalResults": { ... },
      "postRoundActions": { ... }
    }
  ],
  "assertions": {
    "expectedScoreboard": "...",
    "expectedAudit": "..."
  }
}

All paths are fixture references, not inline data.

⸻

## Round Execution Lifecycle

For each round, the runner executes the following steps in order:

1. Editing window
	•	Set clock to before lock
	•	Save user teams via real validation logic
	•	Invalid teams must be rejected

2. Locking
	•	Advance clock past lock time
	•	Trigger round lock + snapshot
	•	Only saved, valid teams are snapshotted

3. Results ingestion
	•	Ingest final race results only
	•	Elite Men + Elite Women required
	•	Junior events only if feature flag enabled

4. Settlement
	•	Attempt settlement
	•	Must block if required results missing
	•	Perform settlement
	•	Re-run settlement to confirm idempotency

5. Cost updates
	•	Apply rider cost changes based on results
	•	Use rounding and percentage rules from the spec

6. Post-round actions
	•	Apply transfers (max 2 per round after R1)
	•	Apply joker (once per season)
	•	Validate transfer consumption rules

7. Audit capture
	•	Persist round-level audit JSON:
	•	team snapshot
	•	substitution decisions
	•	rider points
	•	round total
	•	season cumulative
	•	transfers remaining
	•	joker status

⸻

## Outputs

All outputs are written to:

tmp/scenario/<scenario-name>/

Files produced
	•	scoreboard.json – final season totals
	•	rounds/<roundId>.json – per-round audit
	•	report.md – human-readable summary

⸻

## Assertions & Validation

The runner validates:
	•	Scoring correctness
	•	Substitution rules:
	•	DNS / DNF / DNQ only
	•	DSQ never substitutes
	•	Highest snapshot cost replacement
	•	Lock enforcement
	•	Transfer consumption rules
	•	Joker usage constraints
	•	Cost updates and rounding
	•	Season totals = sum of round totals

If expected fixtures are provided:
	•	Outputs are deep-compared
	•	Any mismatch fails the run with a diff

⸻

## CI Integration

A dedicated CI job runs:
	1.	Postgres service
	2.	Migrations
	3.	Unit tests
	4.	Season scenario runner

On failure:
	•	Scenario outputs are uploaded as artifacts

This ensures:
	•	Every merge validates the entire game loop

⸻

## Adding New Scenarios

To add a new scenario:
	1.	Copy an existing scenario JSON
	2.	Add or adjust round fixtures
	3.	Add expected output snapshots
	4.	Run locally
	5.	Commit fixtures + expected outputs

Scenarios are cheap and encouraged.

⸻

## Scope

This protocol tests:
	•	Game mechanic correctness
	•	End-to-end integration
	•	Temporal behaviour

It does not test:
	•	UI layout
	•	Visual rendering
	•	Performance at scale

⸻

## Source of Truth

If there is any disagreement between:
	•	code
	•	tests
	•	scenario outputs

The authoritative reference is:

docs/game-mechanic.md

All changes must preserve compatibility with that document.

⸻

This protocol is intentionally strict.
If it passes, the season logic is correct.
