Below is a user-facing rules document, rewritten from the deterministic spec but expressed in plain, player-friendly language, suitable for:
	•	/docs/rules.md
	•	an in-app “How it works” page
	•	onboarding / FAQ
	•	something non-technical users can actually read

It deliberately avoids implementation language (snapshots, hashes, etc.) but remains 100% faithful to the mechanic.

⸻

DHLeague – How the Game Works

Welcome to DHLeague, a fantasy Downhill MTB league where you build a team of riders and score points based on real race results.

This page explains exactly how the game works, how scoring is calculated, and how transfers, substitutions, and budgets behave.

⸻

1. The Basics
	•	DHLeague currently covers Downhill (DHI) racing only.
	•	Each race weekend is called a Round.
	•	Each round has separate races for:
	•	Elite Men
	•	Elite Women
	•	(Junior Men & Women will be added later)

Your score comes from how your chosen riders perform in these races.

⸻

2. Your Team

Elite Team (mandatory)

Every player must build an Elite Team.

Your Elite Team must contain:
	•	6 starting riders
	•	4 men
	•	2 women
	•	Optional bench rider
	•	Can be male or female

You cannot save a team unless it has exactly 6 starters with the correct gender split.
The bench is optional.

⸻

3. Budget
	•	Elite Team budget: 2,000,000
	•	Your budget includes all selected riders, including the bench if you choose one.
	•	You cannot save a team that exceeds the budget.

Important: Rider value changes

Rider prices change over the season based on performance (see section 9).

If one of your riders increases in value:
	•	Your team may temporarily appear over budget
	•	This is allowed
	•	You cannot “cash out” the extra value to exceed the budget later

⸻

4. Rounds & Locking

Before the season starts
	•	You can make unlimited changes to your team.

Before each round
	•	Team selection locks 48 hours before the race weekend begins.
	•	Once locked, you cannot make changes for that round.

If you don’t save a team before lock:
	•	You score 0 points for that round.

⸻

5. Transfers (Team Changes)

After a round finishes
	•	Your team unlocks
	•	From Round 2 onwards, you can make up to 2 transfers per round

A transfer means:
	•	Removing a rider (starter or bench)
	•	Replacing them with a different rider
	•	Clicking Save

Bench changes count as transfers.

Undoing changes

If you remove a rider and later re-add the same rider before saving:
	•	That does not count as a transfer

⸻

6. The Joker (Wildcard)

Each player gets one Joker per season.

When you play your Joker:
	•	Your team is cleared
	•	You can make unlimited changes until the next lock
	•	After that round locks, normal transfer rules resume

The Joker can only be played:
	•	After a round has finished
	•	Before the next round locks

Use it wisely — you only get one.

⸻

7. Bench & Automatic Substitution

What the bench does

The bench protects you if one of your starters fails to finish.
	•	The bench rider is only used if needed
	•	The bench never adds extra points
	•	At most one substitution per round

When does a substitution happen?

A bench rider replaces a starter only if that starter:
	•	Did Not Start (DNS)
	•	Did Not Finish (DNF)
	•	Did Not Qualify (DNQ)

A bench does NOT replace:
	•	Riders who finished the race
	•	Riders who were Disqualified (DSQ)

Gender rule
	•	Bench rider must be the same gender as the replaced starter.

If multiple starters failed

If more than one eligible starter failed:
	•	The starter with the highest rider value is replaced.

⸻

8. Scoring

Which results count?
	•	Final race results only
	•	Qualifying does not score points

Points table (Top 20)

Finish	Points
1st	200
2nd	160
3rd	140
4th	120
5th	110
6th	100
7th	90
8th	80
9th	70
10th	60
11th	55
12th	50
13th	45
14th	40
15th	35
16th	30
17th	25
18th	20
19th	15
20th	10
21st+	0

Special cases
	•	DNS / DNF / DNQ → 0 points (eligible for sub)
	•	DSQ → 0 points (not eligible for sub)

⸻

9. Rider Price Changes

After each round, rider prices update:

Price increases

If a rider finishes Top 10:
	•	Price increases by a percentage based on position:

Position	Price Change
1st	+10%
2nd	+9%
3rd	+8%
…	…
10th	+1%

No change
	•	11th place or worse → no price change

Price drops
	•	DNS / DNF / DNQ / DSQ → −10%

All prices are rounded up to the nearest 1,000.

⸻

10. Round & Season Scores

Round score

Your round score is:
	•	Points from Elite Men
	•	Plus points from Elite Women
	•	Plus bench substitution if triggered

Season total

Your season score is the sum of all your round scores.

Once a round is finished and scored:
	•	That score is final
	•	Future team changes do not affect it

⸻

11. Junior Teams (Coming Later)

Junior teams will be introduced later behind a feature flag.

When enabled:
	•	Junior Men & Women races will score
	•	Junior teams will follow the same rules
	•	Combined scores will include Elite + Junior

For now, all scoring is Elite only.

⸻

12. Fair Play & Guarantees

DHLeague guarantees:
	•	Clear rules
	•	Automatic substitutions
	•	No manual micromanagement during races
	•	No changes after lock
	•	Fully auditable scoring

If a rule isn’t written here, it doesn’t exist.

