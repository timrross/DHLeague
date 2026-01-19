import { register } from "tsx/esm/api";

register();

async function main() {
  const { resetDatabase } = await import("./dbReset.ts");
  const { pool } = await import("../db.ts");
  await resetDatabase();
  console.log("Database reset complete");
  await pool.end();
}

main().catch((error) => {
  console.error("Failed to reset database", error);
  process.exit(1);
});
