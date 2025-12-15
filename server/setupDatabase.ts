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
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    gender TEXT NOT NULL,
    team TEXT NOT NULL,
    cost INTEGER NOT NULL DEFAULT 0,
    last_year_standing INTEGER NOT NULL DEFAULT 0,
    image TEXT NOT NULL DEFAULT '',
    country TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    form TEXT NOT NULL DEFAULT '[]',
    injured BOOLEAN NOT NULL DEFAULT FALSE
  )`,
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
    user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
