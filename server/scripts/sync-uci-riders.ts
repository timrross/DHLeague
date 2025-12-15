import { syncUciRiders } from "../../src/tasks/syncUciRiders";

async function main() {
  try {
    await syncUciRiders();
    console.log("UCI riders synced successfully");
    process.exit(0);
  } catch (error) {
    console.error("Failed to sync UCI riders", error);
    process.exit(1);
  }
}

void main();
