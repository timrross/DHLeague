import { pool } from "./db";
import { log } from "./vite";

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    joker_card_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire)`,
  `CREATE TABLE IF NOT EXISTS riders (
    id SERIAL PRIMARY KEY,
    rider_id TEXT NOT NULL UNIQUE,
    uci_id TEXT NOT NULL UNIQUE,
    dataride_object_id TEXT,
    dataride_team_code TEXT,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    gender TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'elite',
    team TEXT NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0,
    last_year_standing INTEGER NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT '',
    image_source TEXT NOT NULL DEFAULT 'placeholder',
    image_original_url TEXT,
    image_updated_at TIMESTAMPTZ,
    image_content_hash TEXT,
    image_mime_type TEXT,
    country TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    form TEXT NOT NULL DEFAULT '[]',
    injured BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS uci_id TEXT`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS dataride_object_id TEXT`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS dataride_team_code TEXT`,
  `UPDATE riders SET uci_id = rider_id WHERE uci_id IS NULL`,
  `ALTER TABLE riders ALTER COLUMN uci_id SET NOT NULL`,
  `UPDATE riders SET category = 'elite' WHERE category IS NULL`,
  `ALTER TABLE riders ALTER COLUMN category SET NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_riders_uci_id ON riders(uci_id)`,
  `CREATE INDEX IF NOT EXISTS idx_riders_category ON riders(category)`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS image_source TEXT NOT NULL DEFAULT 'placeholder'`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS image_original_url TEXT`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS image_updated_at TIMESTAMPTZ`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS image_content_hash TEXT`,
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS image_mime_type TEXT`,
  `UPDATE riders SET image_source = 'placeholder' WHERE image_source IS NULL`,
  `ALTER TABLE riders ALTER COLUMN image_source SET DEFAULT 'placeholder'`,
  `ALTER TABLE riders ALTER COLUMN image_source SET NOT NULL`,
  `CREATE TABLE IF NOT EXISTS races (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    country TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    image_url TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_type TEXT NOT NULL DEFAULT 'elite',
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    total_points INTEGER DEFAULT 0,
    swaps_used INTEGER DEFAULT 0,
    swaps_remaining INTEGER DEFAULT 2,
    current_race_id INTEGER REFERENCES races(id),
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMPTZ
  )`,
  `ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_user_id_key`,
  `ALTER TABLE teams DROP CONSTRAINT IF EXISTS unique_user_id`,
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_type TEXT`,
  `UPDATE teams SET team_type = 'elite' WHERE team_type IS NULL`,
  `ALTER TABLE teams ALTER COLUMN team_type SET NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_user_type ON teams(user_id, team_type)`,
  `CREATE TABLE IF NOT EXISTS team_riders (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    rider_id INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_riders_team_rider ON team_riders(team_id, rider_id)`,
  `CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    rider_id INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    points INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_results_race_rider ON results(race_id, rider_id)`,
  `CREATE TABLE IF NOT EXISTS team_swaps (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    removed_rider_id INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    added_rider_id INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    swapped_at TIMESTAMPTZ DEFAULT NOW()
  )`
];

export async function ensureDatabaseSchema() {
  for (const statement of schemaStatements) {
    await pool.query(statement);
  }
  log("database schema verified");
}
