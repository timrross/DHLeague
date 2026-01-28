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
    joker_active_race_id INTEGER,
    joker_active_team_type VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMPTZ NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire)`,
  `CREATE TABLE IF NOT EXISTS seasons (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE seasons ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE`,
  `INSERT INTO seasons (name, start_at, end_at)
    SELECT
      'Season ' || EXTRACT(YEAR FROM NOW())::TEXT,
      date_trunc('year', NOW()),
      (date_trunc('year', NOW()) + interval '1 year' - interval '1 day')
    WHERE NOT EXISTS (SELECT 1 FROM seasons)
  `,
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
    injured BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT FALSE
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
  `ALTER TABLE riders ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT FALSE`,
  `UPDATE riders SET active = false WHERE active IS NULL`,
  `ALTER TABLE riders ALTER COLUMN active SET DEFAULT false`,
  `ALTER TABLE riders ALTER COLUMN active SET NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_riders_active ON riders(active) WHERE active = true`,
  `CREATE INDEX IF NOT EXISTS idx_riders_active_gender ON riders(active, gender)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS joker_active_race_id INTEGER`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS joker_active_team_type VARCHAR`,
  `CREATE TABLE IF NOT EXISTS races (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    country TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    image_url TEXT,
    discipline TEXT NOT NULL DEFAULT 'DHI',
    lock_at TIMESTAMPTZ NOT NULL,
    game_status TEXT NOT NULL DEFAULT 'scheduled',
    needs_resettle BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `ALTER TABLE races ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE`,
  `ALTER TABLE races ADD COLUMN IF NOT EXISTS discipline TEXT`,
  `ALTER TABLE races ADD COLUMN IF NOT EXISTS lock_at TIMESTAMPTZ`,
  `ALTER TABLE races ADD COLUMN IF NOT EXISTS game_status TEXT`,
  `ALTER TABLE races ADD COLUMN IF NOT EXISTS needs_resettle BOOLEAN`,
  `UPDATE races SET season_id = (SELECT id FROM seasons ORDER BY start_at ASC LIMIT 1) WHERE season_id IS NULL`,
  `UPDATE races SET discipline = 'DHI' WHERE discipline IS NULL`,
  `UPDATE races SET lock_at = start_date - interval '2 days' WHERE lock_at IS NULL`,
  `UPDATE races SET game_status = 'scheduled' WHERE game_status IS NULL`,
  `UPDATE races SET needs_resettle = FALSE WHERE needs_resettle IS NULL`,
  `ALTER TABLE races ALTER COLUMN season_id SET NOT NULL`,
  `ALTER TABLE races ALTER COLUMN discipline SET NOT NULL`,
  `ALTER TABLE races ALTER COLUMN lock_at SET NOT NULL`,
  `ALTER TABLE races ALTER COLUMN game_status SET NOT NULL`,
  `ALTER TABLE races ALTER COLUMN needs_resettle SET NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_races_season_id ON races(season_id)`,
  `CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_type TEXT NOT NULL DEFAULT 'elite',
    name TEXT NOT NULL UNIQUE,
    budget_cap INTEGER NOT NULL DEFAULT 2000000,
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
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE`,
  `UPDATE teams SET season_id = (SELECT id FROM seasons ORDER BY start_at ASC LIMIT 1) WHERE season_id IS NULL`,
  `ALTER TABLE teams ALTER COLUMN season_id SET NOT NULL`,
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_type TEXT`,
  `UPDATE teams SET team_type = 'elite' WHERE team_type IS NULL`,
  `ALTER TABLE teams ALTER COLUMN team_type SET NOT NULL`,
  `ALTER TABLE teams ADD COLUMN IF NOT EXISTS budget_cap INTEGER`,
  `UPDATE teams SET budget_cap = CASE WHEN team_type = 'junior' THEN 500000 ELSE 2000000 END WHERE budget_cap IS NULL`,
  `ALTER TABLE teams ALTER COLUMN budget_cap SET NOT NULL`,
  `DROP INDEX IF EXISTS idx_teams_user_type`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_user_season_type ON teams(user_id, season_id, team_type)`,
  `CREATE TABLE IF NOT EXISTS team_riders (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    rider_id INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_riders_team_rider ON team_riders(team_id, rider_id)`,
  `CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    uci_id TEXT NOT NULL REFERENCES riders(uci_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    starter_index INTEGER,
    gender TEXT NOT NULL,
    cost_at_save INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_role_slot ON team_members(team_id, role, starter_index)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_bench ON team_members(team_id) WHERE role = 'BENCH'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_uci ON team_members(team_id, uci_id)`,
  `CREATE TABLE IF NOT EXISTS race_snapshots (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_type TEXT NOT NULL,
    starters_json JSONB NOT NULL,
    bench_json JSONB,
    total_cost_at_lock INTEGER NOT NULL,
    snapshot_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (race_id, user_id, team_type)
  )`,
  `CREATE TABLE IF NOT EXISTS race_results (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    uci_id TEXT NOT NULL,
    status TEXT NOT NULL,
    position INTEGER,
    qualification_position INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (race_id, uci_id)
  )`,
  `CREATE TABLE IF NOT EXISTS race_result_imports (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    gender TEXT NOT NULL,
    category TEXT NOT NULL,
    discipline TEXT NOT NULL DEFAULT 'DHI',
    source_url TEXT,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (race_id, gender, category, discipline)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_race_result_imports_race_id ON race_result_imports(race_id)`,
  `CREATE TABLE IF NOT EXISTS race_result_sets (
    race_id INTEGER PRIMARY KEY REFERENCES races(id) ON DELETE CASCADE,
    results_hash TEXT NOT NULL,
    source TEXT,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS race_scores (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_type TEXT NOT NULL,
    total_points INTEGER NOT NULL,
    breakdown_json JSONB NOT NULL,
    snapshot_hash_used TEXT NOT NULL,
    results_hash_used TEXT NOT NULL,
    settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (race_id, user_id, team_type)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_race_scores_race_id ON race_scores(race_id)`,
  `CREATE INDEX IF NOT EXISTS idx_race_scores_user_id ON race_scores(user_id)`,
  `CREATE TABLE IF NOT EXISTS rider_cost_updates (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    uci_id TEXT NOT NULL REFERENCES riders(uci_id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    position INTEGER,
    previous_cost INTEGER NOT NULL,
    updated_cost INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    results_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (race_id, uci_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rider_cost_updates_race_id ON rider_cost_updates(race_id)`,
  `CREATE TABLE IF NOT EXISTS team_swaps (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    race_id INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    removed_rider_id INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    added_rider_id INTEGER NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    swapped_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    requester_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (requester_id, addressee_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_friends_requester_id ON friends(requester_id)`,
  `CREATE INDEX IF NOT EXISTS idx_friends_addressee_id ON friends(addressee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status)`
];

export async function ensureDatabaseSchema() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [781964321]);
    for (const statement of schemaStatements) {
      await client.query(statement);
    }
    log("database schema verified");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [781964321]);
    client.release();
  }
}
