// CLI script to update rider genders from UCI API
// Run with: node server/scripts/update-rider-gender-cli.js [female|male]
import fetch from 'node-fetch';
import { db } from '../db.js';
import { riders } from '../../shared/schema.js';
import { eq, or, ilike } from 'drizzle-orm';

// Get gender from command line
const gender = process.argv[2] || 'female';
if (!['female', 'male'].includes(gender)) {
  console.error('Invalid gender. Use "female" or "male"');
  process.exit(1);
}

async function fetchUciRiders(gender) {
  const categoryId = gender === 'female' ? 23 : 22; // 23 for women, 22 for men
  
  try {
    // UCI API request parameters
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

    return data.data;
  } catch (error) {
    console.error(`Error fetching UCI ${gender} riders:`, error);
    return [];
  }
}

async function updateRiderGenders() {
  console.log(`Updating rider genders to "${gender}" from UCI API...`);
  
  try {
    // Fetch rider data from UCI API
    const uciRiders = await fetchUciRiders(gender);
    
    if (!uciRiders.length) {
      console.error('No riders fetched from UCI API');
      return;
    }
    
    console.log(`Fetched ${uciRiders.length} riders from UCI API`);
    
    // Get all riders from database for faster processing
    const allRiders = await db.select().from(riders);
    console.log(`Found ${allRiders.length} riders in database`);
    
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    
    // Process each UCI rider
    for (const uciRider of uciRiders) {
      try {
        if (!uciRider.DisplayName) {
          errors++;
          continue;
        }
        
        const displayName = uciRider.DisplayName;
        const parts = displayName.split(' ');
        
        if (parts.length < 2) {
          errors++;
          continue;
        }
        
        const lastName = parts[0];
        const firstName = parts.slice(1).join(' ');
        
        // Find potential matches in our database by comparing names
        const matchingRiders = allRiders.filter(dbRider => {
          const name = dbRider.name?.toLowerCase() || '';
          const lastNameMatch = name.includes(lastName.toLowerCase());
          const firstNameMatch = name.includes(firstName.toLowerCase());
          
          return lastNameMatch && firstNameMatch;
        });
        
        if (matchingRiders.length > 0) {
          // Update all potential matches
          for (const rider of matchingRiders) {
            console.log(`Found rider: ${rider.name} (ID: ${rider.id}), updating gender to ${gender}`);
            
            await db
              .update(riders)
              .set({ gender })
              .where(eq(riders.id, rider.id));
              
            updated++;
          }
        } else {
          console.log(`No matching rider found for ${displayName}`);
          notFound++;
        }
      } catch (error) {
        console.error(`Error processing rider ${uciRider.DisplayName}:`, error);
        errors++;
      }
    }
    
    console.log(`
Gender update complete:
- Updated: ${updated} riders
- Not found: ${notFound} riders
- Errors: ${errors} riders
`);
    
  } catch (error) {
    console.error('Error updating rider genders:', error);
  }
}

// Run the update process
updateRiderGenders()
  .then(() => {
    console.log('Update process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });