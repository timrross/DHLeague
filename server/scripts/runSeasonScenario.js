import path from "node:path";
import { register } from "tsx/esm/api";

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
