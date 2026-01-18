Team save validation
1. OK: 6 starters, 4M/2F, bench optional -> save OK
2. FAIL: 5 starters -> reject
3. FAIL: 7 starters -> reject
4. FAIL: wrong gender split (e.g. 5M/1F) -> reject
5. FAIL: duplicate rider appears twice (including bench) -> reject
6. FAIL: over budget at save time -> reject
7. OK: valid without bench -> save OK
8. OK: post-round inflated costs cause over budget -> allowed (read-only state), but resave must respect cap for current selection rules

Substitution validation
9. OK: DNS starter + same-gender bench -> substitute
10. OK: DNF starter + same-gender bench -> substitute
11. OK: DNQ starter + same-gender bench -> substitute
12. FAIL: DSQ starter -> no substitution
13. FAIL: finisher outside top 20 -> no substitution
14. FAIL: bench wrong gender -> no substitution
15. OK: multiple eligible starters -> replace highest snapshot cost; tie-break slot index
16. OK: bench also scores 0 -> still replaces, total unchanged

Settlement validation
17. FAIL: cannot settle until EM+EW final
18. OK: settle works when EM+EW final
19. OK: settlement idempotent (second run no changes)
20. OK: resettle if results change (hash differs)

Transfers / Joker (logic validation, not REST)
21. OK: pre-round1: unlimited saves, no transfer decrement
22. OK: post-round settle: 2 transfers max per round window
23. OK: bench swap counts as transfer
24. OK: removing and re-adding same rider before save consumes 0
25. OK: joker once/season: clears roster and sets unlimited transfers until next lock
