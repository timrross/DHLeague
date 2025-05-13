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
   * Fetch MTB downhill riders rankings
   */
  async getMTBDownhillRiders(): Promise<UCIRider[]> {
    try {
      // This endpoint might need to be adjusted based on the actual UCI API structure
      const response = await axios.get(`${this.baseUrl}/rankings?discipline=MTB&category=DHI`);
      return response.data;
    } catch (error) {
      console.error('Error fetching UCI MTB riders:', error);
      throw new Error('Failed to fetch UCI MTB riders');
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
  mapRiderData(uciRiders: UCIRider[]): InsertRider[] {
    return uciRiders.map((rider: UCIRider, index: number) => {
      // Calculate cost based on ranking (higher ranked riders cost more)
      const cost = Math.max(150000, 400000 - (index * 10000));
      
      return {
        name: `${rider.firstName} ${rider.lastName}`,
        gender: rider.gender.toLowerCase(),
        team: rider.teamName,
        country: rider.nationality.name,
        cost,
        lastYearStanding: index + 1,
        points: rider.points || 0,
        image: `https://flagcdn.com/w320/${rider.nationality.code.toLowerCase()}.png`, // Use flag as fallback image
        form: JSON.stringify([0, 0, 0, 0, 0]) // Default form data
      };
    });
  }
}

export const uciApiService = new UCIApiService();