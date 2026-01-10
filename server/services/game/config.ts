export const GAME_VERSION = "v1" as const;

export const TEAM_RULES = {
  TEAM_SIZE: 6,
  BENCH_SIZE: 1,
  GENDER_SLOTS: { male: 4, female: 2 },
  AUTO_SUB_ENABLED: true,
} as const;

export const BUDGETS = {
  ELITE: 2_000_000,
  JUNIOR: 500_000,
} as const;

export const SCORING = {
  DSQ_PENALTY: -10,
  QUAL_BONUS_ENABLED: true,
} as const;

export const BASE_POINTS_BY_POSITION: Record<number, number> = {
  1: 100,
  2: 80,
  3: 70,
  4: 60,
  5: 55,
  6: 50,
  7: 45,
  8: 40,
  9: 35,
  10: 30,
  11: 25,
  12: 22,
  13: 20,
  14: 18,
  15: 16,
  16: 15,
  17: 14,
  18: 13,
  19: 12,
  20: 11,
  21: 10,
  22: 9,
  23: 8,
  24: 7,
  25: 6,
  26: 5,
  27: 4,
  28: 3,
  29: 2,
  30: 1,
};

export const QUAL_BONUS_BY_POSITION: Record<number, number> = {
  1: 10,
  2: 8,
  3: 6,
  4: 3,
  5: 3,
  6: 3,
  7: 3,
  8: 3,
  9: 3,
  10: 3,
  11: 1,
  12: 1,
  13: 1,
  14: 1,
  15: 1,
  16: 1,
  17: 1,
  18: 1,
  19: 1,
  20: 1,
};

export const DISCIPLINES = ["DHI", "XCO"] as const;
export const CATEGORIES = ["ELITE", "JUNIOR"] as const;

export type Discipline = (typeof DISCIPLINES)[number];
export type Category = (typeof CATEGORIES)[number];
export type TeamType = Category;
export type Gender = "male" | "female";
export type ResultStatus = "FIN" | "DNF" | "DNS" | "DSQ";
