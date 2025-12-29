-- Supabase PostgreSQL Schema Migration
-- This schema is compatible with PostgreSQL and Supabase

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  gstin VARCHAR(50) NOT NULL,
  state VARCHAR(100) NOT NULL,
  state_code VARCHAR(10) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  hsn VARCHAR(50) NOT NULL,
  sac VARCHAR(50),
  rate DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- This is the BASE Unit
  stock INT NOT NULL DEFAULT 0,
  gst_percent DECIMAL(5, 2) NOT NULL,
  alert_threshold INT DEFAULT 10, -- Low stock alert threshold in Base Units
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packaging_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL,
  conversion_factor DECIMAL(10, 2) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  shop_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  plan VARCHAR(20) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  tenant_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  product_id UUID NOT NULL REFERENCES inventory(id),
  quantity INT NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  gst_percent DECIMAL(5, 2) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (product_id) REFERENCES inventory(id)
);

CREATE TABLE IF NOT EXISTS firm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  firm_name VARCHAR(255) NOT NULL,
  gstin VARCHAR(50) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(15, 2) NOT NULL,
  entry_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_firm_settings_tenant ON firm_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_ledger_tenant ON sale_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_packaging_units_product ON packaging_units(product_id);
