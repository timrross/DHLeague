// Simple script to fetch UCI women's downhill rankings and update rider genders
// Run with: node gender-update.js

import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateGenders() {
  try {
    console.log('Fetching women riders from UCI API...');
    
    const response = await fetch("https://dataride.uci.ch/iframe/ObjectRankings/", {
      method: "POST",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: "rankingId=156&disciplineId=7&rankingTypeId=1&take=100&skip=0&page=1&pageSize=100&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=23&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445"
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid API response format');
    }
    
    console.log(`Retrieved ${data.data.length} women riders from UCI API`);
    
    // Get all riders from our database
    const dbRiders = await pool.query('SELECT id, name FROM riders');
    console.log(`Found ${dbRiders.rows.length} riders in database`);
    
    let updated = 0;
    
    // Process each UCI rider
    for (const uciRider of data.data) {
      const displayName = uciRider.DisplayName;
      if (!displayName) continue;
      
      // UCI API format: "LASTNAME Firstname"
      const parts = displayName.split(' ');
      if (parts.length < 2) continue;
      
      const lastName = parts[0];
      const firstName = parts.slice(1).join(' ');
      
      // Try to find matches in our database
      for (const dbRider of dbRiders.rows) {
        const riderName = dbRider.name.toLowerCase();
        const lowerLastName = lastName.toLowerCase();
        const lowerFirstName = firstName.toLowerCase();
        
        // Check if both first and last name components are in the database name
        if (riderName.includes(lowerLastName) && riderName.includes(lowerFirstName)) {
          console.log(`Match: ${displayName} -> ${dbRider.name} (ID: ${dbRider.id})`);
          
          // Update the rider's gender to female
          await pool.query(
            'UPDATE riders SET gender = $1 WHERE id = $2',
            ['female', dbRider.id]
          );
          
          updated++;
        }
      }
    }
    
    console.log(`Updated ${updated} riders to female gender`);
    
  } catch (error) {
    console.error('Error updating rider genders:', error);
  } finally {
    // Close pool connection
    await pool.end();
  }
}

// Run the update
updateGenders().catch(console.error);