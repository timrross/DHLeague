import path from "node:path";
import { register } from "tsx/esm/api";

const scenarioDbUrl =
  process.env.SCENARIO_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
if (!scenarioDbUrl) {
  console.error(
    "SCENARIO_DATABASE_URL (or TEST_DATABASE_URL) must be set to run scenarios.",
  );
  process.exit(1);
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === scenarioDbUrl) {
  console.warn(
    "SCENARIO_DATABASE_URL matches DATABASE_URL. Ensure this is not a live database.",
  );
}

process.env.DATABASE_URL = scenarioDbUrl;
process.env.NODE_ENV = "test";

register();

async function main() {
  const scenarioPath = process.argv[2];
  if (!scenarioPath) {
    console.error("Usage: node server/scripts/runSeasonScenario.js <scenario.json>");
    process.exit(1);
  }

  const { runScenario } = await import("./runSeasonScenario.ts");
  const { pool } = await import("../db.ts");
  await runScenario(path.resolve(process.cwd(), scenarioPath));
  console.log("Season scenario complete");
  await pool.end();
}

main().catch((error) => {
  console.error("Season scenario failed", error);
  process.exit(1);
});
