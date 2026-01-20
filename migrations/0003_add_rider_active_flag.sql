-- Add active flag to riders table
-- Only active riders are shown in the team builder (top 200 per gender)
ALTER TABLE riders
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient filtering by active status
CREATE INDEX IF NOT EXISTS idx_riders_active ON riders (active) WHERE active = true;

-- Create composite index for active + gender queries
CREATE INDEX IF NOT EXISTS idx_riders_active_gender ON riders (active, gender);
