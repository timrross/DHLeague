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
    
    // Check if injured column exists
    const checkInjuredColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'riders' AND column_name = 'injured'
    `);
    
    const hasInjuredColumn = checkInjuredColumn.rows.length > 0;
    
    if (!hasInjuredColumn) {
      console.log('Adding injured column to riders table...');
      
      // Add the injured column with default false
      await db.execute(sql`
        ALTER TABLE riders 
        ADD COLUMN injured BOOLEAN DEFAULT FALSE
      `);
      
      console.log('injured column added successfully.');
    } else {
      console.log('injured column already exists, skipping migration.');
    }
    
    // Check if joker_card_used column exists in users table
    const checkJokerCardColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'joker_card_used'
    `);
    
    const hasJokerCardColumn = checkJokerCardColumn.rows.length > 0;
    
    if (!hasJokerCardColumn) {
      console.log('Adding joker_card_used column to users table...');
      
      // Add the joker_card_used column with default false
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN joker_card_used BOOLEAN DEFAULT FALSE
      `);
      
      console.log('joker_card_used column added successfully.');
    } else {
      console.log('joker_card_used column already exists, skipping migration.');
    }
    
    // Check if swaps_remaining column exists in teams table
    const checkSwapsRemainingColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teams' AND column_name = 'swaps_remaining'
    `);
    
    const hasSwapsRemainingColumn = checkSwapsRemainingColumn.rows.length > 0;
    
    if (!hasSwapsRemainingColumn) {
      console.log('Adding swaps_remaining column to teams table...');
      
      // Add the swaps_remaining column with default 2
      await db.execute(sql`
        ALTER TABLE teams 
        ADD COLUMN swaps_remaining INTEGER DEFAULT 2
      `);
      
      console.log('swaps_remaining column added successfully.');
    } else {
      console.log('swaps_remaining column already exists, skipping migration.');
    }
    
    // Add unique constraints to team name and one team per user
    try {
      console.log('Adding unique constraints to teams table...');
      
      // Check if unique constraints already exist
      const checkUniqueNameConstraint = await db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'teams' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'unique_team_name'
      `);
      
      if (checkUniqueNameConstraint.rows.length === 0) {
        // Add unique constraint to team name
        await db.execute(sql`
          ALTER TABLE teams
          ADD CONSTRAINT unique_team_name UNIQUE (name)
        `);
        console.log('Unique constraint for team name added successfully.');
      } else {
        console.log('Unique constraint for team name already exists.');
      }
      
      const checkUniqueUserConstraint = await db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'teams' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'unique_user_id'
      `);
      
      if (checkUniqueUserConstraint.rows.length === 0) {
        // Add unique constraint to user_id (one team per user)
        await db.execute(sql`
          ALTER TABLE teams
          ADD CONSTRAINT unique_user_id UNIQUE (user_id)
        `);
        console.log('Unique constraint for one team per user added successfully.');
      } else {
        console.log('Unique constraint for one team per user already exists.');
      }
    } catch (error) {
      console.error('Error adding unique constraints:', error);
      // Continue with other migrations even if this one fails
    }

    // Create indexes to support rider filtering and sorting
    const riderIndexes = [
      { name: 'idx_riders_gender', query: sql`CREATE INDEX idx_riders_gender ON riders (gender)` },
      { name: 'idx_riders_cost', query: sql`CREATE INDEX idx_riders_cost ON riders (cost)` },
      { name: 'idx_riders_team_lower', query: sql`CREATE INDEX idx_riders_team_lower ON riders (LOWER(team))` },
      { name: 'idx_riders_name_lower', query: sql`CREATE INDEX idx_riders_name_lower ON riders (LOWER(name))` },
      { name: 'idx_riders_last_year_standing', query: sql`CREATE INDEX idx_riders_last_year_standing ON riders (last_year_standing)` },
      { name: 'idx_riders_points', query: sql`CREATE INDEX idx_riders_points ON riders (points)` }
    ];

    for (const riderIndex of riderIndexes) {
      const indexExists = await db.execute(sql`
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'riders'
        AND indexname = ${riderIndex.name}
      `);

      if (indexExists.rows.length === 0) {
        console.log(`Creating index ${riderIndex.name}...`);
        await db.execute(riderIndex.query);
      } else {
        console.log(`Index ${riderIndex.name} already exists, skipping.`);
      }
    }

    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
}