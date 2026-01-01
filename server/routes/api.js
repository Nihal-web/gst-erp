const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { GSTRService } = require('../services/gstrService');

const router = express.Router();

// Apply auth and tenant scoping to all API routes
router.use(auth);
router.use(tenant);

// --- MAPPERS ---
const mapCustomer = (row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    gstin: row.gstin,
    state: row.state,
    stateCode: row.state_code,
    country: row.country,
    status: row.status
});

const mapProduct = (row) => ({
    id: row.id,
    name: row.name,
    hsn: row.hsn,
    sac: row.sac,
    rate: parseFloat(row.rate),
    unit: row.unit,
    stock: row.stock,
    gstPercent: parseFloat(row.gst_percent),
    status: row.status
});

const mapSettings = (row) => {
    if (!row) return null;
    return {
        name: row.name,
        tagline: row.tagline,
        address: row.address,
        pan: row.pan,
        gstin: row.gstin,
        phone: row.phone,
        email: row.email,
        web: row.web,
        bankName: row.bank_name,
        bankBranch: row.bank_branch,
        accNumber: row.acc_number,
        ifsc: row.ifsc,
        upiId: row.upi_id,
        terms: row.terms ? JSON.parse(row.terms) : [],
        state: row.state,
        stateCode: row.state_code,
        declaration: row.declaration
    };
};

const mapInvoice = (row) => ({
    id: row.id,
    invoiceNo: row.invoice_no,
    type: row.type,
    date: row.date,
    totalTaxable: parseFloat(row.total_taxable),
    igst: parseFloat(row.igst),
    cgst: parseFloat(row.cgst),
    sgst: parseFloat(row.sgst),
    totalAmount: parseFloat(row.total_amount),
    isPaid: !!row.is_paid,
    isReverseCharge: !!row.is_reverse_charge,
    exportType: row.export_type,
    shippingBillNo: row.shipping_bill_no,
    shippingBillDate: row.shipping_bill_date,
    customerId: row.customer_id,
    customer: { name: row.customer_name, gstin: row.customer_gstin, address: row.customer_address, state: row.customer_state, stateCode: row.customer_state_code }
});

const mapStockLog = (row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    change: parseFloat(row.change_amt),
    reason: row.reason,
    date: row.date,
    user: row.user_name || 'System'
});

// --- CUSTOMERS ---
router.get('/customers', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM customers WHERE tenant_id = $1 ORDER BY created_at DESC', [req.tenantId]);
        res.json(rows.map(mapCustomer));
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/customers', async (req, res) => {
    const { name, address, phone, gstin, state, stateCode, country } = req.body;
    try {
        const id = crypto.randomUUID();
        await db.query(
            `INSERT INTO customers (id, tenant_id, name, address, phone, gstin, state, state_code, country, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
            [id, req.tenantId, name, address, phone, gstin, state, stateCode, country || 'India']
        );
        const { rows } = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
        res.status(201).json(mapCustomer(rows[0]));
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- INVENTORY ---
router.get('/inventory', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM inventory WHERE tenant_id = $1 ORDER BY created_at DESC', [req.tenantId]);
        res.json(rows.map(mapProduct));
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/inventory', async (req, res) => {
    const { name, hsn, sac, rate, unit, stock, gstPercent } = req.body;
    try {
        const id = crypto.randomUUID();
        await db.query(
            `INSERT INTO inventory (id, tenant_id, name, hsn, sac, rate, unit, stock, gst_percent, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
            [id, req.tenantId, name, hsn, sac || null, rate, unit, stock, gstPercent]
        );
        const { rows } = await db.query('SELECT * FROM inventory WHERE id = $1', [id]);
        res.status(201).json(mapProduct(rows[0]));
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- STOCK LOGS ---
router.get('/stock-logs', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT sl.*, u.name as user_name 
            FROM stock_logs sl 
            JOIN users u ON sl.tenant_id = u.id 
            WHERE sl.tenant_id = $1 
            ORDER BY sl.created_at DESC LIMIT 100`, [req.tenantId]);
        res.json(rows.map(mapStockLog));
    } catch (err) {
        console.error('Error fetching stock logs:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/inventory/adjust', async (req, res) => {
    const { productId, delta, reason } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query('UPDATE inventory SET stock = stock + $1 WHERE id = $2 AND tenant_id = $3', [delta, productId, req.tenantId]);

        const { rows: prod } = await connection.query('SELECT name FROM inventory WHERE id = $1 AND tenant_id = $2', [productId, req.tenantId]);
        const prodName = prod[0]?.name || 'Unknown Item';

        await connection.query(`
            INSERT INTO stock_logs (id, tenant_id, product_id, product_name, change_amt, reason, date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [crypto.randomUUID(), req.tenantId, productId, prodName, delta, reason, new Date().toLocaleString()]
        );

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error('Error adjusting stock:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

router.get('/settings', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM firm_settings WHERE tenant_id = $1', [req.tenantId]);
        res.json(mapSettings(rows[0]));
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/settings', async (req, res) => {
    const s = req.body;
    try {
        await db.query(`
            INSERT INTO firm_settings (
                tenant_id, name, tagline, address, pan, gstin, phone, email, web, 
                bank_name, bank_branch, acc_number, ifsc, upi_id, terms, state, state_code, declaration
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (tenant_id) DO UPDATE SET 
                name=$2, tagline=$3, address=$4, pan=$5, gstin=$6, phone=$7, email=$8, web=$9, 
                bank_name=$10, bank_branch=$11, acc_number=$12, ifsc=$13, upi_id=$14, terms=$15, state=$16, state_code=$17, declaration=$18`,
            [
                req.tenantId, s.name, s.tagline, s.address, s.pan, s.gstin, s.phone, s.email, s.web,
                s.bankName, s.bankBranch, s.accNumber, s.ifsc, s.upiId, JSON.stringify(s.terms || []), s.state, s.stateCode, s.declaration
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- INVOICES ---
router.get('/invoices', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT i.*, c.name as customer_name, c.gstin as customer_gstin, c.address as customer_address, c.state as customer_state, c.state_code as customer_state_code
            FROM invoices i
            JOIN customers c ON i.customer_id = c.id
            WHERE i.tenant_id = $1
            ORDER BY i.created_at DESC`, [req.tenantId]);
        res.json(rows.map(mapInvoice));
    } catch (err) {
        console.error('Error fetching invoices:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/invoices', async (req, res) => {
    const inv = req.body;
    const items = inv.items;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const invId = crypto.randomUUID();

        await connection.query(`
            INSERT INTO invoices (
                id, tenant_id, customer_id, invoice_no, type, date, total_taxable, 
                igst, cgst, sgst, total_amount, is_paid, is_reverse_charge, 
                export_type, shipping_bill_no, shipping_bill_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
                invId,
                req.tenantId,
                inv.customer?.id || null,
                inv.invoiceNo || 'INV-TEMP',
                inv.type || 'GOODS',
                inv.date || new Date().toISOString(),
                inv.totalTaxable || 0,
                inv.igst || 0,
                inv.cgst || 0,
                inv.sgst || 0,
                inv.totalAmount || 0,
                inv.isPaid || false,
                inv.isReverseCharge || false,
                inv.exportType || null,
                inv.shippingBillNo || null,
                inv.shippingBillDate || null
            ]
        );

        for (const item of items) {
            await connection.query(`
                INSERT INTO invoice_items (
                    invoice_id, product_id, product_name, hsn, sac, qty, rate, unit, taxable_value, gst_percent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    invId, item.productId || null, item.productName, item.hsn || null, item.sac || null,
                    item.qty, item.rate, item.unit, item.taxableValue, item.gstPercent
                ]
            );

            // Note: Stock update is handled by frontend to account for conversion factors
        }

        await connection.commit();
        res.status(201).json({ id: invId, message: 'Invoice generated and synced' });
    } catch (err) {
        await connection.rollback();
        console.error('Error creating invoice:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// --- GSTR OPERATIONS ---

// Generate GSTR-1 from invoices
router.post('/gstr1/generate', async (req, res) => {
    try {
        const { returnPeriod } = req.body;

        if (!returnPeriod || !/^\d{6}$/.test(returnPeriod)) {
            return res.status(400).json({ error: 'Valid return period (YYYYMM) is required' });
        }

        await GSTRService.generateGSTR1FromInvoices(req.tenantId, returnPeriod);
        res.json({ message: 'GSTR-1 generated successfully' });
    } catch (error) {
        console.error('GSTR-1 Generation Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate GSTR-1' });
    }
});

// Generate GSTR-3B from GSTR-1
router.post('/gstr3b/generate', async (req, res) => {
    try {
        const { returnPeriod } = req.body;

        if (!returnPeriod || !/^\d{6}$/.test(returnPeriod)) {
            return res.status(400).json({ error: 'Valid return period (YYYYMM) is required' });
        }

        await GSTRService.generateGSTR3BFromGSTR1(req.tenantId, returnPeriod);
        res.json({ message: 'GSTR-3B generated successfully' });
    } catch (error) {
        console.error('GSTR-3B Generation Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate GSTR-3B' });
    }
});

// Get GSTR returns list
router.get('/gstr/returns', async (req, res) => {
    try {
        const returns = await GSTRService.getGSTRReturns(req.tenantId);
        res.json(returns);
    } catch (error) {
        console.error('GSTR Returns Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch GSTR returns' });
    }
});

// Get GSTR-1 details
router.get('/gstr1/:returnPeriod', async (req, res) => {
    try {
        const { returnPeriod } = req.params;

        // Get return header
        const returnQuery = await db.query(
            'SELECT * FROM gstr1_returns WHERE tenant_id = $1 AND return_period = $2',
            [req.tenantId, returnPeriod]
        );

        if (returnQuery.rows.length === 0) {
            return res.status(404).json({ error: 'GSTR-1 return not found' });
        }

        const returnData = returnQuery.rows[0];

        // Get section data
        const [b2bData, b2clData, expData, b2csData, nilData, cdnrData] = await Promise.all([
            db.query('SELECT * FROM gstr1_b2b WHERE gstr1_return_id = $1 ORDER BY invoice_date', [returnData.id]),
            db.query('SELECT * FROM gstr1_b2cl WHERE gstr1_return_id = $1 ORDER BY invoice_date', [returnData.id]),
            db.query('SELECT * FROM gstr1_exp WHERE gstr1_return_id = $1 ORDER BY invoice_date', [returnData.id]),
            db.query('SELECT * FROM gstr1_b2cs WHERE gstr1_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr1_nil WHERE gstr1_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr1_cdnr WHERE gstr1_return_id = $1 ORDER BY note_date', [returnData.id])
        ]);

        res.json({
            return: returnData,
            sections: {
                b2b: b2bData.rows,
                b2cl: b2clData.rows,
                exp: expData.rows,
                b2cs: b2csData.rows,
                nil: nilData.rows,
                cdnr: cdnrData.rows
            }
        });
    } catch (error) {
        console.error('GSTR-1 Details Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch GSTR-1 details' });
    }
});

// Get GSTR-3B details
router.get('/gstr3b/:returnPeriod', async (req, res) => {
    try {
        const { returnPeriod } = req.params;

        // Get return header
        const returnQuery = await db.query(
            'SELECT * FROM gstr3b_returns WHERE tenant_id = $1 AND return_period = $2',
            [req.tenantId, returnPeriod]
        );

        if (returnQuery.rows.length === 0) {
            return res.status(404).json({ error: 'GSTR-3B return not found' });
        }

        const returnData = returnQuery.rows[0];

        // Get section data
        const [section3_1_a, section3_1_b, section3_1_c, section3_1_d, section3_1_e, section3_2, section4, section6_1] = await Promise.all([
            db.query('SELECT * FROM gstr3b_3_1_a WHERE gstr3b_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr3b_3_1_b WHERE gstr3b_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr3b_3_1_c WHERE gstr3b_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr3b_3_1_d WHERE gstr3b_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr3b_3_1_e WHERE gstr3b_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr3b_3_2 WHERE gstr3b_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr3b_4 WHERE gstr3b_return_id = $1', [returnData.id]),
            db.query('SELECT * FROM gstr3b_6_1 WHERE gstr3b_return_id = $1', [returnData.id])
        ]);

        res.json({
            return: returnData,
            sections: {
                '3_1_a': section3_1_a.rows,
                '3_1_b': section3_1_b.rows,
                '3_1_c': section3_1_c.rows,
                '3_1_d': section3_1_d.rows,
                '3_1_e': section3_1_e.rows,
                '3_2': section3_2.rows,
                '4': section4.rows,
                '6_1': section6_1.rows
            }
        });
    } catch (error) {
        console.error('GSTR-3B Details Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch GSTR-3B details' });
    }
});

module.exports = router;
