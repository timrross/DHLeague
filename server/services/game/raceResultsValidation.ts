import { UserFacingError } from "./errors";

const ALLOWED_RESULTS_STATUSES = new Set([
  "locked",
  "provisional",
  "final",
  "settled",
]);

export function assertRaceReadyForResults(race: {
  id: number;
  gameStatus?: string | null;
}) {
  const status = race.gameStatus ?? "scheduled";
  if (!ALLOWED_RESULTS_STATUSES.has(status)) {
    throw new UserFacingError(
      `Race ${race.id} must be locked before importing results.`,
      400,
    );
  }
}
