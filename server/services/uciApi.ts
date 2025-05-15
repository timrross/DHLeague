import axios from "axios";
import { InsertRace, InsertRider } from "@shared/schema";
import { generateRiderId } from "@shared/utils";

// Types for UCI API responses
interface UCIRaceEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  eventStatus: string;
  discipline: string;
  class: {
    name: string;
  };
  location: {
    name: string;
    country: {
      name: string;
      code: string;
    };
  };
}

interface UCIRider {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  teamName: string;
  nationality: {
    name: string;
    code: string;
  };
  ranking: number;
  points: number;
}

/**
 * Service to interact with the UCI API
 */
export class UCIApiService {
  private baseUrl = "https://www.uci.org/api";

  /**
   * Fetch upcoming MTB downhill events from UCI API
   */
  async getUpcomingMTBEvents(): Promise<UCIRaceEvent[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/calendar/upcoming?discipline=MTB`,
      );

      // Filter for downhill events only
      const dhEvents = response.data.filter((event: UCIRaceEvent) => {
        const isDownhill =
          event.name.toLowerCase().includes("downhill") ||
          event.name.toLowerCase().includes("dh") ||
          (event.class && event.class.name.toLowerCase().includes("downhill"));

        return isDownhill;
      });

      return dhEvents;
    } catch (error) {
      console.error("Error fetching UCI MTB events:", error);
      throw new Error("Failed to fetch UCI MTB events");
    }
  }

  /**
   * Fetch MTB downhill riders from UCI API
   */
  async getMTBDownhillRiders(): Promise<any[]> {
    try {
      // Get riders from the first page to determine total pages
      const firstPageResponse = await axios.get(
        "https://www.uci.org/api/riders/MTB/2025?page=1",
      );

      // Extract pagination information (new format)
      const totalRiders = firstPageResponse.data.totalItems || 0;
      const pageSize = firstPageResponse.data.pageSize || 25;
      const totalPages = Math.ceil(totalRiders / pageSize);

      console.log(`Total MTB riders: ${totalRiders}, Pages: ${totalPages}, Page size: ${pageSize}`);

      // Collect all downhill riders across all pages
      let allDHRiders: any[] = [];

      // Process first page
      if (
        firstPageResponse.data.items &&
        Array.isArray(firstPageResponse.data.items)
      ) {
        const dhRidersPage1 = firstPageResponse.data.items.filter(
          (rider: any) => rider.format === "DH",
        );
        allDHRiders = [...dhRidersPage1];
        console.log(`Found ${dhRidersPage1.length} DH riders on page 1`);
      }

      // Fetch all additional pages
      for (let page = 2; page <= totalPages; page++) {
        console.log(`Fetching page ${page} of ${totalPages}`);
        try {
          const pageResponse = await axios.get(
            `https://www.uci.org/api/riders/MTB/2025?page=${page}`,
          );

          if (pageResponse.data.items && Array.isArray(pageResponse.data.items)) {
            const dhRidersPage = pageResponse.data.items.filter(
              (rider: any) => rider.format === "DH",
            );
            console.log(`Found ${dhRidersPage.length} DH riders on page ${page}`);
            allDHRiders = [...allDHRiders, ...dhRidersPage];
          }

          // Add a small delay to avoid overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (pageError) {
          console.error(`Error fetching page ${page}:`, pageError);
          // Continue to next page even if one page fails
        }
      }

      console.log(`Found ${allDHRiders.length} total downhill riders`);
      return allDHRiders;
    } catch (error) {
      console.error("Error fetching UCI MTB riders:", error);
      throw new Error("Failed to fetch UCI MTB riders");
    }
  }

  /**
   * Get rider profile image
   */
  async getRiderProfileImage(riderUrl: string): Promise<string> {
    try {
      if (!riderUrl) {
        return "https://www.uci.org/docs/default-source/imported-images/discipline/discipline-mountain-bike.jpg";
      }

      // The URL pattern is like "/rider-details/673156"
      // Extract the rider ID
      const riderId = riderUrl.split("/").pop();

      // Try to get the rider detail page
      const response = await axios.get(`https://www.uci.org${riderUrl}`);

      // Extract the image URL from the HTML response (simplified approach)
      // In a real implementation, you might want to use a DOM parser
      if (response.data) {
        const htmlData = response.data.toString();
        const imageUrlMatches = htmlData.match(
          /<meta property="og:image" content="([^"]+)"/,
        );
        if (imageUrlMatches && imageUrlMatches[1]) {
          return imageUrlMatches[1];
        }
      }

      // If no image found, return a default image
      return `https://www.uci.org/docs/default-source/imported-images/discipline/discipline-mountain-bike.jpg`;
    } catch (error) {
      console.error(
        `Error fetching rider profile image for ${riderUrl}:`,
        error,
      );
      // Return a default image on error
      return `https://www.uci.org/docs/default-source/imported-images/discipline/discipline-mountain-bike.jpg`;
    }
  }

  /**
   * Map UCI race data to our race schema
   */
  mapRaceData(uciRaces: UCIRaceEvent[]): InsertRace[] {
    return uciRaces.map((race: UCIRaceEvent) => {
      // Determine race status
      let status = "upcoming";
      const now = new Date();
      const startDate = new Date(race.startDate);
      const endDate = new Date(race.endDate);

      if (now > endDate) {
        status = "completed";
      } else if (now >= startDate && now <= endDate) {
        status = "ongoing";
      } else if (
        startDate.getTime() ===
        Math.min(...uciRaces.map((r) => new Date(r.startDate).getTime()))
      ) {
        status = "next";
      }

      // Format the race data according to our schema
      return {
        name: race.name,
        location: race.location.name,
        country: race.location.country.name,
        startDate: new Date(race.startDate),
        endDate: new Date(race.endDate),
        status,
        imageUrl: `https://flagcdn.com/w320/${race.location.country.code.toLowerCase()}.png`, // Use flag as fallback image
      };
    });
  }

  /**
   * Map UCI rider data to our schema
   */
  async mapRiderData(uciRiders: any[]): Promise<InsertRider[]> {
    // Sort riders alphabetically since we don't have ranking in this API
    const sortedRiders = [...uciRiders].sort((a, b) => {
      return (a.familyName || "").localeCompare(b.familyName || "");
    });

    // Cost tiers based on estimated rider quality (we'll use a simple distribution)
    const totalRiders = sortedRiders.length;
    const topTierCount = Math.floor(totalRiders * 0.2); // Top 20% get highest cost
    const midTierCount = Math.floor(totalRiders * 0.3); // Next 30% get medium cost

    const mappedRiders = await Promise.all(
      sortedRiders.map(async (rider: any, index: number) => {
        // Calculate cost based on simple tier system
        let cost = 200000; // Default mid-range cost

        if (index < topTierCount) {
          // Top tier riders (more expensive)
          cost = 350000 - index * 5000;
        } else if (index < topTierCount + midTierCount) {
          // Mid tier riders
          cost = 270000 - (index - topTierCount) * 3000;
        } else {
          // Lower tier riders
          cost = 200000 - (index - topTierCount - midTierCount) * 1000;
        }

        // Ensure minimum cost
        cost = Math.max(150000, cost);

        // Determine gender based on category name if available
        let gender = "male"; // Default to male
        // If we can detect women from category or other data, change to female
        if (rider.category?.toLowerCase()?.includes("women")) {
          gender = "female";
        }

        // Get rider's team
        const team = rider.teamName || "Independent";

        // Get nationality from country code
        const countryCode = rider.countryCode || "Unknown";
        let country = countryCode;

        // Map some common country codes to full names
        const countryMap: { [key: string]: string } = {
          FRA: "France",
          USA: "United States",
          GBR: "Great Britain",
          AUS: "Australia",
          CAN: "Canada",
          GER: "Germany",
          ITA: "Italy",
          ESP: "Spain",
          SUI: "Switzerland",
          AUT: "Austria",
          BEL: "Belgium",
          NED: "Netherlands",
          NZL: "New Zealand",
          SLO: "Slovenia",
          CZE: "Czech Republic",
          POL: "Poland",
          RSA: "South Africa",
          BRA: "Brazil",
          JPN: "Japan",
        };

        if (countryMap[countryCode]) {
          country = countryMap[countryCode];
        }

        // Default points
        const points = 0;

        // Default ranking
        const lastYearStanding = index + 1;

        // Try to get rider's profile image
        let imageUrl;
        try {
          if (rider.url) {
            imageUrl = await this.getRiderProfileImage(rider.url);
          }
        } catch (error) {
          console.error(
            `Error getting profile image for rider ${rider.url}:`,
            error,
          );
        }

        // If no image was found, use a country flag as fallback
        if (!imageUrl) {
          if (countryCode) {
            imageUrl = `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
          } else {
            // Default image if no country code
            imageUrl =
              "https://www.uci.org/docs/default-source/imported-images/discipline/discipline-mountain-bike.jpg";
          }
        }

        // Combine given name and family name
        // First trim any whitespace
        const givenName = (rider.givenName || "").trim();
        const familyName = (rider.familyName || "").trim();
        const name = `${givenName} ${familyName}`.trim();
        
        // Generate consistent rider ID from name
        const riderId = generateRiderId(name);

        return {
          riderId,
          name,
          gender,
          team,
          country,
          cost,
          lastYearStanding,
          points,
          image: imageUrl,
          form: JSON.stringify([0, 0, 0, 0, 0]), // Default form data
        };
      }),
    );

    return mappedRiders;
  }
}

export const uciApiService = new UCIApiService();
