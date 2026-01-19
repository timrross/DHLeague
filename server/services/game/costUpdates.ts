import { eq, inArray } from "drizzle-orm";
import { riderCostUpdates, riders, type RaceResult } from "@shared/schema";
import { db } from "../../db";
import type { ResultStatus } from "./config";
import { now as clockNow } from "../../utils/clock";

type CostUpdateResult = {
  uciId: string;
  status: ResultStatus;
  position: number | null;
  previousCost: number;
  updatedCost: number;
  delta: number;
};

const roundUpToThousand = (value: number) => {
  const rounded = Math.round(value);
  return Math.ceil(rounded / 1000) * 1000;
};

export const calculateUpdatedCost = (
  currentCost: number,
  status: ResultStatus,
  position: number | null,
) => {
  if (status === "FIN" && position !== null && position <= 10 && position > 0) {
    const percent = 11 - position;
    const updated = roundUpToThousand(currentCost * (1 + percent / 100));
    return {
      updatedCost: updated,
      delta: updated - currentCost,
    };
  }

  if (status === "FIN") {
    return {
      updatedCost: currentCost,
      delta: 0,
    };
  }

  const updated = roundUpToThousand(currentCost * 0.9);
  return {
    updatedCost: updated,
    delta: updated - currentCost,
  };
};

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function applyRiderCostUpdates(
  tx: DbTransaction,
  raceId: number,
  resultsHash: string,
  results: Array<Pick<RaceResult, "uciId" | "status" | "position">>,
  options: { force?: boolean } = {},
) {
  const existing = await tx
    .select()
    .from(riderCostUpdates)
    .where(eq(riderCostUpdates.raceId, raceId));

  if (existing.length > 0) {
    const sameHash = existing.every(
      (entry) => entry.resultsHash === resultsHash,
    );
    if (sameHash && !options.force) {
      return { applied: false, updates: [] as CostUpdateResult[] };
    }

    if (!options.force) {
      return { applied: false, updates: [] as CostUpdateResult[] };
    }

    for (const entry of existing) {
      await tx
        .update(riders)
        .set({ cost: entry.previousCost })
        .where(eq(riders.uciId, entry.uciId));
    }

    await tx
      .delete(riderCostUpdates)
      .where(eq(riderCostUpdates.raceId, raceId));
  }

  if (results.length === 0) {
    return { applied: false, updates: [] as CostUpdateResult[] };
  }

  const uciIds = Array.from(new Set(results.map((result) => result.uciId)));
  const riderRows = await tx
    .select({ uciId: riders.uciId, cost: riders.cost })
    .from(riders)
    .where(inArray(riders.uciId, uciIds));

  const ridersByUciId = new Map(
    riderRows.map((rider) => [rider.uciId, rider.cost]),
  );

  const updates: CostUpdateResult[] = [];

  for (const result of results) {
    const currentCost = ridersByUciId.get(result.uciId);
    if (currentCost === undefined) {
      continue;
    }

    const status = result.status as ResultStatus;
    const position = result.position ?? null;
    const computed = calculateUpdatedCost(currentCost, status, position);

    updates.push({
      uciId: result.uciId,
      status,
      position,
      previousCost: currentCost,
      updatedCost: computed.updatedCost,
      delta: computed.delta,
    });
  }

  if (updates.length === 0) {
    return { applied: false, updates };
  }

  const now = clockNow();
  for (const update of updates) {
    if (update.delta !== 0) {
      await tx
        .update(riders)
        .set({ cost: update.updatedCost })
        .where(eq(riders.uciId, update.uciId));
    }
  }

  await tx.insert(riderCostUpdates).values(
    updates.map((update) => ({
      raceId,
      uciId: update.uciId,
      status: update.status,
      position: update.position,
      previousCost: update.previousCost,
      updatedCost: update.updatedCost,
      delta: update.delta,
      resultsHash,
      createdAt: now,
    })),
  );

  return { applied: true, updates };
}
