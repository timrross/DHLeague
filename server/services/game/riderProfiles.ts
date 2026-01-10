import { inArray } from "drizzle-orm";
import { riders } from "@shared/schema";
import { db } from "../../db";
import type { RiderProfile } from "./validateTeam";

const normalizeCategory = (value: string): "elite" | "junior" | "both" => {
  if (value === "both") return "both";
  return value === "junior" ? "junior" : "elite";
};

export async function fetchRiderProfiles(
  uciIds: string[],
  executor: any = db,
): Promise<Map<string, RiderProfile>> {
  if (!uciIds.length) {
    return new Map();
  }

  const rows = await executor
    .select({
      uciId: riders.uciId,
      gender: riders.gender,
      category: riders.category,
      cost: riders.cost,
    })
    .from(riders)
    .where(inArray(riders.uciId, uciIds));

  return new Map(
    rows.map((rider) => [
      rider.uciId,
      {
        uciId: rider.uciId,
        gender: rider.gender === "female" ? "female" : "male",
        category: normalizeCategory(rider.category),
        cost: rider.cost,
      },
    ]),
  );
}
