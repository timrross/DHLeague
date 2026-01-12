import axios from "axios";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { raceResults, races, riders } from "@shared/schema";
import type { Gender, ResultStatus } from "./config";
import {
  matchUciResultsToRiders,
  type ParsedUciResult,
  type RiderIdentityRow,
} from "./uciResultsMatch";

type UciResultEntry = {
  headerType?: string;
  values?: {
    firstname?: string;
    lastname?: string;
    result?: string;
    rank?: string | number;
  };
};

export type ImportUciRaceResultsInput = {
  raceId: number;
  sourceUrl: string;
  gender: Gender;
  category: "elite" | "junior";
  discipline?: string;
  isFinal?: boolean;
};

export type ImportUciRaceResultsResult = {
  raceId: number;
  updated: number;
  total: number;
  missing: number;
  ambiguous: number;
  missingNames: string[];
  ambiguousNames: Array<{ name: string; matches: string[] }>;
  sourceUrl: string;
};

const ALLOWED_UCI_HOSTS = new Set(["www.uci.org", "uci.org"]);

const parseResultStatus = (value: string): ResultStatus => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "DNF") return "DNF";
  if (normalized === "DNS") return "DNS";
  if (normalized === "DSQ" || normalized === "DQ") return "DSQ";
  if (!normalized) return "DNS";
  return "FIN";
};

const parsePosition = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const ensureAllowedUrl = (sourceUrl: string) => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new Error("Invalid results URL");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error("Results URL must use https");
  }

  if (!ALLOWED_UCI_HOSTS.has(parsedUrl.hostname)) {
    throw new Error("Results URL must be hosted on uci.org");
  }

  if (!parsedUrl.pathname.startsWith("/api/calendar/results/")) {
    throw new Error("Results URL must target the UCI results endpoint");
  }

  return parsedUrl;
};

const extractRiderEntries = (data: unknown) => {
  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  const results = Array.isArray((parsed as { results?: unknown }).results)
    ? (parsed as { results: unknown[] }).results
    : [];

  return results.filter(
    (entry): entry is UciResultEntry =>
      typeof entry === "object" && entry !== null,
  );
};

export async function importUciRaceResults(
  input: ImportUciRaceResultsInput,
): Promise<ImportUciRaceResultsResult> {
  const { raceId, sourceUrl, gender, category, isFinal = false } = input;
  const parsedUrl = ensureAllowedUrl(sourceUrl);

  const response = await axios.get(parsedUrl.toString(), {
    headers: { Accept: "application/json" },
  });

  const entries = extractRiderEntries(response.data).filter(
    (entry) => entry.headerType === "rider",
  );

  const parsedResults: ParsedUciResult[] = entries
    .map((entry) => {
      const values = entry.values ?? {};
      const firstName = String(values.firstname ?? "").trim();
      const lastName = String(values.lastname ?? "").trim();

      if (!firstName || !lastName) {
        return null;
      }

      return {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        status: parseResultStatus(String(values.result ?? "")),
        position: parsePosition(values.rank),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry);

  const riderRows: RiderIdentityRow[] = await db
    .select({
      uciId: riders.uciId,
      firstName: riders.firstName,
      lastName: riders.lastName,
      name: riders.name,
    })
    .from(riders)
    .where(and(eq(riders.gender, gender), eq(riders.category, category)));

  const { results, missingNames, ambiguousNames } = matchUciResultsToRiders(
    parsedResults,
    riderRows,
  );

  return await db.transaction(async (tx) => {
    const [race] = await tx.select().from(races).where(eq(races.id, raceId));
    if (!race) {
      throw new Error(`Race ${raceId} not found`);
    }

    if (riderRows.length > 0) {
      await tx
        .delete(raceResults)
        .where(
          and(
            eq(raceResults.raceId, raceId),
            inArray(
              raceResults.uciId,
              riderRows.map((rider) => rider.uciId),
            ),
          ),
        );
    }

    const now = new Date();
    for (const result of results) {
      await tx
        .insert(raceResults)
        .values({
          raceId,
          uciId: result.uciId,
          status: result.status,
          position: result.position,
          qualificationPosition: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [raceResults.raceId, raceResults.uciId],
          set: {
            status: result.status,
            position: result.position,
            qualificationPosition: null,
            updatedAt: now,
          },
        });
    }

    const nextStatus = isFinal ? "final" : "provisional";
    await tx
      .update(races)
      .set({
        gameStatus: nextStatus,
        needsResettle: race.gameStatus === "settled" ? true : race.needsResettle,
      })
      .where(eq(races.id, raceId));

    return {
      raceId,
      updated: results.length,
      total: parsedResults.length,
      missing: missingNames.size,
      ambiguous: ambiguousNames.size,
      missingNames: Array.from(missingNames),
      ambiguousNames: Array.from(ambiguousNames.entries()).map(
        ([name, matches]) => ({
          name,
          matches,
        }),
      ),
      sourceUrl,
    };
  });
}
