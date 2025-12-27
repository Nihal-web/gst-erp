-- Migration: Add Packaging Units and Base Unit Stock Logic

-- 1. Add alert_threshold to inventory (used as Base Unit stock)
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS alert_threshold INT DEFAULT 10;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50); -- Optional: to explicitly store "KG", "ML" if different from 'unit'

-- 2. Create Packaging Units table
CREATE TABLE IF NOT EXISTS packaging_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL,       -- e.g., "Box", "Katta", "Bottle"
  conversion_factor DECIMAL(10, 2) NOT NULL, -- e.g., 10.00 (means 1 Box = 10 Base Units)
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_packaging_units_product ON packaging_units(product_id);
