import axios from 'axios';
import { type Rider } from '@shared/schema';
import { generateRiderId } from '@shared/utils';

interface UCIRider {
  ObjectId: number;
  DisplayName: string;
  IndividualFullName: string;
  TeamName: string;
  NationFullName: string;
  Points: number;
  Rank: number;
  BirthDate: string;
  Ages: number;
  CountryIsoCode2: string;
}

interface UCIResponse {
  data: UCIRider[];
}

export interface RiderUpdate {
  id: number;
  gender: 'male' | 'female';
  team: string;
  country: string;
  points: number;
  lastYearStanding: number;
}

export class RankingUciApiService {
  private async fetchUCIRankings(categoryId: string): Promise<UCIResponse> {
    const response = await axios.post<UCIResponse>("https://dataride.uci.ch/iframe/ObjectRankings/", 
      `rankingId=149&disciplineId=7&rankingTypeId=1&take=40&skip=0&page=1&pageSize=40&filter[filters][0][field]=RaceTypeId&filter[filters][0][value]=19&filter[filters][1][field]=CategoryId&filter[filters][1][value]=${categoryId}&filter[filters][2][field]=SeasonId&filter[filters][2][value]=445&filter[filters][3][field]=MomentId&filter[filters][3][value]=0&filter[filters][4][field]=CountryId&filter[filters][4][value]=0&filter[filters][5][field]=IndividualName&filter[filters][5][value]=&filter[filters][6][field]=TeamName&filter[filters][6][value]=`,
      {
        headers: {
          "accept": "application/json",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        }
      }
    );

    return response.data;
  }

  /**
   * Get rider updates from UCI rankings
   * @param existingRiders Map of existing riders with their normalized names as keys
   * @returns Array of rider updates that can be applied to the database
   */
  async getRiderUpdates(existingRiders: Map<string, Rider>): Promise<RiderUpdate[]> {
    try {
      // Fetch male riders (CategoryId=22)
      const maleRiders = await this.fetchUCIRankings("22");
      
      // Fetch female riders (CategoryId=23)
      const femaleRiders = await this.fetchUCIRankings("23");

      const updates: RiderUpdate[] = [];

      // Process male riders
      for (const rider of maleRiders.data) {
        const normalizedName = generateRiderId(rider.IndividualFullName);
        const existingRider = existingRiders.get(normalizedName);
        
        if (existingRider) {
          updates.push({
            id: existingRider.id,
            gender: 'male',
            team: rider.TeamName,
            country: rider.NationFullName,
            points: Math.round(rider.Points),
            lastYearStanding: rider.Rank
          });
        }
      }

      // Process female riders
      for (const rider of femaleRiders.data) {
        const normalizedName = generateRiderId(rider.IndividualFullName);
        const existingRider = existingRiders.get(normalizedName);
        
        if (existingRider) {
          updates.push({
            id: existingRider.id,
            gender: 'female',
            team: rider.TeamName,
            country: rider.NationFullName,
            points: Math.round(rider.Points),
            lastYearStanding: rider.Rank
          });
        }
      }

      return updates;
    } catch (error) {
      console.error('Error fetching rider updates:', error);
      throw error;
    }
  }
}

export const rankingUciApiService = new RankingUciApiService();