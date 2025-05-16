// Script to update rider genders from UCI API
// Run with: node server/scripts/update-gender.mjs [female|male]
import fetch from 'node-fetch';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/pg-core';
import { eq, ilike, or } from 'drizzle-orm';

const gender = process.argv[2] || 'female';
if (!['female', 'male'].includes(gender)) {
  console.error('Invalid gender. Use "female" or "male"');
  process.exit(1);
}

// Connect to database
console.log('Connecting to database...');
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Category ID in UCI API for women (23) or men (22)
const categoryId = gender === 'female' ? 23 : 22;

// Fetch UCI riders
async function fetchRiders() {
  try {
    console.log(`Fetching ${gender} riders from UCI API...`);
    const response = await fetch("https://dataride.uci.ch/iframe/ObjectRankings/", {
      method: "POST",
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `rankingId=156&disciplineId=7&rankingTypeId=1&take=100&skip=0&page=1&pageSize=100&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=${categoryId}&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445`
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data from UCI API: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid data format received from UCI API");
    }

    console.log(`Found ${data.data.length} ${gender} riders in UCI data`);
    return data.data;
  } catch (error) {
    console.error(`Error fetching UCI ${gender} riders:`, error);
    return [];
  }
}

// Update database
async function updateDatabase(uciRiders) {
  console.log('Updating rider genders in database...');
  let updated = 0;
  let notFound = 0;
  
  try {
    // Get all our riders from the database
    const result = await pool.query('SELECT id, name FROM riders');
    console.log(`Found ${result.rows.length} riders in our database`);
    
    const allRiders = result.rows;
    
    for (const uciRider of uciRiders) {
      if (!uciRider.DisplayName) continue;
      
      const displayName = uciRider.DisplayName;
      const parts = displayName.split(' ');
      
      if (parts.length < 2) continue;
      
      const lastName = parts[0];
      const firstName = parts.slice(1).join(' ');
      
      // Find matching riders in database
      const matchingRiders = allRiders.filter(dbRider => {
        const name = dbRider.name.toLowerCase();
        const lowerLastName = lastName.toLowerCase();
        const lowerFirstName = firstName.toLowerCase();
        
        return name.includes(lowerLastName) && name.includes(lowerFirstName);
      });
      
      if (matchingRiders.length > 0) {
        for (const rider of matchingRiders) {
          console.log(`Updating ${rider.name} (ID: ${rider.id}) to ${gender}`);
          
          await pool.query(
            'UPDATE riders SET gender = $1 WHERE id = $2',
            [gender, rider.id]
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
    - Updated: ${updated} riders
    - Not found: ${notFound} riders
    `);
    
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    await pool.end();
  }
}

async function main() {
  const riders = await fetchRiders();
  if (riders.length > 0) {
    await updateDatabase(riders);
  } else {
    console.error('No riders found to update');
  }
}

main().catch(console.error);