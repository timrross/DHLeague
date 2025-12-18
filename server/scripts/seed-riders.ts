import { loadSeedFile, resolveFromScripts, type RiderSeed, upsertRiders } from "./seed-utils";

async function main() {
  const seedFile = process.argv[2] ?? resolveFromScripts("./data/riders.sample.json");
  console.log(`Seeding riders from ${seedFile}`);

  const riders = await loadSeedFile<RiderSeed>(seedFile);
  await upsertRiders(riders);
  console.log("Finished rider seeding");
}

main().catch((error) => {
  console.error("Failed to seed riders", error);
  process.exit(1);
});
