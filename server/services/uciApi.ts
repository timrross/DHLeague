import axios from "axios";
import { InsertRider } from "@shared/schema";
import { generateRiderId } from "@shared/utils";
import type { RaceInput } from "../storage";

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

type UciCalendarDetailsLink = {
  title?: string;
  url?: string;
  isExternal?: boolean;
};

type UciCalendarCompetition = {
  name?: string;
  venue?: string;
  country?: string;
  continentCode?: string;
  dates?: string;
  detailsLink?: UciCalendarDetailsLink;
  isUciEvent?: boolean;
};

type UciCalendarDay = {
  competitionDate?: string;
  items?: UciCalendarCompetition[];
};

type UciCalendarMonth = {
  month?: number;
  year?: number;
  monthName?: string;
  isCurrentMonth?: boolean;
  items?: UciCalendarDay[];
};

type UciUpcomingCalendarResponse = {
  items?: UciCalendarMonth[];
};

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

  private extractDownhillRacesFromCalendarPayload(payload: unknown) {
    const data = payload as UciUpcomingCalendarResponse | undefined;
    const months = Array.isArray(data?.items) ? data.items : [];

    type Aggregated = {
      key: string;
      name: string;
      venue: string;
      country: string;
      startDate: Date;
      endDate: Date;
    };

    const aggregated = new Map<string, Aggregated>();

    for (const month of months) {
      const days = Array.isArray(month?.items) ? month.items : [];
      for (const day of days) {
        const dayDateRaw = day?.competitionDate;
        if (!dayDateRaw) continue;
        const dayDate = new Date(dayDateRaw);
        if (Number.isNaN(dayDate.getTime())) continue;

        const competitions = Array.isArray(day?.items) ? day.items : [];
        for (const competition of competitions) {
          const name = (competition?.name ?? competition?.detailsLink?.title ?? "").trim();
          if (!name) continue;
          if (!name.toUpperCase().includes("DHI")) continue;

          const venue = (competition?.venue ?? "").trim();
          const country = (competition?.country ?? "").trim();
          const linkUrl = (competition?.detailsLink?.url ?? "").trim();

          const key = linkUrl || `${name}|${venue}|${country}`;
          const existing = aggregated.get(key);

          if (!existing) {
            aggregated.set(key, {
              key,
              name,
              venue,
              country,
              startDate: dayDate,
              endDate: dayDate,
            });
            continue;
          }

          if (dayDate < existing.startDate) {
            existing.startDate = dayDate;
          }
          if (dayDate > existing.endDate) {
            existing.endDate = dayDate;
          }
          if (!existing.venue && venue) {
            existing.venue = venue;
          }
          if (!existing.country && country) {
            existing.country = country;
          }
        }
      }
    }

    return Array.from(aggregated.values());
  }

  /**
   * Fetch upcoming MTB Downhill (DHI) races from UCI calendar.
   *
   * Mirrors the browser XHR call:
   * `GET /api/calendar/upcoming?discipline=MTB&raceCategory=ME,WE&raceType=DHI&raceClass=CDM&seasonId=...`
   */
  async getUpcomingMTBDownhillRaces(options?: {
    discipline?: string;
    raceCategory?: string;
    raceType?: string;
    raceClass?: string;
    seasonId?: string | number;
  }): Promise<RaceInput[]> {
    try {
      const seasonId =
        options?.seasonId ??
        process.env.UCI_CALENDAR_SEASON_ID ??
        process.env.UCI_SEASON_ID ??
        "100443";

      const params: Record<string, string> = {
        discipline: options?.discipline ?? "MTB",
        raceCategory: options?.raceCategory ?? "ME,WE",
        raceType: options?.raceType ?? "DHI",
        raceClass: options?.raceClass ?? "CDM",
        seasonId: String(seasonId),
      };

      const response = await axios.get(`${this.baseUrl}/calendar/upcoming`, {
        params,
      });

      const races = this.extractDownhillRacesFromCalendarPayload(response.data);

      return races.map((race) => ({
        name: race.name,
        location: race.venue || "TBD",
        country: race.country || "TBD",
        startDate: race.startDate,
        endDate: race.endDate,
        discipline: "DHI",
      }));
    } catch (error) {
      console.error("Error fetching UCI MTB calendar upcoming races:", error);
      throw new Error("Failed to fetch UCI MTB calendar upcoming races");
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
	        return "";
	      }

      // The URL pattern is like "/rider-details/673156"
      // Extract the rider ID
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
	      return "";
	    } catch (error) {
      console.error(
        `Error fetching rider profile image for ${riderUrl}:`,
        error,
      );
	      // Return a default image on error
	      return "";
	    }
	  }

  /**
   * Map UCI race data to our race schema
   */
  mapRaceData(uciRaces: UCIRaceEvent[]): RaceInput[] {
    return uciRaces.map((race: UCIRaceEvent) => {
      // Format the race data according to our schema
      return {
        name: race.name,
        location: race.location.name,
        country: race.location.country.name,
        startDate: new Date(race.startDate),
        endDate: new Date(race.endDate),
        discipline: "DHI",
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
	            imageUrl = "";
	          }
	        }

        // Combine given name and family name
        // First trim any whitespace
        const givenName = (rider.givenName || "").trim();
        const familyName = (rider.familyName || "").trim();
        const name = `${givenName} ${familyName}`.trim();

        // Generate consistent rider ID from name
        const riderId = generateRiderId(name);
        const uciId = riderId;

        return {
          uciId,
          riderId,
          name,
          firstName: givenName || undefined,
          lastName: familyName || undefined,
          gender,
          team,
          country,
          cost,
          lastYearStanding,
          points,
          image: imageUrl,
          form: JSON.stringify([0, 0, 0, 0, 0]), // Default form data
          datarideObjectId: null,
          datarideTeamCode: rider.teamName ?? null,
        };
      }),
    );

    return mappedRiders;
  }
}

export const uciApiService = new UCIApiService();
