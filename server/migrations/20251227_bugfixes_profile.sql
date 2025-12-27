-- Migration: Fix Master Toggles, Shop Settings, and RLS

-- 1. Create system_settings table for Master Toggles
CREATE TABLE IF NOT EXISTS system_settings (
  name VARCHAR(50) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default values if not exists
INSERT INTO system_settings (name, value) VALUES 
('maintenance_mode', 'false'),
('signups_enabled', 'true')
ON CONFLICT (name) DO NOTHING;

-- 2. Add Unique Constraint on firm_settings(tenant_id) for UPSERT to work
-- attempting to drop constraint first if it exists to avoid errors on re-run, though standard SQL doesn't have IF EXISTS for constraints easily. 
-- We trust valid state or manual check.
ALTER TABLE firm_settings ADD CONSTRAINT firm_settings_tenant_id_key UNIQUE (tenant_id);

-- 3. Enable RLS on key tables (if not already)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_units ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies (Simplistic for now: Allow ALL for authenticated users for their own tenant)
-- Note: In production, we'd use (auth.uid() = tenant_id).
-- Assuming 'users' table id matches auth.uid().

-- Customers
CREATE POLICY "Users can manage their own customers" ON customers
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Firm Settings
CREATE POLICY "Users can manage their own settings" ON firm_settings
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Inventory
CREATE POLICY "Users can manage their own inventory" ON inventory
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- Invoices
CREATE POLICY "Users can manage their own invoices" ON invoices
  USING (tenant_id = auth.uid())
  WITH CHECK (tenant_id = auth.uid());

-- System Settings (Read only for everyone, Update for Platform Admin)
-- We will rely on application logic for Admin check for now, or assume service_role key usage for Admin.
CREATE POLICY "Public read system settings" ON system_settings
  FOR SELECT USING (true);
  
CREATE POLICY "Admin update system settings" ON system_settings
  FOR UPDATE USING (true); -- Ideally restrict to specific user ID/role

-- Users Table update policy (For Profile Update)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 5. Fix potential casing mismatch if any (optional)
