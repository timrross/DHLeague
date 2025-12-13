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

    // Enforce unique rider IDs for consistent lookups
    const uniqueRiderIdConstraint = await db.execute(sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'riders'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'unique_rider_id'
    `);

    if (uniqueRiderIdConstraint.rows.length === 0) {
      console.log('Adding unique constraint to riders.rider_id...');
      await db.execute(sql`
        ALTER TABLE riders
        ADD CONSTRAINT unique_rider_id UNIQUE (rider_id)
      `);
    } else {
      console.log('unique_rider_id constraint already exists, skipping.');
    }

    // Ensure gender is non-nullable
    const genderNullableCheck = await db.execute(sql`
      SELECT is_nullable
      FROM information_schema.columns
      WHERE table_name = 'riders' AND column_name = 'gender'
    `);

    const genderIsNullable = genderNullableCheck.rows[0]?.is_nullable === 'YES';

    if (genderIsNullable) {
      console.log('Ensuring riders.gender is not null...');
      await db.execute(sql`UPDATE riders SET gender = 'male' WHERE gender IS NULL`);
      await db.execute(sql`ALTER TABLE riders ALTER COLUMN gender SET NOT NULL`);
    } else {
      console.log('riders.gender is already non-nullable.');
    }

    // Ensure cost defaults and non-null constraint
    console.log('Ensuring riders.cost has defaults and is non-nullable...');
    await db.execute(sql`UPDATE riders SET cost = 0 WHERE cost IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN cost SET DEFAULT 0`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN cost SET NOT NULL`);

    // Align points, last_year_standing, image, and form columns with schema defaults
    console.log('Aligning riders numeric and text defaults with schema...');
    await db.execute(sql`UPDATE riders SET points = 0 WHERE points IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN points SET DEFAULT 0`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN points SET NOT NULL`);

    await db.execute(sql`UPDATE riders SET last_year_standing = 0 WHERE last_year_standing IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN last_year_standing SET DEFAULT 0`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN last_year_standing SET NOT NULL`);

    await db.execute(sql`UPDATE riders SET image = '' WHERE image IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN image SET DEFAULT ''`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN image SET NOT NULL`);

    await db.execute(sql`UPDATE riders SET form = '[]' WHERE form IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN form SET DEFAULT '[]'`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN form SET NOT NULL`);

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

    console.log('Aligning riders.injured defaults with schema...');
    await db.execute(sql`UPDATE riders SET injured = false WHERE injured IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN injured SET DEFAULT false`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN injured SET NOT NULL`);
    
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

    // Ensure there is at least one upcoming race so clients and scoring
    // consumers have something to reference.
    const upcomingRaceCheck = await db.execute(sql`
      SELECT id
      FROM races
      WHERE start_date > NOW()
      ORDER BY start_date ASC
      LIMIT 1
    `);

    if (upcomingRaceCheck.rows.length === 0) {
      console.log('Seeding placeholder upcoming race...');
      await db.execute(sql`
        INSERT INTO races (name, location, country, start_date, end_date, image_url)
        VALUES (
          'Fantasy League Opener',
          'Snowmass, Colorado',
          'USA',
          NOW() + interval '14 days',
          NOW() + interval '15 days',
          'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80'
        )
      `);
    }

    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
}