import {
  resolveFromScripts,
  type RiderSeed,
  type RaceSeed,
  upsertRaces,
  upsertRiders,
  loadSeedFile,
} from "./seed-utils";

async function main() {
  const ridersFile = process.argv[2] ?? resolveFromScripts("./data/riders.sample.json");
  const racesFile = process.argv[3] ?? resolveFromScripts("./data/races.sample.json");

  console.log(`Seeding riders from ${ridersFile}`);
  const riders = await loadSeedFile<RiderSeed>(ridersFile);
  await upsertRiders(riders);

  console.log(`Seeding races from ${racesFile}`);
  const races = await loadSeedFile<RaceSeed>(racesFile);
  await upsertRaces(races);

  console.log("Seeding complete");
}

main().catch((error) => {
  console.error("Failed to seed data", error);
  process.exit(1);
});
