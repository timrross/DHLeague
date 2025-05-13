import {
  users,
  type User,
  type UpsertUser,
  riders,
  type Rider,
  type InsertRider,
  teams,
  type Team,
  type InsertTeam,
  teamRiders,
  type TeamRider,
  type InsertTeamRider,
  races,
  type Race,
  type InsertRace,
  results,
  type Result,
  type InsertResult,
  type TeamWithRiders,
  type RaceWithResults,
  type LeaderboardEntry
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Rider operations
  getRiders(): Promise<Rider[]>;
  getRider(id: number): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRider(id: number, rider: Partial<Rider>): Promise<Rider | undefined>;
  getRidersByGender(gender: string): Promise<Rider[]>;
  
  // Team operations
  getTeam(id: number): Promise<Team | undefined>;
  getTeamWithRiders(id: number): Promise<TeamWithRiders | undefined>;
  getUserTeam(userId: string): Promise<TeamWithRiders | undefined>;
  createTeam(team: InsertTeam, riderIds: number[]): Promise<TeamWithRiders>;
  updateTeam(id: number, team: Partial<Team>, riderIds?: number[]): Promise<TeamWithRiders | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  
  // Race operations
  getRaces(): Promise<Race[]>;
  getRace(id: number): Promise<Race | undefined>;
  getRaceWithResults(id: number): Promise<RaceWithResults | undefined>;
  createRace(race: InsertRace): Promise<Race>;
  updateRace(id: number, race: Partial<Race>): Promise<Race | undefined>;
  
  // Result operations
  getResults(raceId: number): Promise<(Result & { rider: Rider })[]>;
  addResult(result: InsertResult): Promise<Result>;
  updateTeamPoints(): Promise<void>;
  
  // Leaderboard operations
  getLeaderboard(): Promise<LeaderboardEntry[]>;
}

export class MemStorage implements IStorage {
  private _users: Map<string, User>;
  private _riders: Map<number, Rider>;
  private _teams: Map<number, Team>;
  private _teamRiders: Map<number, TeamRider>;
  private _races: Map<number, Race>;
  private _results: Map<number, Result>;
  private _riderCurrentId: number;
  private _teamCurrentId: number;
  private _teamRiderCurrentId: number;
  private _raceCurrentId: number;
  private _resultCurrentId: number;

  constructor() {
    this._users = new Map();
    this._riders = new Map();
    this._teams = new Map();
    this._teamRiders = new Map();
    this._races = new Map();
    this._results = new Map();
    this._riderCurrentId = 1;
    this._teamCurrentId = 1;
    this._teamRiderCurrentId = 1;
    this._raceCurrentId = 1;
    this._resultCurrentId = 1;
    
    this._initializeSampleData();
  }

  private _initializeSampleData() {
    // Sample riders data
    const sampleRiders: InsertRider[] = [
      { name: "Loic Bruni", gender: "male", team: "Specialized Gravity", cost: 350000, lastYearStanding: 1, image: "https://images.unsplash.com/photo-1564585222527-c2777a5bc6cb", country: "France", points: 215, form: JSON.stringify([2, 1, 4, 1, 3]) },
      { name: "Amaury Pierron", gender: "male", team: "Commencal/Muc-Off", cost: 325000, lastYearStanding: 2, image: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg", country: "France", points: 205, form: JSON.stringify([3, 6, 2, 1, 0]) },
      { name: "Troy Brosnan", gender: "male", team: "Canyon Collective", cost: 280000, lastYearStanding: 3, image: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg", country: "Australia", points: 190, form: JSON.stringify([5, 4, 3, 1, 2]) },
      { name: "Finn Iles", gender: "male", team: "Specialized Gravity", cost: 260000, lastYearStanding: 4, image: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg", country: "Canada", points: 175, form: JSON.stringify([8, 4, 3, 2, 4]) },
      { name: "Danny Hart", gender: "male", team: "Cube Factory", cost: 180000, lastYearStanding: 5, image: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg", country: "UK", points: 170, form: JSON.stringify([6, 7, 5, 3, 4]) },
      { name: "Laurie Greenland", gender: "male", team: "MS Mondraker", cost: 220000, lastYearStanding: 6, image: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg", country: "UK", points: 160, form: JSON.stringify([7, 5, 4, 6, 3]) },
      { name: "Dakotah Norton", gender: "male", team: "INTENSE Factory", cost: 200000, lastYearStanding: 7, image: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg", country: "USA", points: 155, form: JSON.stringify([4, 8, 7, 5, 6]) },
      { name: "Bernard Kerr", gender: "male", team: "Pivot Factory", cost: 170000, lastYearStanding: 8, image: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg", country: "UK", points: 150, form: JSON.stringify([9, 6, 5, 7, 5]) },
      { name: "Luca Shaw", gender: "male", team: "Santa Cruz Syndicate", cost: 180000, lastYearStanding: 9, image: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg", country: "USA", points: 145, form: JSON.stringify([10, 7, 6, 8, 7]) },
      { name: "Loris Vergier", gender: "male", team: "Trek Factory Racing", cost: 250000, lastYearStanding: 10, image: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg", country: "France", points: 140, form: JSON.stringify([3, 9, 8, 4, 8]) },
      { name: "Valentina Höll", gender: "female", team: "YT Mob", cost: 300000, lastYearStanding: 1, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "Austria", points: 230, form: JSON.stringify([1, 1, 2, 5, 1]) },
      { name: "Myriam Nicole", gender: "female", team: "Commencal/Muc-Off", cost: 290000, lastYearStanding: 2, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "France", points: 220, form: JSON.stringify([2, 2, 1, 3, 2]) },
      { name: "Tahnee Seagrave", gender: "female", team: "Canyon Collective", cost: 275000, lastYearStanding: 3, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "UK", points: 210, form: JSON.stringify([3, 3, 3, 2, 3]) },
      { name: "Nina Hoffmann", gender: "female", team: "Syndicate", cost: 265000, lastYearStanding: 4, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "Germany", points: 200, form: JSON.stringify([4, 4, 4, 1, 4]) },
      { name: "Marine Cabirou", gender: "female", team: "Scott Downhill Factory", cost: 255000, lastYearStanding: 5, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "France", points: 190, form: JSON.stringify([5, 5, 5, 4, 5]) },
      { name: "Camille Balanche", gender: "female", team: "Dorval AM", cost: 240000, lastYearStanding: 6, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "Switzerland", points: 180, form: JSON.stringify([6, 6, 6, 7, 6]) },
      { name: "Eleonora Farina", gender: "female", team: "MS Mondraker", cost: 230000, lastYearStanding: 7, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "Italy", points: 170, form: JSON.stringify([7, 7, 7, 6, 7]) },
      { name: "Monika Hrastnik", gender: "female", team: "Dorval AM", cost: 220000, lastYearStanding: 8, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "Slovenia", points: 160, form: JSON.stringify([8, 8, 8, 8, 8]) },
      { name: "Vali Höll", gender: "female", team: "YT Mob", cost: 210000, lastYearStanding: 9, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "Austria", points: 150, form: JSON.stringify([9, 9, 9, 9, 9]) },
      { name: "Anna Newkirk", gender: "female", team: "Beyond Racing", cost: 200000, lastYearStanding: 10, image: "https://pixabay.com/get/g986685f1116e75f74cbedbbf8de0b03d61a41f6565be835ec307d48f2733a3152fa85983a71108a14eeeb501211fd8b116ef777a47469ba90d68ae4c8123b4c4_1280.jpg", country: "USA", points: 140, form: JSON.stringify([10, 10, 10, 10, 10]) }
    ];

    // Create riders
    sampleRiders.forEach(rider => {
      this.createRider(rider);
    });

    // Sample races data
    const sampleRaces: InsertRace[] = [
      { name: "Fort William", location: "Fort William", country: "Scotland", startDate: new Date("2023-06-03"), endDate: new Date("2023-06-04"), status: "next", imageUrl: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg" },
      { name: "Lenzerheide", location: "Lenzerheide", country: "Switzerland", startDate: new Date("2023-06-10"), endDate: new Date("2023-06-11"), status: "upcoming", imageUrl: "https://pixabay.com/get/g3a1af921072d00ed8251d3fe0d9eaeedfb61d355148715a2330a66168baf531a8f01cfc7aac1a2cab21a2271872ba386711d8b1dadd91c9a9928b09f0d99b440_1280.jpg" },
      { name: "Leogang", location: "Leogang", country: "Austria", startDate: new Date("2023-06-17"), endDate: new Date("2023-06-18"), status: "upcoming", imageUrl: "https://pixabay.com/get/gdc9b1ef2b2aedf4e681de3e4b1dd19b13a845b393cefcdccd6744c7ab1ecb270558a49665ba44bb2200498d0c349df1303f138e60ab0d8883be61aea348bd266_1280.jpg" },
      { name: "Val di Sole", location: "Val di Sole", country: "Italy", startDate: new Date("2023-07-15"), endDate: new Date("2023-07-16"), status: "upcoming", imageUrl: "https://pixabay.com/get/g82d416b5bbc7820f8ea5af0c90bdf0829e8ad8f769a046921399f801203c7f8279dd2ab9c12a25bf7b72534d11000953079db6657a267d77c0d503cc805b703e_1280.jpg" },
      { name: "Vallnord", location: "Vallnord", country: "Andorra", startDate: new Date("2023-09-02"), endDate: new Date("2023-09-03"), status: "upcoming", imageUrl: "https://pixabay.com/get/g751aa0d1ab1f9ca6d5508fdb09df26de0a85b3824bb4f9e9b77ad79275d045f226d7a01b000170bd1c6f1878663a0ef61fd89985a5c26c8412bc44582129ddb3_1280.jpg" }
    ];

    // Create races
    sampleRaces.forEach(race => {
      this.createRace(race);
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this._users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user = {
      ...userData,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date()
    };
    this._users.set(user.id, user as User);
    return user as User;
  }

  // Rider operations
  async getRiders(): Promise<Rider[]> {
    return Array.from(this._riders.values());
  }

  async getRider(id: number): Promise<Rider | undefined> {
    return this._riders.get(id);
  }

  async createRider(riderData: InsertRider): Promise<Rider> {
    const id = this._riderCurrentId++;
    const rider = { ...riderData, id };
    this._riders.set(id, rider);
    return rider;
  }

  async updateRider(id: number, riderData: Partial<Rider>): Promise<Rider | undefined> {
    const rider = this._riders.get(id);
    if (!rider) return undefined;
    
    const updatedRider = { ...rider, ...riderData };
    this._riders.set(id, updatedRider);
    return updatedRider;
  }

  async getRidersByGender(gender: string): Promise<Rider[]> {
    return Array.from(this._riders.values()).filter(rider => rider.gender === gender);
  }

  // Team operations
  async getTeam(id: number): Promise<Team | undefined> {
    return this._teams.get(id);
  }

  async getTeamWithRiders(id: number): Promise<TeamWithRiders | undefined> {
    const team = this._teams.get(id);
    if (!team) return undefined;

    const teamRiderEntries = Array.from(this._teamRiders.values())
      .filter(tr => tr.teamId === id);
    
    const riders = teamRiderEntries.map(tr => {
      const rider = this._riders.get(tr.riderId);
      return rider as Rider;
    });

    const totalCost = riders.reduce((sum, rider) => sum + rider.cost, 0);

    return {
      ...team,
      riders,
      totalCost
    };
  }

  async getUserTeam(userId: string): Promise<TeamWithRiders | undefined> {
    const team = Array.from(this._teams.values()).find(t => t.userId === userId);
    if (!team) return undefined;

    return this.getTeamWithRiders(team.id);
  }

  async createTeam(teamData: InsertTeam, riderIds: number[]): Promise<TeamWithRiders> {
    // Validate team composition
    const riders = riderIds.map(id => this._riders.get(id) as Rider);
    const maleRiders = riders.filter(r => r.gender === 'male');
    const femaleRiders = riders.filter(r => r.gender === 'female');
    
    if (riders.length !== 6) {
      throw new Error('Team must have exactly 6 riders');
    }
    
    if (maleRiders.length > 4) {
      throw new Error('Team can have a maximum of 4 male riders');
    }
    
    if (femaleRiders.length < 2) {
      throw new Error('Team must have at least 2 female riders');
    }

    // Check budget
    const totalCost = riders.reduce((sum, rider) => sum + rider.cost, 0);
    if (totalCost > 2000000) {
      throw new Error('Team exceeds the budget of $2,000,000');
    }

    // Create team
    const id = this._teamCurrentId++;
    const team: Team = { 
      ...teamData, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date(),
      totalPoints: 0
    };
    
    this._teams.set(id, team);

    // Create team-rider associations
    riderIds.forEach(riderId => {
      const teamRiderId = this._teamRiderCurrentId++;
      const teamRider: TeamRider = {
        id: teamRiderId,
        teamId: id,
        riderId
      };
      this._teamRiders.set(teamRiderId, teamRider);
    });

    // Return team with riders
    return {
      ...team,
      riders,
      totalCost
    };
  }

  async updateTeam(id: number, teamData: Partial<Team>, riderIds?: number[]): Promise<TeamWithRiders | undefined> {
    const team = this._teams.get(id);
    if (!team) return undefined;

    // Update team data
    const updatedTeam: Team = { 
      ...team, 
      ...teamData,
      updatedAt: new Date()
    };
    
    this._teams.set(id, updatedTeam);

    // If rider IDs provided, update team composition
    if (riderIds && riderIds.length > 0) {
      // Validate team composition
      const riders = riderIds.map(id => this._riders.get(id) as Rider);
      const maleRiders = riders.filter(r => r.gender === 'male');
      const femaleRiders = riders.filter(r => r.gender === 'female');
      
      if (riders.length !== 6) {
        throw new Error('Team must have exactly 6 riders');
      }
      
      if (maleRiders.length > 4) {
        throw new Error('Team can have a maximum of 4 male riders');
      }
      
      if (femaleRiders.length < 2) {
        throw new Error('Team must have at least 2 female riders');
      }

      // Check budget
      const totalCost = riders.reduce((sum, rider) => sum + rider.cost, 0);
      if (totalCost > 2000000) {
        throw new Error('Team exceeds the budget of $2,000,000');
      }

      // Remove existing team-rider associations
      Array.from(this._teamRiders.entries())
        .filter(([_, tr]) => tr.teamId === id)
        .forEach(([key, _]) => {
          this._teamRiders.delete(key);
        });

      // Create new team-rider associations
      riderIds.forEach(riderId => {
        const teamRiderId = this._teamRiderCurrentId++;
        const teamRider: TeamRider = {
          id: teamRiderId,
          teamId: id,
          riderId
        };
        this._teamRiders.set(teamRiderId, teamRider);
      });
    }

    // Return updated team with riders
    return this.getTeamWithRiders(id);
  }

  async deleteTeam(id: number): Promise<boolean> {
    if (!this._teams.has(id)) {
      return false;
    }

    // Delete team-rider associations
    Array.from(this._teamRiders.entries())
      .filter(([_, tr]) => tr.teamId === id)
      .forEach(([key, _]) => {
        this._teamRiders.delete(key);
      });

    // Delete team
    this._teams.delete(id);
    return true;
  }

  // Race operations
  async getRaces(): Promise<Race[]> {
    return Array.from(this._races.values());
  }

  async getRace(id: number): Promise<Race | undefined> {
    return this._races.get(id);
  }

  async getRaceWithResults(id: number): Promise<RaceWithResults | undefined> {
    const race = this._races.get(id);
    if (!race) return undefined;

    const raceResults = Array.from(this._results.values())
      .filter(result => result.raceId === id)
      .map(result => {
        const rider = this._riders.get(result.riderId) as Rider;
        return { ...result, rider };
      });

    return {
      ...race,
      results: raceResults
    };
  }

  async createRace(raceData: InsertRace): Promise<Race> {
    const id = this._raceCurrentId++;
    const race = { ...raceData, id };
    this._races.set(id, race);
    return race;
  }

  async updateRace(id: number, raceData: Partial<Race>): Promise<Race | undefined> {
    const race = this._races.get(id);
    if (!race) return undefined;
    
    const updatedRace = { ...race, ...raceData };
    this._races.set(id, updatedRace);
    return updatedRace;
  }

  // Result operations
  async getResults(raceId: number): Promise<(Result & { rider: Rider })[]> {
    return Array.from(this._results.values())
      .filter(result => result.raceId === raceId)
      .map(result => {
        const rider = this._riders.get(result.riderId) as Rider;
        return { ...result, rider };
      });
  }

  async addResult(resultData: InsertResult): Promise<Result> {
    const id = this._resultCurrentId++;
    const result = { ...resultData, id };
    this._results.set(id, result);

    // Update rider points
    const rider = this._riders.get(result.riderId);
    if (rider) {
      const updatedPoints = rider.points + result.points;
      const formArray = JSON.parse(rider.form || '[]');
      formArray.push(result.position);
      if (formArray.length > 5) formArray.shift();
      
      this._riders.set(rider.id, {
        ...rider,
        points: updatedPoints,
        form: JSON.stringify(formArray)
      });
    }

    return result;
  }

  async updateTeamPoints(): Promise<void> {
    // For each team, calculate total points from riders
    for (const team of this._teams.values()) {
      const teamWithRiders = await this.getTeamWithRiders(team.id);
      if (teamWithRiders) {
        const totalPoints = teamWithRiders.riders.reduce((sum, rider) => sum + rider.points, 0);
        this._teams.set(team.id, { ...team, totalPoints });
      }
    }
  }

  // Leaderboard operations
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    // Get all teams with riders
    const teams = await Promise.all(
      Array.from(this._teams.values()).map(team => this.getTeamWithRiders(team.id))
    ) as TeamWithRiders[];

    // Sort teams by total points (descending)
    teams.sort((a, b) => b.totalPoints - a.totalPoints);

    // Get users for each team
    const leaderboard = teams.map((team, index) => {
      const user = this._users.get(team.userId) as User;
      
      // Calculate last round points (simplified for demo)
      const lastRoundPoints = Math.floor(Math.random() * 100) + 50; // Mock value
      
      return {
        rank: index + 1,
        team,
        user,
        lastRoundPoints,
        totalPoints: team.totalPoints
      };
    });

    return leaderboard;
  }
}

export const storage = new MemStorage();
