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
    await db.execute(sql`
      ALTER TABLE riders
      ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'placeholder'
    `);
    await db.execute(sql`
      ALTER TABLE riders
      ADD COLUMN IF NOT EXISTS image_original_url TEXT
    `);
    await db.execute(sql`
      ALTER TABLE riders
      ADD COLUMN IF NOT EXISTS image_updated_at TIMESTAMPTZ
    `);
    await db.execute(sql`
      ALTER TABLE riders
      ADD COLUMN IF NOT EXISTS image_content_hash TEXT
    `);
    await db.execute(sql`
      ALTER TABLE riders
      ADD COLUMN IF NOT EXISTS image_mime_type TEXT
    `);
    await db.execute(sql`UPDATE riders SET image_source = 'placeholder' WHERE image_source IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN image_source SET DEFAULT 'placeholder'`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN image_source SET NOT NULL`);

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

    const checkActiveColumn = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'riders' AND column_name = 'active'
    `);

    const hasActiveColumn = checkActiveColumn.rows.length > 0;

    if (!hasActiveColumn) {
      console.log('Adding active column to riders table...');
      await db.execute(sql`
        ALTER TABLE riders
        ADD COLUMN active BOOLEAN DEFAULT FALSE
      `);
      console.log('active column added successfully.');
    } else {
      console.log('active column already exists, skipping migration.');
    }

    console.log('Aligning riders.active defaults with schema...');
    await db.execute(sql`UPDATE riders SET active = false WHERE active IS NULL`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN active SET DEFAULT false`);
    await db.execute(sql`ALTER TABLE riders ALTER COLUMN active SET NOT NULL`);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_riders_active ON riders(active) WHERE active = true
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_riders_active_gender ON riders(active, gender)
    `);
    
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

    const checkJokerActiveRaceColumn = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'joker_active_race_id'
    `);

    if (checkJokerActiveRaceColumn.rows.length === 0) {
      console.log('Adding joker_active_race_id column to users table...');
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN joker_active_race_id INTEGER
      `);
      console.log('joker_active_race_id column added successfully.');
    } else {
      console.log('joker_active_race_id column already exists, skipping migration.');
    }

    const checkJokerActiveTeamTypeColumn = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'joker_active_team_type'
    `);

    if (checkJokerActiveTeamTypeColumn.rows.length === 0) {
      console.log('Adding joker_active_team_type column to users table...');
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN joker_active_team_type VARCHAR
      `);
      console.log('joker_active_team_type column added successfully.');
    } else {
      console.log('joker_active_team_type column already exists, skipping migration.');
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
    
    // Add unique constraint to team name and align uniqueness with team types
    try {
      console.log('Adding unique constraints to teams table...');
      
      const checkUniqueNameConstraint = await db.execute(sql`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'teams' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name = 'unique_team_name'
      `);
      
      if (checkUniqueNameConstraint.rows.length === 0) {
        await db.execute(sql`
          ALTER TABLE teams
          ADD CONSTRAINT unique_team_name UNIQUE (name)
        `);
        console.log('Unique constraint for team name added successfully.');
      } else {
        console.log('Unique constraint for team name already exists.');
      }

      const checkTeamTypeColumn = await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'teams' AND column_name = 'team_type'
      `);

      if (checkTeamTypeColumn.rows.length === 0) {
        console.log('Adding team_type column to teams table...');
        await db.execute(sql`
          ALTER TABLE teams
          ADD COLUMN team_type TEXT DEFAULT 'elite'
        `);
      }

      await db.execute(sql`UPDATE teams SET team_type = 'elite' WHERE team_type IS NULL`);
      await db.execute(sql`ALTER TABLE teams ALTER COLUMN team_type SET DEFAULT 'elite'`);
      await db.execute(sql`ALTER TABLE teams ALTER COLUMN team_type SET NOT NULL`);

      await db.execute(sql`ALTER TABLE teams DROP CONSTRAINT IF EXISTS unique_user_id`);
      await db.execute(sql`ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_user_id_key`);

      const checkCompositeIndex = await db.execute(sql`
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'teams'
        AND indexname = 'idx_teams_user_type'
      `);

      if (checkCompositeIndex.rows.length === 0) {
        console.log('Adding unique composite index for teams (user_id, team_type)...');
        await db.execute(sql`
          CREATE UNIQUE INDEX idx_teams_user_type ON teams(user_id, team_type)
        `);
      } else {
        console.log('Composite user/team_type index already exists.');
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

    console.log('Ensuring rider_cost_updates table exists...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rider_cost_updates (
        id SERIAL PRIMARY KEY,
        race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
        uci_id TEXT NOT NULL REFERENCES riders(uci_id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        position INTEGER,
        previous_cost INTEGER NOT NULL,
        updated_cost INTEGER NOT NULL,
        delta INTEGER NOT NULL,
        results_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_cost_updates_race_uci
      ON rider_cost_updates(race_id, uci_id)
    `);

    // Ensure there is at least one upcoming race so clients and scoring
    // consumers have something to reference.
    // Skip seeding in test mode (when TEST_NOW_ISO is set) to avoid conflicts.
    if (process.env.TEST_NOW_ISO) {
      console.log('Skipping placeholder race seeding (test mode)');
    } else {
      const seasonCheck = await db.execute(sql`
        SELECT id FROM seasons ORDER BY id ASC LIMIT 1
      `);

      if (seasonCheck.rows.length > 0) {
        const seasonId = (seasonCheck.rows[0] as { id: number }).id;
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
            INSERT INTO races (season_id, name, location, country, start_date, end_date, lock_at, image_url)
            VALUES (
              ${seasonId},
              'Fantasy League Opener',
              'Snowmass, Colorado',
              'USA',
              NOW() + interval '14 days',
              NOW() + interval '15 days',
              NOW() + interval '12 days',
              'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80'
            )
          `);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
}
