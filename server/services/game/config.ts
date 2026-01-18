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
  QUAL_BONUS_ENABLED: false,
} as const;

export const BASE_POINTS_BY_POSITION: Record<number, number> = {
  1: 200,
  2: 160,
  3: 140,
  4: 120,
  5: 110,
  6: 100,
  7: 90,
  8: 80,
  9: 70,
  10: 60,
  11: 55,
  12: 50,
  13: 45,
  14: 40,
  15: 35,
  16: 30,
  17: 25,
  18: 20,
  19: 15,
  20: 10,
};

export const QUAL_BONUS_BY_POSITION: Record<number, number> = {};

export const DISCIPLINES = ["DHI"] as const;
export const CATEGORIES = ["ELITE", "JUNIOR"] as const;

export type Discipline = (typeof DISCIPLINES)[number];
export type Category = (typeof CATEGORIES)[number];
export type TeamType = Category;
export type Gender = "male" | "female";
export type ResultStatus = "FIN" | "DNF" | "DNS" | "DNQ" | "DSQ";
