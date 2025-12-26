const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware
router.use(auth);

// Middleware to verify Platform Admin
const isPlatformAdmin = async (req, res, next) => {
    console.log(`[DEBUG] Admin check for user: ${req.user?.email}, Role: ${req.user?.role}`);
    if (req.user && req.user.role === 'PLATFORM_ADMIN') {
        next();
    } else {
        console.warn(`[DENIED] Platform Admin check failed for ${req.user?.email}`);
        res.status(403).json({ error: 'Access denied: Requires Platform Admin privileges' });
    }
};

// Toggle User/Shop status
router.post('/toggle-status', isPlatformAdmin, async (req, res) => {
    const { type, id, status } = req.body;

    let table = '';
    if (type === 'USER' || type === 'SHOP') table = 'users';
    else if (type === 'PRODUCT') table = 'inventory';
    else if (type === 'CUSTOMER') table = 'customers';
    else return res.status(400).json({ error: 'Invalid entity type' });

    try {
        await db.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);
        res.json({ success: true, status });
    } catch (err) {
        console.error('Toggle status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Get Platform Stats & Tenant List
router.get('/stats', isPlatformAdmin, async (req, res) => {
    try {
        console.log('[DEBUG] Fetching global stats...');

        const { rows: users } = await db.query('SELECT * FROM users ORDER BY created_at DESC');
        console.log(`[DEBUG] Found ${users.length} users`);

        const { rows: shops } = await db.query('SELECT * FROM users WHERE role = "ADMIN"');
        console.log(`[DEBUG] Found ${shops.length} shops`);

        const { rows: invoices } = await db.query('SELECT * FROM invoices');
        console.log(`[DEBUG] Found ${invoices.length} invoices`);

        // System Toggles with safe fallback
        let settings = [];
        try {
            const result = await db.query('SELECT * FROM system_settings');
            settings = result.rows || [];
        } catch (sErr) {
            console.warn('[WARN] system_settings table might be missing or empty', sErr.message);
        }

        const systemicMap = {};
        settings.forEach(s => {
            if (s.name) systemicMap[s.name] = (s.value === 'true' || s.value === true);
        });

        const totalRevenue = invoices.reduce((sum, inv) => {
            const val = parseFloat(inv.total_amount);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        const responseData = {
            totalShops: shops.length,
            totalRevenue: totalRevenue,
            systemSettings: systemicMap,
            allUsers: users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                shopName: u.shop_name,
                status: u.status,
                plan: u.plan || 'pro',
                createdAt: u.created_at
            })),
            allInvoices: invoices
        };

        console.log('[DEBUG] Stats payload prepared successfully');
        res.json(responseData);
    } catch (err) {
        console.error('[ERROR] Stats fetch failed:', err);
        res.status(500).json({ error: 'Failed to fetch global stats: ' + err.message });
    }
});

// --- TENANT SPECIFIC OVERRIDES ---

// Get all data for a specific tenant
router.get('/tenants/:tenantId/data', isPlatformAdmin, async (req, res) => {
    const { tenantId } = req.params;
    try {
        const { rows: products } = await db.query('SELECT * FROM inventory WHERE tenant_id = ?', [tenantId]);
        const { rows: customers } = await db.query('SELECT * FROM customers WHERE tenant_id = ?', [tenantId]);
        const { rows: invoices } = await db.query('SELECT * FROM invoices WHERE tenant_id = ?', [tenantId]);
        res.json({ products, customers, invoices });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tenant data' });
    }
});

// Master Delete Override
router.delete('/tenants/:tenantId/:entity/:id', isPlatformAdmin, async (req, res) => {
    const { tenantId, entity, id } = req.params;
    const allowedEntities = ['inventory', 'customers', 'invoices'];
    if (!allowedEntities.includes(entity)) return res.status(400).json({ error: 'Invalid entity' });

    try {
        await db.query(`DELETE FROM ${entity} WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// Get Settings for a specific Shop
router.get('/shop-settings/:tenantId', isPlatformAdmin, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM firm_settings WHERE tenant_id = ?', [req.params.tenantId]);
        res.json(rows[0] || {});
    } catch (err) {
        console.error('Error fetching shop settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update Settings for a specific Shop
router.post('/shop-settings/:tenantId', isPlatformAdmin, async (req, res) => {
    const s = req.body;
    const tenantId = req.params.tenantId;
    try {
        await db.query(`
            INSERT INTO firm_settings (
                tenant_id, name, tagline, address, pan, gstin, phone, email, web, 
                bank_name, bank_branch, acc_number, ifsc, upi_id, terms, state, state_code, declaration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                name=?, tagline=?, address=?, pan=?, gstin=?, phone=?, email=?, web=?, 
                bank_name=?, bank_branch=?, acc_number=?, ifsc=?, upi_id=?, terms=?, state=?, state_code=?, declaration=?`,
            [
                tenantId, s.name, s.tagline, s.address, s.pan, s.gstin, s.phone, s.email, s.web,
                s.bankName, s.bankBranch, s.accNumber, s.ifsc, s.upiId, JSON.stringify(s.terms || []), s.state, s.stateCode, s.declaration,
                s.name, s.tagline, s.address, s.pan, s.gstin, s.phone, s.email, s.web,
                s.bankName, s.bankBranch, s.accNumber, s.ifsc, s.upiId, JSON.stringify(s.terms || []), s.state, s.stateCode, s.declaration
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating shop settings:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Toggle System-wide settings
router.post('/toggle-system', isPlatformAdmin, async (req, res) => {
    const { name, value } = req.body;
    try {
        await db.query('UPDATE system_settings SET value = ? WHERE name = ?', [value.toString(), name]);
        res.json({ success: true, name, value });
    } catch (err) {
        console.error('Toggle system error:', err);
        res.status(500).json({ error: 'Failed to update system setting' });
    }
});

module.exports = router;
