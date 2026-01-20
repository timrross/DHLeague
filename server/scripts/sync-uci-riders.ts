import { syncRidersFromRankings } from "../../src/integrations/uciDataride/syncRidersFromRankings";

async function main() {
  const seasonArg = process.argv.find(arg => arg.startsWith("--season="));
  const uciYearArg = process.argv.find(arg => arg.startsWith("--uci-year="));
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dry-run=true");
  const debug = process.argv.includes("--debug") || process.argv.includes("--debug=1");
  const filterByUciRidersApi = !process.argv.includes("--no-uci-filter");

  if (debug) {
    process.env.DATARIDE_DEBUG = "1";
  }

  const seasonValue = seasonArg?.split("=")[1];
  const seasonId = seasonValue === undefined || seasonValue === "latest"
    ? "latest"
    : Number(seasonValue);
  const uciSeasonValue = uciYearArg?.split("=")[1];
  const parsedUciSeasonYear = uciSeasonValue ? Number(uciSeasonValue) : undefined;
  const uciSeasonYear = Number.isFinite(parsedUciSeasonYear)
    ? parsedUciSeasonYear
    : undefined;

  try {
    const summary = await syncRidersFromRankings({
      seasonId,
      dryRun,
      filterByUciRidersApi,
      uciSeasonYear,
    });
    console.log("UCI riders synced successfully", summary);
    process.exit(0);
  } catch (error) {
    console.error("Failed to sync UCI riders", error);
    process.exit(1);
  }
}

void main();
