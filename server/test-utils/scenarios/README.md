## Season scenario runner

This folder contains deterministic season simulation fixtures and scenarios used to validate
the DHLeague game mechanic end-to-end against Postgres.

### Run the smoke scenario

```bash
node server/scripts/runSeasonScenario.js server/test-utils/scenarios/season-smoke-3round.json
```

Outputs are written to:

```
tmp/scenario/season-smoke-3round/
```

### Reset the database

```bash
node server/scripts/dbReset.js
```

### Adding a new scenario

1. Create a scenario JSON under `server/test-utils/scenarios/`.
2. Add fixtures under `server/test-utils/scenarios/fixtures/`.
3. Provide expected outputs in `fixtures/expected/`.
4. Run the scenario and validate diffs.

Scenario fixtures are plain JSON files and should remain deterministic. If you need to control
timing, set `TEST_NOW_ISO` via the scenario runner (it does this automatically per round).
