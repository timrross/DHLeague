import type { ResultStatus } from "../../services/game/config";
import type { SnapshotRider } from "../../services/game/scoring/scoreTeamSnapshot";

export const startersWithCosts: SnapshotRider[] = [
  { uciId: "m1", gender: "male", costAtLock: 200000 },
  { uciId: "m2", gender: "male", costAtLock: 190000 },
  { uciId: "m3", gender: "male", costAtLock: 180000 },
  { uciId: "m4", gender: "male", costAtLock: 170000 },
  { uciId: "f1", gender: "female", costAtLock: 160000 },
  { uciId: "f2", gender: "female", costAtLock: 150000 },
];

export const benchFemale: SnapshotRider = {
  uciId: "bf1",
  gender: "female",
  costAtLock: 140000,
};

export const benchMale: SnapshotRider = {
  uciId: "bm1",
  gender: "male",
  costAtLock: 140000,
};

export const costUpdateFixtureCases: Array<{
  status: ResultStatus;
  position: number | null;
  cost: number;
  expected: number;
}> = [
  { status: "FIN", position: 1, cost: 100000, expected: 110000 },
  { status: "FIN", position: 2, cost: 100000, expected: 109000 },
  { status: "FIN", position: 10, cost: 100000, expected: 101000 },
  { status: "FIN", position: 11, cost: 100000, expected: 100000 },
  { status: "DNF", position: null, cost: 100000, expected: 90000 },
  { status: "DNQ", position: null, cost: 100000, expected: 90000 },
  { status: "DSQ", position: null, cost: 155500, expected: 140000 },
];
