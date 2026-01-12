import axios from "axios";

const DEFAULT_BASE_URL =
  process.env.RIDER_DATA_BASE_URL || "http://localhost:5001/api/rider-data";

export class RiderDataClient {
  constructor(private readonly baseUrl: string = DEFAULT_BASE_URL) {}

  async getRider(id: number) {
    const response = await axios.get(`${this.baseUrl}/riders/${id}`);
    return response.data;
  }
}

export const riderDataClient = new RiderDataClient();
