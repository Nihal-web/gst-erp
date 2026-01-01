-- Migration to add Product Name and Description to Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Firm Settings Enhancements
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS pan VARCHAR(20);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS web TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS acc_number TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS ifsc TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS terms TEXT; -- JSON String
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);
ALTER TABLE firm_settings ADD COLUMN IF NOT EXISTS declaration TEXT;

-- Invoice Enhancements for GST
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_taxable DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst DECIMAL(15,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_reverse_charge BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS export_type VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_bill_no VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_bill_date VARCHAR(50);

-- Invoice Item Enhancements
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS hsn VARCHAR(20);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sac VARCHAR(20);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS rate DECIMAL(15,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit VARCHAR(20);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS taxable_value DECIMAL(15,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS igst DECIMAL(15,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cgst DECIMAL(15,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS sgst DECIMAL(15,2);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(10,2) DEFAULT 1;

-- Stock Logs Table
CREATE TABLE IF NOT EXISTS stock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    product_id UUID REFERENCES inventory(id),
    product_name TEXT,
    change_amt DECIMAL(15,2),
    reason TEXT,
    date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure firm_settings has tenant_id unique for sync to work correctly with upsert
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'firm_settings_tenant_id_key'
    ) THEN
        ALTER TABLE firm_settings ADD CONSTRAINT firm_settings_tenant_id_key UNIQUE (tenant_id);
    END IF;
END $$;

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
