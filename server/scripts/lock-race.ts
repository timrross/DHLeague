import { lockRace } from "../services/game/lockRace";

async function main() {
  const raceArg = process.argv.find((arg) => arg.startsWith("--raceId="));
  const force = process.argv.includes("--force") || process.argv.includes("--force=1");

  if (!raceArg) {
    console.error("Usage: tsx server/scripts/lock-race.ts --raceId=123 [--force]");
    process.exit(1);
  }

  const raceId = Number(raceArg.split("=")[1]);
  if (Number.isNaN(raceId)) {
    console.error("raceId must be a number");
    process.exit(1);
  }

  try {
    const result = await lockRace(raceId, { force });
    console.log("Race locked", result);
    process.exit(0);
  } catch (error) {
    console.error("Failed to lock race", error);
    process.exit(1);
  }
}

void main();
