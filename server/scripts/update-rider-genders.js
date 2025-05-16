// Script to update rider genders based on UCI data
const { db } = require('../db');
const { riders } = require('../../shared/schema');
const { eq, or, ilike } = require('drizzle-orm');

async function updateRidersFromUciData() {
  try {
    console.log('Fetching UCI women\'s elite data...');
    
    // Fetch UCI data
    const response = await fetch("https://dataride.uci.ch/iframe/ObjectRankings/", {
      "headers": {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,de;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      "body": "rankingId=156&disciplineId=7&rankingTypeId=1&take=40&skip=0&page=1&pageSize=40&filter%5Bfilters%5D%5B0%5D%5Bfield%5D=RaceTypeId&filter%5Bfilters%5D%5B0%5D%5Bvalue%5D=19&filter%5Bfilters%5D%5B1%5D%5Bfield%5D=CategoryId&filter%5Bfilters%5D%5B1%5D%5Bvalue%5D=23&filter%5Bfilters%5D%5B2%5D%5Bfield%5D=SeasonId&filter%5Bfilters%5D%5B2%5D%5Bvalue%5D=445&filter%5Bfilters%5D%5B3%5D%5Bfield%5D=MomentId&filter%5Bfilters%5D%5B3%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B4%5D%5Bfield%5D=CountryId&filter%5Bfilters%5D%5B4%5D%5Bvalue%5D=0&filter%5Bfilters%5D%5B5%5D%5Bfield%5D=IndividualName&filter%5Bfilters%5D%5B5%5D%5Bvalue%5D=&filter%5Bfilters%5D%5B6%5D%5Bfield%5D=TeamName&filter%5Bfilters%5D%5B6%5D%5Bvalue%5D=",
      "method": "POST"
    });
    
    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      console.error('Invalid data format received from UCI API');
      return;
    }
    
    console.log(`Retrieved ${data.data.length} riders from UCI API`);
    
    // Process each UCI rider
    for (const uciRider of data.data) {
      // Format: "LASTNAME Firstname" -> "Firstname LASTNAME"
      // However, we just need to match with our database, not fix the format
      const displayName = uciRider.DisplayName;
      
      if (!displayName) {
        continue;
      }
      
      try {
        // Split the name
        const parts = displayName.split(' ');
        if (parts.length < 2) continue;
        
        const lastName = parts[0];
        const firstName = parts.slice(1).join(' ');
        
        // Search for this rider in our database with flexible matching
        const dbRiders = await db
          .select()
          .from(riders)
          .where(
            or(
              ilike(riders.name, `%${firstName}%${lastName}%`),
              ilike(riders.name, `%${lastName}%${firstName}%`),
              ilike(riders.name, `%${displayName}%`)
            )
          );
        
        if (dbRiders.length > 0) {
          // Update all potential matches
          for (const rider of dbRiders) {
            console.log(`Found rider: ${rider.name} (ID: ${rider.id}), updating gender to female`);
            
            await db
              .update(riders)
              .set({ gender: 'female' })
              .where(eq(riders.id, rider.id));
          }
        } else {
          console.log(`No matching rider found for ${displayName}`);
        }
      } catch (error) {
        console.error(`Error processing rider ${displayName}:`, error);
      }
    }
    
    console.log('Gender update complete');
    
  } catch (error) {
    console.error('Error updating rider genders:', error);
  } finally {
    // Close pool when done
    await db.end?.();
  }
}

// Call the function
updateRidersFromUciData();