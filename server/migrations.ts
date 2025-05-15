import { db } from './db';
import { sql } from 'drizzle-orm';
import { generateRiderId } from '@shared/utils';

/**
 * Migrations to handle schema changes
 */
export async function runMigrations() {
  console.log('Running database migrations...');
  
  try {
    // Check if rider_id column exists
    const checkRiderIdColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'riders' AND column_name = 'rider_id'
    `);
    
    const hasRiderIdColumn = checkRiderIdColumn.rows.length > 0;
    
    if (!hasRiderIdColumn) {
      console.log('Adding rider_id column to riders table...');
      
      // Add the rider_id column
      await db.execute(sql`
        ALTER TABLE riders 
        ADD COLUMN rider_id TEXT
      `);
      
      // Update existing records to generate rider_id based on name
      const allRiders = await db.execute(sql`SELECT id, name FROM riders`);
      
      for (const rider of allRiders.rows) {
        const name = rider.name as string;
        const id = rider.id as number;
        const riderId = generateRiderId(name);
        await db.execute(sql`
          UPDATE riders 
          SET rider_id = ${riderId} 
          WHERE id = ${id}
        `);
      }
      
      // Now make the column NOT NULL
      await db.execute(sql`
        ALTER TABLE riders 
        ALTER COLUMN rider_id SET NOT NULL
      `);
      
      console.log('rider_id column added and populated successfully.');
    } else {
      console.log('rider_id column already exists, skipping migration.');
    }
    
    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
}