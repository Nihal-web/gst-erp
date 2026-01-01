-- ========================================
-- GSTR TABLES MIGRATION
-- Adds GSTR-1 and GSTR-3B tables for GST returns
-- ========================================

-- ---------------------------------------------------------
-- 1. GSTR-1 TABLES (Sales Returns)
-- ---------------------------------------------------------

-- 1.1 GSTR-1 Main Table (Return Header)
CREATE TABLE IF NOT EXISTS gstr1_returns (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   tenant_id UUID NOT NULL,
   return_period VARCHAR(6) NOT NULL, -- YYYYMM format (e.g., 202412)
   status VARCHAR(20) DEFAULT 'draft', -- draft, filed, amended
   filed_date TIMESTAMP,
   total_invoice_count INTEGER DEFAULT 0,
   total_taxable_value DECIMAL(15,2) DEFAULT 0,
   total_igst DECIMAL(15,2) DEFAULT 0,
   total_cgst DECIMAL(15,2) DEFAULT 0,
   total_sgst DECIMAL(15,2) DEFAULT 0,
   notes TEXT,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 GSTR-1 Section 4A/4B/4C (B2B Invoices)
CREATE TABLE IF NOT EXISTS gstr1_b2b (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr1_return_id UUID NOT NULL REFERENCES gstr1_returns(id) ON DELETE CASCADE,
   invoice_id UUID REFERENCES invoices(id),
   invoice_number VARCHAR(50) NOT NULL,
   invoice_date DATE NOT NULL,
   customer_gstin VARCHAR(50) NOT NULL,
   customer_name VARCHAR(255),
   place_of_supply VARCHAR(10), -- State code
   reverse_charge BOOLEAN DEFAULT false,
   invoice_type VARCHAR(20), -- Regular, SEZ, Deemed Export, etc.
   e_commerce_gstin VARCHAR(50),
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_rate DECIMAL(5,2) DEFAULT 0,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cgst_rate DECIMAL(5,2) DEFAULT 0,
   cgst_amount DECIMAL(15,2) DEFAULT 0,
   sgst_rate DECIMAL(5,2) DEFAULT 0,
   sgst_amount DECIMAL(15,2) DEFAULT 0,
   cess_rate DECIMAL(5,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 GSTR-1 Section 5A/5B (B2C Large - Inter-state)
CREATE TABLE IF NOT EXISTS gstr1_b2cl (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr1_return_id UUID NOT NULL REFERENCES gstr1_returns(id) ON DELETE CASCADE,
   invoice_id UUID REFERENCES invoices(id),
   invoice_number VARCHAR(50) NOT NULL,
   invoice_date DATE NOT NULL,
   place_of_supply VARCHAR(10), -- State code
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_rate DECIMAL(5,2) NOT NULL,
   igst_amount DECIMAL(15,2) NOT NULL,
   cess_rate DECIMAL(5,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   e_commerce_gstin VARCHAR(50),
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 GSTR-1 Section 6B (Exports)
CREATE TABLE IF NOT EXISTS gstr1_exp (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr1_return_id UUID NOT NULL REFERENCES gstr1_returns(id) ON DELETE CASCADE,
   invoice_id UUID REFERENCES invoices(id),
   invoice_number VARCHAR(50) NOT NULL,
   invoice_date DATE NOT NULL,
   export_type VARCHAR(20), -- WPAY (With Payment), WOPAY (Without Payment)
   shipping_bill_no VARCHAR(50),
   shipping_bill_date DATE,
   port_code VARCHAR(10),
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_rate DECIMAL(5,2) DEFAULT 0,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cess_rate DECIMAL(5,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 GSTR-1 Section 7 (B2C Small - State-wise summary)
CREATE TABLE IF NOT EXISTS gstr1_b2cs (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr1_return_id UUID NOT NULL REFERENCES gstr1_returns(id) ON DELETE CASCADE,
   place_of_supply VARCHAR(10) NOT NULL, -- State code
   applicable_tax_rate DECIMAL(5,2) NOT NULL,
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cgst_amount DECIMAL(15,2) DEFAULT 0,
   sgst_amount DECIMAL(15,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   e_commerce_gstin VARCHAR(50),
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 GSTR-1 Section 8 (Nil/Exempt/Non-GST)
CREATE TABLE IF NOT EXISTS gstr1_nil (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr1_return_id UUID NOT NULL REFERENCES gstr1_returns(id) ON DELETE CASCADE,
   description VARCHAR(255),
   nil_amount DECIMAL(15,2) DEFAULT 0,
   exempt_amount DECIMAL(15,2) DEFAULT 0,
   non_gst_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.7 GSTR-1 Section 9B (Credit/Debit Notes)
CREATE TABLE IF NOT EXISTS gstr1_cdnr (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr1_return_id UUID NOT NULL REFERENCES gstr1_returns(id) ON DELETE CASCADE,
   cdn_type VARCHAR(10) NOT NULL, -- C (Credit) or D (Debit)
   note_number VARCHAR(50) NOT NULL,
   note_date DATE NOT NULL,
   original_invoice_number VARCHAR(50),
   original_invoice_date DATE,
   customer_gstin VARCHAR(50),
   customer_name VARCHAR(255),
   place_of_supply VARCHAR(10),
   prepaid_category VARCHAR(20), -- Yes/No
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_rate DECIMAL(5,2) DEFAULT 0,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cgst_rate DECIMAL(5,2) DEFAULT 0,
   cgst_amount DECIMAL(15,2) DEFAULT 0,
   sgst_rate DECIMAL(5,2) DEFAULT 0,
   sgst_amount DECIMAL(15,2) DEFAULT 0,
   cess_rate DECIMAL(5,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 2. GSTR-3B TABLES (Summary Returns)
-- ---------------------------------------------------------

-- 2.1 GSTR-3B Main Table
CREATE TABLE IF NOT EXISTS gstr3b_returns (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   tenant_id UUID NOT NULL,
   return_period VARCHAR(6) NOT NULL, -- YYYYMM format
   status VARCHAR(20) DEFAULT 'draft', -- draft, filed, amended
   filed_date TIMESTAMP,
   financial_year VARCHAR(9), -- YYYY-YY format
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 GSTR-3B Section 3.1(a) - Outward Taxable Supplies
CREATE TABLE IF NOT EXISTS gstr3b_3_1_a (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   place_of_supply VARCHAR(10), -- State code (for inter-state supplies)
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cgst_amount DECIMAL(15,2) DEFAULT 0,
   sgst_amount DECIMAL(15,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.3 GSTR-3B Section 3.1(b) - Outward Taxable Supplies (Zero Rated)
CREATE TABLE IF NOT EXISTS gstr3b_3_1_b (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   export_type VARCHAR(20), -- SEZ, Deemed Export, etc.
   taxable_value DECIMAL(15,2) NOT NULL,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 GSTR-3B Section 3.1(c) - Other Outward Supplies (Nil/Exempt/Non-GST)
CREATE TABLE IF NOT EXISTS gstr3b_3_1_c (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   description VARCHAR(255),
   nil_amount DECIMAL(15,2) DEFAULT 0,
   exempt_amount DECIMAL(15,2) DEFAULT 0,
   non_gst_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.5 GSTR-3B Section 3.1(d) - Inward Supplies Liable to Reverse Charge
CREATE TABLE IF NOT EXISTS gstr3b_3_1_d (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   supplier_gstin VARCHAR(50),
   supplier_name VARCHAR(255),
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cgst_amount DECIMAL(15,2) DEFAULT 0,
   sgst_amount DECIMAL(15,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.6 GSTR-3B Section 3.1(e) - Non-GST Outward Supplies
CREATE TABLE IF NOT EXISTS gstr3b_3_1_e (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   description VARCHAR(255),
   amount DECIMAL(15,2) NOT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.7 GSTR-3B Section 3.2 - Supplies made to Unregistered Persons
CREATE TABLE IF NOT EXISTS gstr3b_3_2 (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   place_of_supply VARCHAR(10), -- State code
   taxable_value DECIMAL(15,2) NOT NULL,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 GSTR-3B Section 4 - Eligible ITC
CREATE TABLE IF NOT EXISTS gstr3b_4 (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cgst_amount DECIMAL(15,2) DEFAULT 0,
   sgst_amount DECIMAL(15,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.9 GSTR-3B Section 6.1 - Payment of Tax
CREATE TABLE IF NOT EXISTS gstr3b_6_1 (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   gstr3b_return_id UUID NOT NULL REFERENCES gstr3b_returns(id) ON DELETE CASCADE,
   description VARCHAR(255),
   igst_amount DECIMAL(15,2) DEFAULT 0,
   cgst_amount DECIMAL(15,2) DEFAULT 0,
   sgst_amount DECIMAL(15,2) DEFAULT 0,
   cess_amount DECIMAL(15,2) DEFAULT 0,
   interest_amount DECIMAL(15,2) DEFAULT 0,
   penalty_amount DECIMAL(15,2) DEFAULT 0,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gstr1_returns_tenant_period ON gstr1_returns(tenant_id, return_period);
CREATE INDEX IF NOT EXISTS idx_gstr1_b2b_return ON gstr1_b2b(gstr1_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr1_b2cl_return ON gstr1_b2cl(gstr1_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr1_exp_return ON gstr1_exp(gstr1_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr1_b2cs_return ON gstr1_b2cs(gstr1_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr1_nil_return ON gstr1_nil(gstr1_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr1_cdnr_return ON gstr1_cdnr(gstr1_return_id);

CREATE INDEX IF NOT EXISTS idx_gstr3b_returns_tenant_period ON gstr3b_returns(tenant_id, return_period);
CREATE INDEX IF NOT EXISTS idx_gstr3b_3_1_a_return ON gstr3b_3_1_a(gstr3b_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_3_1_b_return ON gstr3b_3_1_b(gstr3b_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_3_1_c_return ON gstr3b_3_1_c(gstr3b_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_3_1_d_return ON gstr3b_3_1_d(gstr3b_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_3_1_e_return ON gstr3b_3_1_e(gstr3b_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_3_2_return ON gstr3b_3_2(gstr3b_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_4_return ON gstr3b_4(gstr3b_return_id);
CREATE INDEX IF NOT EXISTS idx_gstr3b_6_1_return ON gstr3b_6_1(gstr3b_return_id);

-- ---------------------------------------------------------
-- 4. ENABLE RLS
-- ---------------------------------------------------------
ALTER TABLE gstr1_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr1_b2b ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr1_b2cl ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr1_exp ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr1_b2cs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr1_nil ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr1_cdnr ENABLE ROW LEVEL SECURITY;

ALTER TABLE gstr3b_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_3_1_a ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_3_1_b ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_3_1_c ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_3_1_d ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_3_1_e ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_3_2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE gstr3b_6_1 ENABLE ROW LEVEL SECURITY;

-- ========================================
-- GSTR MIGRATION COMPLETE ✅
-- ========================================