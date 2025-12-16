import { syncRidersFromRankings } from "../../src/integrations/uciDataride/syncRidersFromRankings";

async function main() {
  const seasonArg = process.argv.find(arg => arg.startsWith("--season="));
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dry-run=true");
  const debug = process.argv.includes("--debug") || process.argv.includes("--debug=1");

  if (debug) {
    process.env.DATARIDE_DEBUG = "1";
  }

  const seasonValue = seasonArg?.split("=")[1];
  const seasonId = seasonValue === undefined || seasonValue === "latest"
    ? "latest"
    : Number(seasonValue);

  try {
    const summary = await syncRidersFromRankings({ seasonId, dryRun });
    console.log("UCI riders synced successfully", summary);
    process.exit(0);
  } catch (error) {
    console.error("Failed to sync UCI riders", error);
    process.exit(1);
  }
}

void main();
