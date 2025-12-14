import { loadSeedFile, resolveFromScripts, upsertRaces } from "./seed-utils";

async function main() {
  const seedFile = process.argv[2] ?? resolveFromScripts("./data/races.sample.json");
  console.log(`Seeding races from ${seedFile}`);

  const races = await loadSeedFile(seedFile);
  await upsertRaces(races);
  console.log("Finished race seeding");
}

main().catch((error) => {
  console.error("Failed to seed races", error);
  process.exit(1);
});
