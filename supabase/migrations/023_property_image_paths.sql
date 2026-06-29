ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS property_image_paths jsonb NOT NULL DEFAULT '[]'::jsonb;
