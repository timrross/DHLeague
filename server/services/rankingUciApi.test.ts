import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import axios from "axios";

import { type Rider } from "../../shared/schema";
import { generateRiderId } from "../../shared/utils";
import { rankingUciApiService } from "./rankingUciApi";

describe("RankingUciApiService", () => {
  const originalPost = axios.post;

  const createRider = (id: number, name: string, gender: "male" | "female"): Rider => {
    const [firstName, lastName] = name.split(" ");
    const riderId = generateRiderId(name);

    return {
      id,
      riderId,
      uciId: riderId,
      name,
      firstName,
      lastName,
      gender,
      team: "Initial Team",
      cost: 0,
      lastYearStanding: 0,
      image: "",
      country: "",
      points: 0,
      form: "[]",
      injured: false,
      datarideObjectId: null,
      datarideTeamCode: null,
    };
  };

  beforeEach(() => {
    (axios as any).post = originalPost;
  });

  afterEach(() => {
    (axios as any).post = originalPost;
  });

  it("returns gendered updates for riders present in the map", async () => {
    const requests: { url: string; body: string }[] = [];

    (axios as any).post = async (url: string, body: unknown) => {
      const capturedBody = typeof body === "string" ? body : JSON.stringify(body);
      requests.push({ url, body: capturedBody });

      if (requests.length === 1) {
        return {
          data: {
            data: [
              {
                IndividualFullName: "John Doe",
                TeamName: "Updated Team",
                NationFullName: "USA",
                Points: 123.6,
                Rank: 7,
              },
            ],
          },
        };
      }

      return {
        data: {
          data: [
            {
              IndividualFullName: "Jane Roe",
              TeamName: "Roe Racing",
              NationFullName: "Canada",
              Points: 88.4,
              Rank: 3,
            },
          ],
        },
      };
    };

    const existingRiders = new Map<string, Rider>([
      [generateRiderId("John Doe"), createRider(1, "John Doe", "male")],
      [generateRiderId("Jane Roe"), createRider(2, "Jane Roe", "female")],
    ]);

    const updates = await rankingUciApiService.getRiderUpdates(existingRiders);

    assert.equal(requests.length, 2);

    assert.deepStrictEqual(updates, [
      {
        id: 1,
        gender: "male",
        team: "Updated Team",
        country: "USA",
        points: 124,
        lastYearStanding: 7,
      },
      {
        id: 2,
        gender: "female",
        team: "Roe Racing",
        country: "Canada",
        points: 88,
        lastYearStanding: 3,
      },
    ]);
  });

  it("surfaces failures from the UCI API", async () => {
    (axios as any).post = async () => {
      throw new Error("network down");
    };

    const existingRiders = new Map<string, Rider>([
      [generateRiderId("John Doe"), createRider(1, "John Doe", "male")],
    ]);

    await assert.rejects(
      rankingUciApiService.getRiderUpdates(existingRiders),
      /network down/,
    );
  });
});
