import { sql } from "drizzle-orm";
import { db, pool } from "../db";
import { ensureDatabaseSchema } from "../setupDatabase";
import { runMigrations } from "../migrations";
import { fileURLToPath } from "node:url";

export async function resetDatabase() {
  await db.execute(sql`DROP SCHEMA public CASCADE;`);
  await db.execute(sql`CREATE SCHEMA public;`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);

  await ensureDatabaseSchema();
  await runMigrations();
}

async function main() {
  await resetDatabase();
  console.log("Database reset complete");
  await pool.end();
}

const isDirect = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((error) => {
    console.error("Failed to reset database", error);
    process.exit(1);
  });
}
