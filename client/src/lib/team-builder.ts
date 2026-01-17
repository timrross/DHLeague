import { Rider } from "@shared/schema";

export const TEAM_SIZE = 6;
export const MALE_SLOTS = 4;
export const FEMALE_SLOTS = 2;

export type BudgetLevel = "green" | "amber" | "red";

export type BudgetState = {
  used: number;
  cap: number;
  remaining: number;
  percent: number;
  level: BudgetLevel;
};

export type TeamIssueLevel = "error" | "warning" | "info";

export type TeamIssue = {
  level: TeamIssueLevel;
  message: string;
};

export type TeamValidity = {
  valid: boolean;
  issues: TeamIssue[];
};

export function getBudgetState(used: number, cap: number): BudgetState {
  const remaining = cap - used;
  const rawPercent = cap > 0 ? (used / cap) * 100 : 0;
  const percent = Math.max(0, Math.min(100, rawPercent));

  let level: BudgetLevel = "green";
  if (remaining < 0) {
    level = "red";
  } else if (remaining <= cap * 0.1) {
    level = "amber";
  }

  return { used, cap, remaining, percent, level };
}

export function getGenderCounts(riders: Rider[]) {
  return riders.reduce(
    (acc, rider) => {
      if (rider.gender === "male") acc.maleCount += 1;
      if (rider.gender === "female") acc.femaleCount += 1;
      return acc;
    },
    { maleCount: 0, femaleCount: 0 },
  );
}

export function getTeamValidity(params: {
  starters: Rider[];
  bench: Rider | null;
  budgetState: BudgetState;
}): TeamValidity {
  const { starters, bench, budgetState } = params;
  const issues: TeamIssue[] = [];
  const { maleCount, femaleCount } = getGenderCounts(starters);

  if (budgetState.remaining < 0) {
    issues.push({
      level: "error",
      message: `Over budget by $${Math.abs(budgetState.remaining).toLocaleString()}`,
    });
  }

  if (maleCount > MALE_SLOTS) {
    issues.push({ level: "error", message: "Too many men selected" });
  }

  if (femaleCount > FEMALE_SLOTS) {
    issues.push({ level: "error", message: "Too many women selected" });
  }

  const missingMen = Math.max(0, MALE_SLOTS - maleCount);
  const missingWomen = Math.max(0, FEMALE_SLOTS - femaleCount);

  if (missingWomen > 0) {
    issues.push({
      level: "warning",
      message: `Need ${missingWomen} more ${missingWomen === 1 ? "woman" : "women"}`,
    });
  }

  if (missingMen > 0) {
    issues.push({
      level: "warning",
      message: `Need ${missingMen} more ${missingMen === 1 ? "man" : "men"}`,
    });
  }

  if (!bench && starters.length > 0) {
    issues.push({ level: "warning", message: "Bench rider not selected" });
  }

  const valid =
    starters.length === TEAM_SIZE &&
    maleCount === MALE_SLOTS &&
    femaleCount === FEMALE_SLOTS &&
    budgetState.remaining >= 0;

  return { valid, issues };
}

export function getAddDisabledReason(params: {
  rider: Rider;
  starters: Rider[];
  bench: Rider | null;
  budgetState: BudgetState;
  mode: "starter" | "bench" | "swap";
  isSelected: boolean;
  isTeamLocked: boolean;
  swapRider?: Rider | null;
}): string | null {
  const {
    rider,
    starters,
    bench,
    budgetState,
    mode,
    isSelected,
    isTeamLocked,
    swapRider,
  } = params;

  const { maleCount, femaleCount } = getGenderCounts(starters);

  if (isTeamLocked && mode !== "swap") {
    return "Locked for this round";
  }

  if (mode === "starter") {
    if (isSelected) {
      return "Already selected";
    }
    if (starters.length >= TEAM_SIZE) {
      return "Roster full";
    }
    if (bench?.id === rider.id) {
      return "Already on bench";
    }
    if (rider.gender === "male" && maleCount >= MALE_SLOTS) {
      return "Too many men";
    }
    if (rider.gender === "female" && femaleCount >= FEMALE_SLOTS) {
      return "Too many women";
    }
    const newUsed = budgetState.used + rider.cost;
    if (newUsed > budgetState.cap) {
      return "Over budget";
    }
  }

  if (mode === "bench") {
    if (starters.some((starter) => starter.id === rider.id)) {
      return "Already a starter";
    }
    if (bench?.id === rider.id) {
      return "Already on bench";
    }
    const currentBenchCost = bench?.cost ?? 0;
    const newUsed = budgetState.used - currentBenchCost + rider.cost;
    if (newUsed > budgetState.cap) {
      return "Over budget";
    }
  }

  if (mode === "swap") {
    if (!swapRider) return null;
    if (isSelected) {
      return "Already on team";
    }
    if (rider.gender !== swapRider.gender) {
      return "Must replace with same gender";
    }
    const newUsed = budgetState.used - swapRider.cost + rider.cost;
    if (newUsed > budgetState.cap) {
      return "Over budget";
    }
  }

  return null;
}
