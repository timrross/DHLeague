// Script to update rider genders based on UCI data
const { db } = require('../db');
const { riders } = require('../../shared/schema');
const { eq, or, ilike } = require('drizzle-orm');

// Women's elite rider data from UCI
const femaleRiders = [
  "DUNNE Ronan",
  "KOLB Andreas"
  // This is a partial list from the provided sample data
  // In reality, we'd process the full list from the actual API response
];

async function updateRiderGenders() {
  try {
    console.log('Updating rider genders from UCI data...');
    let totalUpdated = 0;
    
    // Get all riders from database
    const allRiders = await db.select().from(riders);
    console.log(`Total riders in database: ${allRiders.length}`);
    
    for (const uciRider of femaleRiders) {
      try {
        // Split the name
        const parts = uciRider.split(' ');
        if (parts.length < 2) continue;
        
        const lastName = parts[0];
        const firstName = parts.slice(1).join(' ');
        
        // Find potential matches in our database
        const matchingRiders = allRiders.filter(dbRider => {
          const name = dbRider.name?.toLowerCase() || '';
          const lastNameMatch = name.includes(lastName.toLowerCase());
          const firstNameMatch = name.includes(firstName.toLowerCase());
          
          return lastNameMatch && firstNameMatch;
        });
        
        if (matchingRiders.length > 0) {
          // Update each matching rider
          for (const rider of matchingRiders) {
            console.log(`Found rider: ${rider.name} (ID: ${rider.id}), updating gender to female`);
            
            await db
              .update(riders)
              .set({ gender: 'female' })
              .where(eq(riders.id, rider.id));
              
            totalUpdated++;
          }
        } else {
          console.log(`No matching rider found for ${uciRider}`);
        }
      } catch (error) {
        console.error(`Error processing rider ${uciRider}:`, error);
      }
    }
    
    console.log(`Gender update complete. Updated ${totalUpdated} riders.`);
    
  } catch (error) {
    console.error('Error updating rider genders:', error);
  }
}

// Parse the complete UCI data directly instead of making API call
const parseAndUpdateFromPastedData = async () => {
  try {
    // This is where we'd parse the pasted data from the attached file
    // For now, we'll just call the function with our sample data
    await updateRiderGenders();
  } catch (error) {
    console.error('Error parsing and updating from pasted data:', error);
  }
};

// Run the update process
parseAndUpdateFromPastedData();