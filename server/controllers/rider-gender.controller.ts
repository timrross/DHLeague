import { Request, Response } from "express";
import { storage } from "../storage";
import { eq, or, ilike } from "drizzle-orm";
import { db } from "../db";
import { riders } from "@shared/schema";

interface UciRiderData {
  DisplayName: string;
  NationName?: string;
  TeamName?: string;
}

/**
 * Update rider genders based on UCI data
 */
export async function updateRiderGenders(req: Request, res: Response) {
  try {
    // Get category from request, default to women's elite
    const category = req.query.category as string || 'female';
    
    // Fetch the appropriate UCI riders based on category
    let riderData: UciRiderData[] = [];
    let gender = 'female'; // Default gender to update
    
    if (category === 'female' || category === 'women') {
      riderData = await fetchUciWomenRiders();
      gender = 'female';
    } else if (category === 'male' || category === 'men') {
      riderData = await fetchUciMenRiders();
      gender = 'male';
    } else {
      return res.status(400).json({ 
        message: "Invalid category. Use 'female'/'women' or 'male'/'men'."
      });
    }
    
    if (!riderData.length) {
      return res.status(500).json({ 
        message: "No riders fetched from UCI API"
      });
    }
    
    const results = {
      category,
      gender,
      total: riderData.length,
      updated: 0,
      notFound: 0,
      errors: 0,
      matchingRiders: [] as string[]
    };
    
    // Process each UCI rider
    for (const uciRider of riderData) {
      try {
        if (!uciRider.DisplayName) {
          results.errors++;
          continue;
        }
        
        const displayName = uciRider.DisplayName;
        const parts = displayName.split(' ');
        
        if (parts.length < 2) {
          results.errors++;
          continue;
        }
        
        const lastName = parts[0];
        const firstName = parts.slice(1).join(' ');
        
        // Try to find matching riders in the database
        const dbRiders = await db
          .select()
          .from(riders)
          .where(
            or(
              ilike(riders.name, `%${firstName}%${lastName}%`),
              ilike(riders.name, `%${lastName}%${firstName}%`),
              ilike(riders.name, `%${displayName}%`)
            )
          );
        
        if (dbRiders.length > 0) {
          // Update all potential matches
          for (const rider of dbRiders) {
            await db
              .update(riders)
              .set({ gender })
              .where(eq(riders.id, rider.id));
            
            results.updated++;
            results.matchingRiders.push(`${rider.name} (ID: ${rider.id})`);
          }
        } else {
          results.notFound++;
        }
      } catch (error) {
        console.error(`Error processing rider ${uciRider.DisplayName}:`, error);
        results.errors++;
      }
    }
    
    res.status(200).json({
      message: `Rider genders updated successfully to "${gender}"`,
      results
    });
  } catch (error) {
    console.error("Error updating rider genders:", error);
    res.status(500).json({ 
      message: "Failed to update rider genders",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Update rider gender directly from UCI API
 */
export async function updateRiderGendersFromUci(req: Request, res: Response) {
  try {
    const gender = (req.query.gender as string || 'female').toLowerCase();
    const riderData = gender === 'female' || gender === 'women' 
      ? await fetchUciWomenRiders()
      : await fetchUciMenRiders();
    
    if (!riderData.length) {
      return res.status(500).json({ 
        message: "No riders fetched from UCI API"
      });
    }
    
    const results = {
      gender,
      total: riderData.length,
      updated: 0,
      notFound: 0,
      errors: 0,
      matchingRiders: [] as string[]
    };
    
    // Process each UCI rider
    for (const uciRider of riderData) {
      try {
        if (!uciRider.DisplayName) {
          results.errors++;
          continue;
        }
        
        const displayName = uciRider.DisplayName;
        const parts = displayName.split(' ');
        
        if (parts.length < 2) {
          results.errors++;
          continue;
        }
        
        const lastName = parts[0];
        const firstName = parts.slice(1).join(' ');
        
        // Try to find matching riders in the database
        const dbRiders = await db
          .select()
          .from(riders)
          .where(
            or(
              ilike(riders.name, `%${firstName}%${lastName}%`),
              ilike(riders.name, `%${lastName}%${firstName}%`),
              ilike(riders.name, `%${displayName}%`)
            )
          );
        
        if (dbRiders.length > 0) {
          // Update all potential matches
          for (const rider of dbRiders) {
            await db
              .update(riders)
              .set({ gender })
              .where(eq(riders.id, rider.id));
            
            results.updated++;
            results.matchingRiders.push(`${rider.name} (ID: ${rider.id})`);
          }
        } else {
          results.notFound++;
        }
      } catch (error) {
        console.error(`Error processing rider ${uciRider.DisplayName}:`, error);
        results.errors++;
      }
    }
    
    res.status(200).json({
      message: `Rider genders updated from UCI API successfully to "${gender}"`,
      results
    });
  } catch (error) {
    console.error("Error updating rider genders from UCI API:", error);
    res.status(500).json({ 
      message: "Failed to update rider genders from UCI API",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Fetch UCI Women's Elite riders for downhill
 */
async function fetchUciWomenRiders(): Promise<UciRiderData[]> {
  try {
    // UCI API request parameters for women's elite riders in downhill
    const response = await fetch("https://dataride.uci.ch/iframe/ObjectRankings/", {
      method: "POST",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: "rankingId=156&disciplineId=7&rankingTypeId=1&take=100&skip=0&page=1&pageSize=100&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=23&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445"
    });

    if (!response.ok) {
      console.error(`Failed to fetch data from UCI API: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error("Invalid data format received from UCI API");
      return [];
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching UCI women riders:", error);
    return [];
  }
}

/**
 * Fetch UCI Men's Elite riders for downhill
 */
async function fetchUciMenRiders(): Promise<UciRiderData[]> {
  try {
    // UCI API request parameters for men's elite riders in downhill
    const response = await fetch("https://dataride.uci.ch/iframe/ObjectRankings/", {
      method: "POST",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: "rankingId=156&disciplineId=7&rankingTypeId=1&take=100&skip=0&page=1&pageSize=100&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=22&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445"
    });

    if (!response.ok) {
      console.error(`Failed to fetch data from UCI API: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error("Invalid data format received from UCI API");
      return [];
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching UCI men riders:", error);
    return [];
  }
}