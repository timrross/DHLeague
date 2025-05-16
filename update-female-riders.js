// Script to update rider genders based on UCI API data
import { createPool } from 'pg';

// Create a pool to connect to the PostgreSQL database
const pool = createPool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    console.log('Fetching women riders from UCI API...');
    
    // Using the exact fetch request you provided
    const response = await fetch("https://dataride.uci.ch/iframe/ObjectRankings/", {
      method: "POST",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,de;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: "rankingId=156&disciplineId=7&rankingTypeId=1&take=40&skip=0&page=1&pageSize=40&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=23&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445&filter%5Bfilters%5D%5B3%5D%5Bfield%5D=MomentId&filter%5Bfilters%5D%5B3%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B4%5D%5Bfield%5D=CountryId&filter%5Bfilters%5D%5B4%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B5%5D%5Bfield%5D=IndividualName&filter%5Bfilters%5D%5B5%5D%5Bvalue%5D=&filter%5Bfilters%5D%5B6%5D%5Bfield%5D=TeamName&filter%5Bfilters%5D%5B6%5D%5Bvalue%5D="
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid API response format');
    }
    
    console.log(`Retrieved ${data.data.length} women riders from UCI API`);
    
    // Get all riders from the database
    const { rows: dbRiders } = await pool.query('SELECT id, name FROM riders');
    console.log(`Found ${dbRiders.length} riders in database`);
    
    let updated = 0;
    let notFound = 0;
    
    // Process each UCI rider
    for (const uciRider of data.data) {
      if (!uciRider.DisplayName) continue;
      
      // UCI API format: "LASTNAME Firstname"
      const displayName = uciRider.DisplayName;
      const parts = displayName.split(' ');
      
      if (parts.length < 2) continue;
      
      const lastName = parts[0];
      const firstName = parts.slice(1).join(' ');
      
      // Find matching riders by comparing first and last names
      const matchingRiders = dbRiders.filter(rider => {
        const riderName = rider.name.toLowerCase();
        const lowerLastName = lastName.toLowerCase();
        const lowerFirstName = firstName.toLowerCase();
        
        return riderName.includes(lowerLastName) && riderName.includes(lowerFirstName);
      });
      
      if (matchingRiders.length > 0) {
        for (const rider of matchingRiders) {
          console.log(`Match found: ${displayName} -> ${rider.name} (ID: ${rider.id})`);
          
          // Update the rider to female gender
          await pool.query(
            'UPDATE riders SET gender = $1 WHERE id = $2',
            ['female', rider.id]
          );
          
          updated++;
        }
      } else {
        console.log(`No match found for ${displayName}`);
        notFound++;
      }
    }
    
    console.log(`
Update complete:
- Updated: ${updated} riders to female gender
- Not found: ${notFound} riders
    `);
    
  } catch (error) {
    console.error('Error updating rider genders:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

main().catch(console.error);