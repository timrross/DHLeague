import { syncRidersFromRankings } from "../../src/integrations/uciDataride/syncRidersFromRankings";
import { activateTopRiders } from "./activate-top-riders";

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
    const summary = await syncRidersFromRankings({
      seasonId,
      dryRun,
    });
    console.log("UCI riders synced successfully", summary);

    const activationSummary = await activateTopRiders({ dryRun });
    console.log("Top riders activation complete", activationSummary);
    process.exit(0);
  } catch (error) {
    console.error("Failed to sync UCI riders", error);
    process.exit(1);
  }
}

// Only run main() when executed directly via tsx/node, not when bundled
const isScript = process.argv[1]?.includes("sync-uci-riders");

if (isScript) {
  void main();
}
