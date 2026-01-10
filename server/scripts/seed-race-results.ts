import fs from "node:fs";
import path from "node:path";
import { upsertRaceResults } from "../services/game/races";

async function main() {
  const raceArg = process.argv.find((arg) => arg.startsWith("--raceId="));
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="));
  const isFinal = process.argv.includes("--final") || process.argv.includes("--final=1");

  if (!raceArg || !fileArg) {
    console.error(
      "Usage: tsx server/scripts/seed-race-results.ts --raceId=123 --file=results.json [--final]",
    );
    process.exit(1);
  }

  const raceId = Number(raceArg.split("=")[1]);
  if (Number.isNaN(raceId)) {
    console.error("raceId must be a number");
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg.split("=")[1]);
  const raw = fs.readFileSync(filePath, "utf-8");
  const results = JSON.parse(raw);

  if (!Array.isArray(results)) {
    console.error("results file must be a JSON array");
    process.exit(1);
  }

  try {
    const outcome = await upsertRaceResults({ raceId, results, isFinal });
    console.log("Race results upserted", outcome);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed race results", error);
    process.exit(1);
  }
}

void main();
