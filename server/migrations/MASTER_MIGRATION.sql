-- ========================================
-- MASTER MIGRATION - COMPLETE SCHEMA & FIXES
-- ========================================

-- ---------------------------------------------------------
-- 0. HELPER FUNCTIONS
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'PLATFORM_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------
-- 1. CREATE TABLES (IF NOT EXISTS)
-- ---------------------------------------------------------

-- 1.1 Packaging Units
CREATE TABLE IF NOT EXISTS packaging_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL,
  conversion_factor DECIMAL(10,2) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  name VARCHAR(50) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO system_settings (name, value) VALUES 
('maintenance_mode', 'false'),
('signups_enabled', 'true')
ON CONFLICT (name) DO NOTHING;

-- 1.3 Stock Logs
CREATE TABLE IF NOT EXISTS stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  product_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  change_amt INTEGER NOT NULL,
  reason TEXT,
  date VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  manager VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 2. ADD MISSING COLUMNS
-- ---------------------------------------------------------

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS alert_threshold INTEGER DEFAULT 10;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;

-- Invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Firm Settings (Ensuring all potentially used columns exist)
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS acc_number VARCHAR(100);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS ifsc VARCHAR(50);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS declaration TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS tagline VARCHAR(255);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS pan VARCHAR(50);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS web VARCHAR(255);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS firm_name VARCHAR(255); -- Ensure this exists for mapping

-- ---------------------------------------------------------
-- 3. CLEAN DATA & ADD CONSTRAINTS
-- ---------------------------------------------------------

-- 3.1 Fix Duplicate Firm Settings (Keep latest)
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) as row_num
  FROM firm_settings
)
DELETE FROM firm_settings
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 3.2 Unique Constraint on firm_settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'firm_settings_tenant_id_key'
    ) THEN
        ALTER TABLE firm_settings ADD CONSTRAINT firm_settings_tenant_id_key UNIQUE (tenant_id);
    END IF;
END $$;

-- ---------------------------------------------------------
-- 4. ENABLE RLS
-- ---------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- 5. DROP OLD POLICIES (Full Cleanup)
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can select customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;
DROP POLICY IF EXISTS "Users can delete customers" ON customers;

DROP POLICY IF EXISTS "Users can manage their own settings" ON firm_settings;
DROP POLICY IF EXISTS "Users can insert settings" ON firm_settings;
DROP POLICY IF EXISTS "Users can select settings" ON firm_settings;
DROP POLICY IF EXISTS "Users can update settings" ON firm_settings;
DROP POLICY IF EXISTS "Users can manage settings" ON firm_settings;
DROP POLICY IF EXISTS "Admins can view settings" ON firm_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON firm_settings;

DROP POLICY IF EXISTS "Users can manage their own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Users can select inventory" ON inventory;
DROP POLICY IF EXISTS "Users can update inventory" ON inventory;
DROP POLICY IF EXISTS "Users can delete inventory" ON inventory;
DROP POLICY IF EXISTS "Users and Admins can select inventory" ON inventory;

DROP POLICY IF EXISTS "Users can manage their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Users can select invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON invoices;

DROP POLICY IF EXISTS "Users can manage invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert invoice items" ON invoice_items;
DROP POLICY IF EXISTS "Users can select invoice items" ON invoice_items;

DROP POLICY IF EXISTS "Users can manage packaging units" ON packaging_units;
DROP POLICY IF EXISTS "Users can insert packaging units" ON packaging_units;
DROP POLICY IF EXISTS "Users can select packaging units" ON packaging_units;

DROP POLICY IF EXISTS "Users can manage stock logs" ON stock_logs;
DROP POLICY IF EXISTS "Users can insert stock logs" ON stock_logs;
DROP POLICY IF EXISTS "Users can select stock logs" ON stock_logs;

DROP POLICY IF EXISTS "Users can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Users can insert warehouses" ON warehouses;
DROP POLICY IF EXISTS "Users can select warehouses" ON warehouses;
DROP POLICY IF EXISTS "Users can update warehouses" ON warehouses;
DROP POLICY IF EXISTS "Users can delete warehouses" ON warehouses;

DROP POLICY IF EXISTS "Public read system settings" ON system_settings;
DROP POLICY IF EXISTS "Admin update system settings" ON system_settings;
DROP POLICY IF EXISTS "Admin manage system settings" ON system_settings;

DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users and Admins can read profiles" ON users;
DROP POLICY IF EXISTS "Users and Admins can update profiles" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- ---------------------------------------------------------
-- 6. CREATE NEW POLICIES
-- ---------------------------------------------------------

-- 6.1 Users (Tenants Directory & Profile)
CREATE POLICY "Users and Admins can read profiles" ON users
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users and Admins can update profiles" ON users
  FOR UPDATE USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (is_admin());

-- 6.2 System Settings (Master Toggles)
CREATE POLICY "Public read system settings" ON system_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin update system settings" ON system_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 6.3 Firm Settings (Profile Sync)
CREATE POLICY "Users can manage settings" ON firm_settings
  FOR ALL USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Admins can view settings" ON firm_settings
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update settings" ON firm_settings
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- 6.4 Inventory (Stats access for Admin)
CREATE POLICY "Users and Admins can select inventory" ON inventory
  FOR SELECT USING (tenant_id = auth.uid() OR is_admin());

CREATE POLICY "Users can insert inventory" ON inventory
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can update inventory" ON inventory
  FOR UPDATE USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Users can delete inventory" ON inventory
  FOR DELETE USING (tenant_id = auth.uid());

-- 6.5 Customers
CREATE POLICY "Users can insert customers" ON customers
  FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can select customers" ON customers
  FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can update customers" ON customers
  FOR UPDATE USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can delete customers" ON customers
  FOR DELETE USING (tenant_id = auth.uid());

-- 6.6 Invoices
CREATE POLICY "Users can insert invoices" ON invoices
  FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can select invoices" ON invoices
  FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can update invoices" ON invoices
  FOR UPDATE USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

-- 6.7 Invoice Items
CREATE POLICY "Users can insert invoice items" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.tenant_id = auth.uid())
  );
CREATE POLICY "Users can select invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.tenant_id = auth.uid())
  );

-- 6.8 Packaging Units
CREATE POLICY "Users can insert packaging units" ON packaging_units
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM inventory WHERE inventory.id = packaging_units.product_id AND inventory.tenant_id = auth.uid())
  );
CREATE POLICY "Users can select packaging units" ON packaging_units
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM inventory WHERE inventory.id = packaging_units.product_id AND inventory.tenant_id = auth.uid())
  );

-- 6.9 Stock Logs
CREATE POLICY "Users can insert stock logs" ON stock_logs
  FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can select stock logs" ON stock_logs
  FOR SELECT USING (tenant_id = auth.uid());

-- 6.10 Warehouses
CREATE POLICY "Users can insert warehouses" ON warehouses
  FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can select warehouses" ON warehouses
  FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Users can update warehouses" ON warehouses
  FOR UPDATE USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Users can delete warehouses" ON warehouses
  FOR DELETE USING (tenant_id = auth.uid());

-- ---------------------------------------------------------
-- 7. GRANT PERMISSIONS
-- ---------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON firm_settings TO authenticated;
GRANT ALL ON inventory TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_items TO authenticated;
GRANT ALL ON packaging_units TO authenticated;
GRANT ALL ON stock_logs TO authenticated;
GRANT ALL ON warehouses TO authenticated;
GRANT SELECT ON system_settings TO authenticated;
-- Only allow update if policy permits (admin), but need grant
GRANT UPDATE, INSERT ON system_settings TO authenticated; 
GRANT ALL ON users TO authenticated;

-- ---------------------------------------------------------
-- 8. INDEXES
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_firm_settings_tenant ON firm_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packaging_units_product ON packaging_units(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_tenant ON stock_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);

-- ========================================
-- MIGRATION COMPLETE ✅
-- ========================================
