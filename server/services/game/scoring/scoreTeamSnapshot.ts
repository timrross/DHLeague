import {
  BASE_POINTS_BY_POSITION,
  QUAL_BONUS_BY_POSITION,
  SCORING,
  TEAM_RULES,
  type Gender,
  type ResultStatus,
} from "../config";

export type RaceResultInput = {
  uciId: string;
  status: ResultStatus;
  position?: number | null;
  qualificationPosition?: number | null;
};

export type SnapshotRider = {
  uciId: string;
  gender: Gender;
  costAtLock?: number | null;
};

export type TeamSnapshotInput = {
  starters: SnapshotRider[];
  bench: SnapshotRider | null;
};

export type RiderBreakdown = {
  slotIndex: number | null;
  uciId: string;
  gender: Gender;
  status: ResultStatus;
  position: number | null;
  basePoints: number;
  qualBonus: number;
  penalties: number;
  finalPoints: number;
};

export type SubstitutionBreakdown = {
  applied: boolean;
  benchUciId: string | null;
  replacedStarterIndex: number | null;
  reason:
    | "AUTO_SUB_SAME_GENDER"
    | "NO_VALID_SUB"
    | "NO_BENCH"
    | "NO_ELIGIBLE_STARTER";
};

export type TeamScoreBreakdown = {
  starters: RiderBreakdown[];
  bench: RiderBreakdown | null;
  substitution: SubstitutionBreakdown;
};

export type TeamScoreOutput = {
  totalPoints: number;
  breakdown: TeamScoreBreakdown;
};

const getBasePoints = (position?: number | null): number => {
  if (!position) return 0;
  return BASE_POINTS_BY_POSITION[position] ?? 0;
};

const getQualBonus = (position?: number | null): number => {
  if (!position) return 0;
  return QUAL_BONUS_BY_POSITION[position] ?? 0;
};

const resolveStatus = (result?: RaceResultInput): ResultStatus => {
  return result?.status ?? "DNS";
};

export const scoreRiderResult = (
  result: RaceResultInput | undefined,
) => {
  const status = resolveStatus(result);
  const position = result?.position ?? null;
  let basePoints = 0;
  let qualBonus = 0;
  let penalties = 0;
  let finalPoints = 0;

  if (status === "FIN") {
    basePoints = getBasePoints(position);
    qualBonus = SCORING.QUAL_BONUS_ENABLED
      ? getQualBonus(result?.qualificationPosition ?? null)
      : 0;
    finalPoints = basePoints + qualBonus;
  }

  return {
    status,
    position,
    basePoints,
    qualBonus,
    penalties,
    finalPoints,
  };
};

const buildRiderBreakdown = (
  rider: SnapshotRider,
  slotIndex: number | null,
  result: RaceResultInput | undefined,
): RiderBreakdown => {
  const scored = scoreRiderResult(result);

  return {
    slotIndex,
    uciId: rider.uciId,
    gender: rider.gender,
    status: scored.status,
    position: scored.position,
    basePoints: scored.basePoints,
    qualBonus: scored.qualBonus,
    penalties: scored.penalties,
    finalPoints: scored.finalPoints,
  };
};

export function scoreTeamSnapshot(
  snapshot: TeamSnapshotInput,
  resultsByUciId: Map<string, RaceResultInput>,
): TeamScoreOutput {
  const starters: RiderBreakdown[] = snapshot.starters.map((starter, index) =>
    buildRiderBreakdown(starter, index, resultsByUciId.get(starter.uciId)),
  );

  const bench = snapshot.bench
    ? buildRiderBreakdown(
        snapshot.bench,
        null,
        resultsByUciId.get(snapshot.bench.uciId),
      )
    : null;

  let substitution: SubstitutionBreakdown = {
    applied: false,
    benchUciId: snapshot.bench?.uciId ?? null,
    replacedStarterIndex: null,
    reason: "NO_BENCH",
  };

  if (!TEAM_RULES.AUTO_SUB_ENABLED) {
    substitution = {
      ...substitution,
      reason: "NO_VALID_SUB",
    };
  } else if (!snapshot.bench) {
    substitution = {
      ...substitution,
      reason: "NO_BENCH",
    };
  } else {
    const eligibleStatuses: ResultStatus[] = ["DNS", "DNF", "DNQ"];
    const eligibleStarters = starters
      .map((starter, index) => ({
        starter,
        index,
        costAtLock: snapshot.starters[index]?.costAtLock ?? 0,
      }))
      .filter(
        ({ starter }) =>
          eligibleStatuses.includes(starter.status) &&
          starter.gender === snapshot.bench?.gender,
      );

    if (eligibleStarters.length === 0) {
      const hasEligibleStatus = starters.some((starter) =>
        eligibleStatuses.includes(starter.status),
      );
      substitution = {
        ...substitution,
        reason: hasEligibleStatus ? "NO_VALID_SUB" : "NO_ELIGIBLE_STARTER",
      };
    } else {
      const replaced = eligibleStarters.sort((a, b) => {
        if (b.costAtLock !== a.costAtLock) {
          return b.costAtLock - a.costAtLock;
        }
        return a.index - b.index;
      })[0];
      const replacedIndex = replaced.index;
      const benchPoints = bench?.finalPoints ?? 0;
      starters[replacedIndex] = {
        ...starters[replacedIndex],
        finalPoints: benchPoints,
      };
      substitution = {
        applied: true,
        benchUciId: snapshot.bench.uciId,
        replacedStarterIndex: replacedIndex,
        reason: "AUTO_SUB_SAME_GENDER",
      };
    }
  }

  const totalPoints = starters
    .slice(0, TEAM_RULES.TEAM_SIZE)
    .reduce((sum, rider) => sum + rider.finalPoints, 0);

  return {
    totalPoints,
    breakdown: {
      starters,
      bench,
      substitution,
    },
  };
}
