import { TEAM_RULES, type TeamType, type Gender } from "./config";

export type TeamStarterInput = { uciId: string; starterIndex: number };
export type TeamBenchInput = { uciId: string } | null;

export type RiderProfile = {
  uciId: string;
  gender: Gender;
  category: "elite" | "junior" | "both";
  cost: number;
};

export type TeamValidationError = {
  code: string;
  message: string;
};

const toCategory = (teamType: TeamType) => teamType.toLowerCase() as "elite" | "junior";

export function validateTeam(
  teamType: TeamType,
  starters: TeamStarterInput[],
  bench: TeamBenchInput,
  ridersByUciId: Map<string, RiderProfile>,
  budgetCap: number,
): { ok: boolean; errors: TeamValidationError[] } {
  const errors: TeamValidationError[] = [];
  const expectedTeamSize = TEAM_RULES.TEAM_SIZE;

  if (starters.length !== expectedTeamSize) {
    errors.push({
      code: "STARTER_COUNT",
      message: `Expected ${expectedTeamSize} starters, got ${starters.length}.`,
    });
  }

  const starterIndexSet = new Set<number>();
  const uciIdSet = new Set<string>();
  const genderCounts: Record<Gender, number> = { male: 0, female: 0 };
  const teamCategory = toCategory(teamType);
  let totalCost = 0;

  for (const starter of starters) {
    if (!Number.isInteger(starter.starterIndex) || starter.starterIndex < 0 || starter.starterIndex >= expectedTeamSize) {
      errors.push({
        code: "STARTER_INDEX_INVALID",
        message: `Starter index ${starter.starterIndex} is invalid; expected 0-${expectedTeamSize - 1}.`,
      });
    } else if (starterIndexSet.has(starter.starterIndex)) {
      errors.push({
        code: "STARTER_INDEX_DUPLICATE",
        message: `Duplicate starter index ${starter.starterIndex}.`,
      });
    } else {
      starterIndexSet.add(starter.starterIndex);
    }

    if (uciIdSet.has(starter.uciId)) {
      errors.push({
        code: "DUPLICATE_RIDER",
        message: `Duplicate rider ${starter.uciId} in starters.`,
      });
      continue;
    }
    uciIdSet.add(starter.uciId);

    const rider = ridersByUciId.get(starter.uciId);
    if (!rider) {
      errors.push({
        code: "RIDER_NOT_FOUND",
        message: `Rider ${starter.uciId} not found.`,
      });
      continue;
    }

    genderCounts[rider.gender] += 1;
    totalCost += rider.cost;

    if (!(rider.category === "both" || rider.category === teamCategory)) {
      errors.push({
        code: "CATEGORY_INELIGIBLE",
        message: `Rider ${starter.uciId} is not eligible for ${teamType}.`,
      });
    }
  }

  const missingIndexes = Array.from({ length: expectedTeamSize }, (_, idx) => idx).filter(
    (idx) => !starterIndexSet.has(idx),
  );
  if (missingIndexes.length > 0) {
    errors.push({
      code: "STARTER_INDEX_MISSING",
      message: `Missing starter slots: ${missingIndexes.join(", ")}.`,
    });
  }

  if (genderCounts.male !== TEAM_RULES.GENDER_SLOTS.male || genderCounts.female !== TEAM_RULES.GENDER_SLOTS.female) {
    errors.push({
      code: "GENDER_SLOTS_INVALID",
      message: `Starters must be ${TEAM_RULES.GENDER_SLOTS.male} male and ${TEAM_RULES.GENDER_SLOTS.female} female riders.`,
    });
  }

  if (bench) {
    if (uciIdSet.has(bench.uciId)) {
      errors.push({
        code: "DUPLICATE_RIDER",
        message: `Duplicate rider ${bench.uciId} across starters and bench.`,
      });
    } else {
      uciIdSet.add(bench.uciId);
    }

    const rider = ridersByUciId.get(bench.uciId);
    if (!rider) {
      errors.push({
        code: "RIDER_NOT_FOUND",
        message: `Bench rider ${bench.uciId} not found.`,
      });
    } else {
      totalCost += rider.cost;
      if (!(rider.category === "both" || rider.category === teamCategory)) {
        errors.push({
          code: "CATEGORY_INELIGIBLE",
          message: `Rider ${bench.uciId} is not eligible for ${teamType}.`,
        });
      }
    }
  }

  if (totalCost > budgetCap) {
    errors.push({
      code: "BUDGET_EXCEEDED",
      message: `Team cost ${totalCost} exceeds budget cap ${budgetCap}.`,
    });
  }

  return { ok: errors.length === 0, errors };
}
