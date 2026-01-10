import { ensureDatabaseSchema } from "../setupDatabase";

async function main() {
  try {
    await ensureDatabaseSchema();
    console.log("Database schema ensured");
    process.exit(0);
  } catch (error) {
    console.error("Failed to ensure database schema", error);
    process.exit(1);
  }
}

void main();
