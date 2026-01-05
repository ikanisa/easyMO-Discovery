-- Migration: Expand businesses table schema
-- Date: 2026-01-05
-- Description: Adds additional columns to match CSV import for comprehensive business directory

BEGIN;

-- Add new columns if they don't exist
DO $$
BEGIN
    -- Text fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'description') THEN
        ALTER TABLE businesses ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'website') THEN
        ALTER TABLE businesses ADD COLUMN website TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'email') THEN
        ALTER TABLE businesses ADD COLUMN email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'operating_hours') THEN
        ALTER TABLE businesses ADD COLUMN operating_hours TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'owner_whatsapp') THEN
        ALTER TABLE businesses ADD COLUMN owner_whatsapp TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'city') THEN
        ALTER TABLE businesses ADD COLUMN city TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'country') THEN
        ALTER TABLE businesses ADD COLUMN country TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'external_id') THEN
        ALTER TABLE businesses ADD COLUMN external_id TEXT;
        ALTER TABLE businesses ADD CONSTRAINT businesses_external_id_unique UNIQUE (external_id);
    END IF;

    -- Numeric/Boolean/Array fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'rating') THEN
        ALTER TABLE businesses ADD COLUMN rating NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'review_count') THEN
        ALTER TABLE businesses ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'tags') THEN
        ALTER TABLE businesses ADD COLUMN tags TEXT[];
    END IF;
    
    -- Additional fields from CSV that might be useful
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'buy_sell_category') THEN
        ALTER TABLE businesses ADD COLUMN buy_sell_category TEXT;
    END IF;

END $$;

-- Create indexes for new search/filter columns
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON businesses(rating DESC);
CREATE INDEX IF NOT EXISTS idx_businesses_external_id ON businesses(external_id);
CREATE INDEX IF NOT EXISTS idx_businesses_tags ON businesses USING GIN(tags);

COMMIT;
