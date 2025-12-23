ALTER TABLE riders
  ADD COLUMN IF NOT EXISTS image_source TEXT NOT NULL DEFAULT 'placeholder',
  ADD COLUMN IF NOT EXISTS image_original_url TEXT,
  ADD COLUMN IF NOT EXISTS image_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS image_content_hash TEXT,
  ADD COLUMN IF NOT EXISTS image_mime_type TEXT;

UPDATE riders SET image_source = 'placeholder' WHERE image_source IS NULL;

ALTER TABLE riders
  ALTER COLUMN image_source SET DEFAULT 'placeholder',
  ALTER COLUMN image_source SET NOT NULL;
