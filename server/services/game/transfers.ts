export type TransferRoster<T extends string | number> = {
  starters: T[];
  benchId?: T | null;
};

export const countTransfers = <T extends string | number>(
  previous: TransferRoster<T>,
  next: TransferRoster<T>,
) => {
  const previousIds = new Set<T>(previous.starters);
  if (previous.benchId) {
    previousIds.add(previous.benchId);
  }

  const nextIds = new Set<T>(next.starters);
  if (next.benchId) {
    nextIds.add(next.benchId);
  }

  const removed = Array.from(previousIds).filter((id) => !nextIds.has(id));
  const added = Array.from(nextIds).filter((id) => !previousIds.has(id));

  return Math.max(removed.length, added.length);
};
