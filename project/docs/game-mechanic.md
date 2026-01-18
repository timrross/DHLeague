Below is the complete, final, deterministic game-mechanic.md, incorporating all decisions and the final DSQ rule.
You can copy this verbatim into the repo.

⸻

DHLeague – Game Mechanic (Deterministic Spec)

Discipline: Downhill (DHI)
Version: 1.0 (Authoritative)
Junior Team: Feature-flagged (FEATURE_JUNIOR_TEAM_ENABLED), currently OFF

This document is the single source of truth for scoring, transfers, locking, substitution, and rider cost logic.
Any implementation must conform to this specification.

⸻

1. Core Concepts

1.1 Season

A season consists of an ordered sequence of Rounds.
User scores accumulate across rounds to produce a season total.

⸻

1.2 Round

A Round represents a race weekend.

Each round contains the following events:
	•	Elite Men (EM)
	•	Elite Women (EW)
	•	Junior Men (JM) (only when Junior feature enabled)
	•	Junior Women (JW) (only when Junior feature enabled)

Each event produces a final race result used for scoring.

A round can only be settled once all required events have final results.

⸻

1.3 Rider Identity
	•	Riders are uniquely identified by UCI ID (uciId).
	•	Internal database IDs may exist but scoring and snapshots are keyed by uciId.

⸻

2. Teams

2.1 Team Types

Each user may have:
	•	Elite Team (mandatory)
	•	Junior Team (optional, feature-flagged)

When the Junior feature is disabled:
	•	Users cannot create Junior teams
	•	Junior points are not calculated
	•	Combined score equals Elite score only

⸻

2.2 Team Composition

A valid saved team must have:

Starters
	•	Exactly 6 riders
	•	Exactly 4 men
	•	Exactly 2 women

Bench
	•	Optional
	•	At most 1 rider
	•	Can be male or female

A team cannot be saved unless it is valid.
Bench may be empty.

⸻

3. Budgets & Rider Costs

3.1 Budget Caps
	•	Elite Team: 2,000,000
	•	Junior Team: 500,000 (when enabled)

Budget applies to:
	•	Starters + Bench (if present)

A team cannot be saved if it exceeds the budget cap.

⸻

3.2 Cost Snapshots

At round lock time, the system snapshots:
	•	Team roster
	•	Rider costs at that moment (snapshot cost)

Snapshot costs are immutable for that round and used for:
	•	Bench substitution priority
	•	Auditing and resettlement

⸻

3.3 Over-Budget via Cost Inflation

After a round settles, rider costs may increase, causing an already-locked team to exceed budget.

This is allowed.

Rules:
	•	Users cannot exploit inflated values to exceed the cap when rebuilding
	•	Effective free budget is always capped at the team budget
	•	Selling an inflated rider removes the inflated value

⸻

4. Editing, Locks & Transfers

4.1 Round Locking

Each round has:
	•	startAt (official race weekend start)
	•	lockAt = startAt - 48 hours

The lock time is stored in the database.

Admins may apply a manual early lock.

⸻

4.2 Pre-Season / Before Round 1
	•	Unlimited changes allowed
	•	Applies until Round 1 lockAt

⸻

4.3 Post-Round Editing

After a round is settled, editing unlocks for the next round.

From Round 2 onward:
	•	Users receive 2 transfers per round

⸻

4.4 Transfer Definition & Accounting

A transfer is:

Removing a rider from the team (starter or bench) and replacing them with a different rider, then clicking Save.

Rules:
	•	Bench changes count as transfers
	•	Transfers are consumed on Save
	•	Team must be valid on Save

Revert rule
	•	If a rider is removed and later re-added so the saved team is unchanged compared to the previous save, no transfer is consumed

Transfer count is based on the difference between the last saved roster and the newly saved roster.

⸻

4.5 Joker (Wildcard)

Each user has exactly one Joker per season.

Joker rules:
	•	Can be played only after a round has settled and before the next lock
	•	When played:
	•	Team is cleared
	•	User may make unlimited changes until the next lock
	•	After the next round locks, normal transfer rules resume (2 transfers)

If the user fails to save a valid team before lock, they score 0 for that round.

⸻

5. Scoring

5.1 Scoring Basis
	•	Finals race results only
	•	Qualifying results are ignored

Each rider scores points from their own event:
	•	Elite Men → EM results
	•	Elite Women → EW results
	•	Junior equivalents when enabled

⸻

5.2 Points Table (Top 20)

Position	Points
1	200
2	160
3	140
4	120
5	110
6	100
7	90
8	80
9	70
10	60
11	55
12	50
13	45
14	40
15	35
16	30
17	25
18	20
19	15
20	10
>20	0


⸻

5.3 Non-Finishing Statuses

Status	Points	Eligible for Sub
DNS	0	✅
DNF	0	✅
DNQ	0	✅
DSQ	0	❌


⸻

6. Bench Substitution (Final Rule)

Bench substitution is automatic and occurs at settlement.

6.1 Eligibility

A bench substitution occurs only if:
	1.	A bench rider exists
	2.	A starter of the same gender has status DNS, DNF, or DNQ
	3.	The starter is not DSQ
	4.	At most one substitution per team per round

Finishers are never substituted, even if they score 0 due to placing outside the top 20.

⸻

6.2 Substitution Selection

If multiple starters are eligible:
	1.	Select the starter with the highest snapshot cost
	2.	Tie-break using lowest starter slot index

⸻

6.3 Substitution Effect
	•	The selected starter’s points are replaced by the bench rider’s points
	•	Bench rider points are calculated normally from their own event
	•	Bench never adds extra points; it only replaces one starter

⸻

7. Round Scores

7.1 Elite Team Score

Elite round score =
	•	Sum of Elite Men starter points
	•	Sum of Elite Women starter points
	•	Apply bench substitution if eligible

⸻

7.2 Junior Team Score

When enabled and present:
	•	Calculated identically using Junior Men + Junior Women events

⸻

7.3 User Round Total

User round score =
	•	Elite score
	•		•	Junior score (if enabled and roster exists)

⸻

7.4 Season Total

Season total =
	•	Sum of all settled round totals

⸻

8. Settlement Rules

8.1 Snapshots

At lock time, snapshot:
	•	Starters
	•	Bench
	•	Snapshot costs
	•	Snapshot hash

Users without a saved valid team produce no snapshot and score 0.

⸻

8.2 Blocking Settlement

A round cannot be settled until:
	•	Elite Men and Elite Women finals are final
	•	Junior Men and Junior Women finals are final (if junior enabled)

⸻

8.3 Idempotency

Settlement must be repeatable:
	•	Use snapshot hash + results hash
	•	If unchanged, settlement is a no-op
	•	If changed, overwrite round scores

⸻

9. Rider Cost Updates

9.1 Timing

Applied after round settlement.

⸻

9.2 Update Rules

Based on final race position:
	•	Top 10 finishers:
	•	Increase cost by (11 - finishing position)%
	•	Example:
	•	1st: +10%
	•	2nd: +9%
	•	10th: +1%
	•	11th or worse: no change
	•	DNS / DNF / DNQ: −10%
	•	DSQ: treated as 0 → −10%

After applying change:
	•	Round up to nearest 1,000

⸻

9.3 Isolation

Cost updates:
	•	Do not affect locked snapshots
	•	Do not affect substitution priority for past rounds

⸻

10. Validation & Failure Modes
	•	Invalid teams cannot be saved
	•	Users with no saved team at lock score 0
	•	Over-budget due to inflation is allowed but not exploitable
	•	All scoring is deterministic and auditable

⸻

11. Design Guarantees

This mechanic guarantees:
	•	Deterministic scoring
	•	Idempotent settlement
	•	No ambiguous substitution
	•	Fair cost evolution
	•	Safe future extension (qualifier bonuses, split times, etc.)

⸻

End of specification.

