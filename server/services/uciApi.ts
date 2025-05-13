import axios from 'axios';
import { InsertRace, InsertRider } from '@shared/schema';

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
  private baseUrl = 'https://www.uci.org/api';

  /**
   * Fetch upcoming MTB downhill events from UCI API
   */
  async getUpcomingMTBEvents(): Promise<UCIRaceEvent[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/calendar/upcoming?discipline=MTB`);
      
      // Filter for downhill events only
      const dhEvents = response.data.filter((event: UCIRaceEvent) => {
        const isDownhill = 
          event.name.toLowerCase().includes('downhill') || 
          event.name.toLowerCase().includes('dh') ||
          (event.class && event.class.name.toLowerCase().includes('downhill'));
        
        return isDownhill;
      });
      
      return dhEvents;
    } catch (error) {
      console.error('Error fetching UCI MTB events:', error);
      throw new Error('Failed to fetch UCI MTB events');
    }
  }

  /**
   * Fetch MTB downhill riders from UCI API
   */
  async getMTBDownhillRiders(): Promise<any[]> {
    try {
      // Get riders from the UCI API
      const response = await axios.get('https://www.uci.org/api/riders/MTB/2025?page=1');
      
      // Filter for downhill riders (DHI)
      const dhiRiders = response.data.filter((rider: any) => {
        const disciplines = rider.disciplines || [];
        return disciplines.some((discipline: any) => 
          discipline?.abbreviation?.toLowerCase() === 'dhi' || 
          (discipline?.name && discipline.name.toLowerCase().includes('downhill'))
        );
      });
      
      return dhiRiders;
    } catch (error) {
      console.error('Error fetching UCI MTB riders:', error);
      throw new Error('Failed to fetch UCI MTB riders');
    }
  }
  
  /**
   * Get rider profile image
   */
  async getRiderProfileImage(riderId: string): Promise<string> {
    try {
      // Try to get the rider's profile image from UCI
      const response = await axios.get(`${this.baseUrl}/riders/${riderId}`);
      
      if (response.data && response.data.image) {
        return response.data.image;
      }
      
      // If no image found, return a default image
      return `https://www.uci.org/docs/default-source/imported-images/discipline/discipline-mountain-bike.jpg`;
    } catch (error) {
      console.error(`Error fetching rider profile image for rider ${riderId}:`, error);
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
      let status = 'upcoming';
      const now = new Date();
      const startDate = new Date(race.startDate);
      const endDate = new Date(race.endDate);
      
      if (now > endDate) {
        status = 'completed';
      } else if (now >= startDate && now <= endDate) {
        status = 'ongoing';
      } else if (startDate.getTime() === Math.min(...uciRaces.map(r => new Date(r.startDate).getTime()))) {
        status = 'next';
      }
      
      // Format the race data according to our schema
      return {
        name: race.name,
        location: race.location.name,
        country: race.location.country.name,
        startDate: new Date(race.startDate),
        endDate: new Date(race.endDate),
        status,
        imageUrl: `https://flagcdn.com/w320/${race.location.country.code.toLowerCase()}.png` // Use flag as fallback image
      };
    });
  }

  /**
   * Map UCI rider data to our rider schema
   */
  async mapRiderData(uciRiders: any[]): Promise<InsertRider[]> {
    // Sort riders by ranking (if available) to determine cost
    const sortedRiders = [...uciRiders].sort((a, b) => {
      const aRanking = a.ranking?.position || 999;
      const bRanking = b.ranking?.position || 999;
      return aRanking - bRanking;
    });
    
    const mappedRiders = await Promise.all(
      sortedRiders.map(async (rider: any, index: number) => {
        // Calculate cost based on ranking (higher ranked riders cost more)
        // Elite/top riders cost more
        const isElite = rider.category?.name?.toLowerCase().includes('elite');
        const baseMaxCost = isElite ? 400000 : 300000;
        const cost = Math.max(150000, baseMaxCost - (index * 10000));
        
        // Determine gender
        let gender = 'male';
        if (rider.gender === 'F' || 
            rider.gender?.toLowerCase() === 'female' || 
            rider.category?.name?.toLowerCase().includes('women')) {
          gender = 'female';
        }
        
        // Get rider's team
        const team = rider.team?.name || 'Independent';
        
        // Get nationality
        const country = rider.nationality?.name || rider.country?.name || 'Unknown';
        
        // Get points from ranking if available
        const points = rider.ranking?.points || 0;
        
        // Get ranking position
        const lastYearStanding = rider.ranking?.position || (index + 1);
        
        // Try to get rider's profile image
        let imageUrl;
        try {
          if (rider.id) {
            imageUrl = await this.getRiderProfileImage(rider.id);
          }
        } catch (error) {
          console.error(`Error getting profile image for rider ${rider.id}:`, error);
        }
        
        // If no image was found, use a country flag as fallback
        if (!imageUrl) {
          const countryCode = rider.nationality?.code || rider.country?.code;
          if (countryCode) {
            imageUrl = `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
          } else {
            // Default image if no country code
            imageUrl = 'https://www.uci.org/docs/default-source/imported-images/discipline/discipline-mountain-bike.jpg';
          }
        }
        
        // Combine first and last name
        const name = `${rider.firstName || ''} ${rider.lastName || ''}`.trim();
        
        return {
          name,
          gender,
          team,
          country,
          cost,
          lastYearStanding,
          points,
          image: imageUrl,
          form: JSON.stringify([0, 0, 0, 0, 0]) // Default form data
        };
      })
    );
    
    return mappedRiders;
  }
}

export const uciApiService = new UCIApiService();