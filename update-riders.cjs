// CommonJS script to update rider genders from UCI API
const { Pool } = require('pg');
const fetch = require('node-fetch');

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateFemaleRiders() {
  try {
    console.log('Fetching female riders from UCI API...');
    
    // Making the exact API call you provided
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
      throw new Error(`Failed to fetch UCI data: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data format received from UCI API');
    }
    
    console.log(`Retrieved ${data.data.length} riders from UCI API`);
    
    // Get all riders from database
    const result = await pool.query('SELECT id, name FROM riders');
    const dbRiders = result.rows;
    console.log(`Found ${dbRiders.length} riders in our database`);
    
    let updated = 0;
    let notFound = 0;
    
    // Process each UCI rider
    for (const uciRider of data.data) {
      if (!uciRider.DisplayName) continue;
      
      // Format in UCI API: "LASTNAME Firstname"
      const displayName = uciRider.DisplayName;
      const parts = displayName.split(' ');
      
      if (parts.length < 2) continue;
      
      const lastName = parts[0];
      const firstName = parts.slice(1).join(' ');
      
      // Find potential matches in our database
      const matchingRiders = dbRiders.filter(rider => {
        const riderName = rider.name.toLowerCase();
        const lowerLastName = lastName.toLowerCase();
        const lowerFirstName = firstName.toLowerCase();
        
        // Check if both first and last name are present in the rider name
        return riderName.includes(lowerLastName) && riderName.includes(lowerFirstName);
      });
      
      if (matchingRiders.length > 0) {
        // Update each matching rider
        for (const rider of matchingRiders) {
          console.log(`Updating rider: ${rider.name} (ID: ${rider.id}) to female`);
          
          await pool.query(
            'UPDATE riders SET gender = $1 WHERE id = $2',
            ['female', rider.id]
          );
          
          updated++;
        }
      } else {
        console.log(`No match found for UCI rider: ${displayName}`);
        notFound++;
      }
    }
    
    console.log(`
Update complete:
- Updated ${updated} riders to female gender
- No match found for ${notFound} UCI riders
    `);
    
  } catch (error) {
    console.error('Error updating female riders:', error);
  } finally {
    // Close database connection
    pool.end();
  }
}

// Run the function
updateFemaleRiders();