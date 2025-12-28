-- HSN/SAC Codes Database Schema with Advanced Fuzzy Search
-- This table stores all HSN/SAC codes with search optimization

-- 0. Enable extensions needed for advanced search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- 1. Create the main table
CREATE TABLE IF NOT EXISTS hsn_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hsn_code VARCHAR(10) NOT NULL,
  product_name VARCHAR(255),
  description TEXT NOT NULL,
  gst_rate VARCHAR(10) NOT NULL,
  product_type VARCHAR(10) NOT NULL CHECK (product_type IN ('GOODS', 'SERVICES')),
  category VARCHAR(50),
  keywords TEXT[], -- Array of search terms, synonyms, Hindi names
  confidence INTEGER DEFAULT 95 CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Safety Sync: Ensure all required columns exist if table was created by an older script
DO $$ 
BEGIN 
    -- product_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hsn_codes' AND column_name='product_name') THEN
        ALTER TABLE hsn_codes ADD COLUMN product_name VARCHAR(255);
    END IF;
    
    -- category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hsn_codes' AND column_name='category') THEN
        ALTER TABLE hsn_codes ADD COLUMN category VARCHAR(50);
    END IF;

    -- keywords
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hsn_codes' AND column_name='keywords') THEN
        ALTER TABLE hsn_codes ADD COLUMN keywords TEXT[];
    END IF;

    -- confidence
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hsn_codes' AND column_name='confidence') THEN
        ALTER TABLE hsn_codes ADD COLUMN confidence INTEGER DEFAULT 95;
    END IF;

    -- product_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hsn_codes' AND column_name='product_type') THEN
        ALTER TABLE hsn_codes ADD COLUMN product_type VARCHAR(10) DEFAULT 'GOODS' CHECK (product_type IN ('GOODS', 'SERVICES'));
    END IF;

    -- description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hsn_codes' AND column_name='description') THEN
        ALTER TABLE hsn_codes ADD COLUMN description TEXT DEFAULT '';
    END IF;

    -- gst_rate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hsn_codes' AND column_name='gst_rate') THEN
        ALTER TABLE hsn_codes ADD COLUMN gst_rate VARCHAR(10) DEFAULT '18%';
    END IF;
END $$;

-- 3. Create search optimization indexes
-- Helper function for immutable search vector (required for functional index)
CREATE OR REPLACE FUNCTION hsn_search_vector(p_name VARCHAR, p_desc TEXT, p_keys TEXT[])
RETURNS tsvector AS $$
BEGIN
  RETURN to_tsvector('english', COALESCE(p_name, '') || ' ' || COALESCE(p_desc, '') || ' ' || COALESCE(array_to_string(p_keys, ' '), ''));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigram index for fuzzy name matching
CREATE INDEX IF NOT EXISTS idx_hsn_trgm_name ON hsn_codes USING GIN(product_name gin_trgm_ops);

-- Full-text search index using the immutable helper
CREATE INDEX IF NOT EXISTS idx_hsn_search ON hsn_codes USING GIN(hsn_search_vector(product_name, description, keywords));

-- 5. ADVANCED SEARCH RPC
-- This is what geminiService.ts calls for high-quality results
DROP FUNCTION IF EXISTS search_hsn_advanced(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION search_hsn_advanced(search_query TEXT, match_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  hsn_code VARCHAR,
  product_name VARCHAR,
  description TEXT,
  gst_rate VARCHAR,
  product_type VARCHAR,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hsn.id,
    hsn.hsn_code,
    hsn.product_name,
    hsn.description,
    hsn.gst_rate,
    hsn.product_type,
    (
      -- Combine Full Text Search score with Trigram similarity
      ts_rank_cd(hsn_search_vector(hsn.product_name, hsn.description, hsn.keywords), plainto_tsquery('english', search_query)) * 0.7 +
      similarity(COALESCE(hsn.product_name, ''), search_query) * 0.3
    ) AS relevance
  FROM hsn_codes hsn
  WHERE 
    hsn_search_vector(hsn.product_name, hsn.description, hsn.keywords) @@ plainto_tsquery('english', search_query)
    OR hsn.product_name ILIKE '%' || search_query || '%'
    OR hsn.hsn_code ILIKE search_query || '%'
    OR (hsn.keywords IS NOT NULL AND hsn.keywords @> ARRAY[search_query])
  ORDER BY relevance DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- 6. Helper triggers and RLS
CREATE OR REPLACE FUNCTION update_hsn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hsn_codes_updated_at ON hsn_codes;
CREATE TRIGGER hsn_codes_updated_at BEFORE UPDATE ON hsn_codes FOR EACH ROW EXECUTE FUNCTION update_hsn_updated_at();

ALTER TABLE hsn_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "HSN codes are viewable by everyone" ON hsn_codes;
CREATE POLICY "HSN codes are viewable by everyone" ON hsn_codes FOR SELECT USING (true);
