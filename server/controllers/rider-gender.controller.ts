import { Request, Response } from "express";
import { storage } from "../storage";
import { eq, or, ilike } from "drizzle-orm";
import { db } from "../db";
import { riders } from "@shared/schema";

/**
 * Update rider genders
 */
export async function updateRiderGenders(req: Request, res: Response) {
  return updateRiderGendersFromUci(req, res);
}

/**
 * Update female rider genders from UCI API
 * This endpoint fetches the UCI women's elite downhill riders list and updates our database
 */
export async function updateRiderGendersFromUci(req: Request, res: Response) {
  try {
    console.log("Fetching women riders from UCI API...");

    // Fetch UCI data - using the exact fetch request provided
    const response = await fetch(
      "https://dataride.uci.ch/iframe/ObjectRankings/",
      {
        method: "POST",
        headers: {
          accept: "application/json, text/javascript, */*; q=0.01",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,de;q=0.7",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: "rankingId=156&disciplineId=7&rankingTypeId=1&take=40&skip=0&page=1&pageSize=40&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=23&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445&filter%5Bfilters%5D%5B3%5D%5Bfield%5D=MomentId&filter%5Bfilters%5D%5B3%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B4%5D%5Bfield%5D=CountryId&filter%5Bfilters%5D%5B4%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B5%5D%5Bfield%5D=IndividualName&filter%5Bfilters%5D%5B5%5D%5Bvalue%5D=&filter%5Bfilters%5D%5B6%5D%5Bfield%5D=TeamName&filter%5Bfilters%5D%5B6%5D%5Bvalue%5D=",
      },
    );

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch data from UCI API: ${response.status}`,
      });
    }

    const data = await response.json();

    if (!data || !data.data || !Array.isArray(data.data)) {
      return res.status(500).json({
        success: false,
        message: "Invalid data format received from UCI API",
      });
    }

    console.log(`Retrieved ${data.data.length} women riders from UCI API`);

    // Results tracking
    const results = {
      total: data.data.length,
      updated: 0,
      notFound: 0,
      updatedRiders: [] as { name: string; id: number }[],
    };

    // Process each UCI rider
    for (const uciRider of data.data) {
      if (!uciRider.DisplayName) continue;

      // UCI API format: "LASTNAME Firstname"
      const displayName = uciRider.DisplayName;
      const parts = displayName.split(" ");

      if (parts.length < 2) continue;

      const lastName = parts[0];
      const firstName = parts.slice(1).join(" ");

      // Try to find matching riders in the database - now using firstName and lastName columns too
      const dbRiders = await db
        .select()
        .from(riders)
        .where(
          or(
            ilike(riders.name, `%${firstName}%${lastName}%`),
            ilike(riders.name, `%${lastName}%${firstName}%`),
            ilike(riders.firstName, `%${firstName}%`),
            ilike(riders.lastName, `%${lastName}%`)
          ),
        );

      if (dbRiders.length > 0) {
        // Update all potential matches
        for (const rider of dbRiders) {
          await db
            .update(riders)
            .set({ 
              gender: "female",
              firstName: firstName,
              lastName: lastName 
            })
            .where(eq(riders.id, rider.id));

          results.updated++;
          results.updatedRiders.push({
            name: rider.name,
            id: rider.id,
            firstName,
            lastName
          });

          console.log(
            `Updated rider ${rider.name} (ID: ${rider.id}) to female`,
          );
        }
      } else {
        results.notFound++;
        console.log(`No match found for UCI rider: ${displayName}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated ${results.updated} riders to female gender`,
      results,
    });
  } catch (error) {
    console.error("Error updating rider genders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update rider genders",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
