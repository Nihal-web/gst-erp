-- Migration to add Product Name and Description to Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure firm_settings has tenant_id unique for sync to work correctly with upsert
-- Assuming it might not have been set up with unique constraint in previous iterations
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'firm_settings_tenant_id_key'
    ) THEN
        ALTER TABLE firm_settings ADD CONSTRAINT firm_settings_tenant_id_key UNIQUE (tenant_id);
    END IF;
END $$;
