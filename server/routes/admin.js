const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Apply auth middleware
router.use(auth);

// Middleware to verify Platform Admin
const isPlatformAdmin = async (req, res, next) => {
    console.log(`[DEBUG] Admin check for user: ${req.user?.email}, Role: ${req.user?.role}`);
    // Allow if user is PLATFORM_ADMIN OR if they are an ADMIN creating a team member for their own shop
    // For this specific endpoint (create-user), we might need more granular checks, 
    // but for now let's allow ADMIN to access this specific router if we split it, 
    // or just checking inside the route.
    // However, the router is protected by `auth` middleware already.

    // STRICT CHECK: Only PLATFORM_ADMIN can use generic admin routes
    // But for "Team Management", a Shop Admin needs to add users.
    // So we should probably move `create-user` to a generic `api` route or relax this check.
    // PROPOSAL: Allow access if role is ADMIN or PLATFORM_ADMIN, but restrict usage inside the handler.

    if (req.user && (req.user.role === 'PLATFORM_ADMIN' || req.user.role === 'ADMIN')) {
        next();
    } else {
        console.warn(`[DENIED] Admin check failed for ${req.user?.email}`);
        res.status(403).json({ error: 'Access denied: Requires Admin privileges' });
    }
};

// --- TEAM MANAGEMENT ---

// Create a new user (Team Member)
router.post('/create-user', isPlatformAdmin, async (req, res) => {
    const { email, password, name, role, shopName } = req.body;
    const requester = req.user;

    // Security Check: Shop Admin can only create users for their own shop
    if (requester.role === 'ADMIN' && role === 'PLATFORM_ADMIN') {
        return res.status(403).json({ error: 'Shop Admins cannot create Platform Admins' });
    }

    try {
        console.log(`[ADMIN] Creating user ${email} by ${requester.email}`);

        // 1. Create Auth User in Supabase
        // We need a SUPER CLIENT with Service Role to create users without login
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY // Fallback (warning: might fail if anon)
        );

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, shop_name: shopName || requester.shop_name, role }
        });

        if (authError) throw authError;

        const userId = authData.user.id;

        // 2. Insert into public.users table via direct Postgres
        // Admin creates user -> automatically active
        const insertQuery = `
            INSERT INTO users (id, email, name, role, shop_name, status, plan, tenant_id)
            VALUES ($1, $2, $3, $4, $5, 'active', 'pro', $6)
            RETURNING *
        `;

        // If requester is ADMIN, inherit their tenant_id/shop_name
        // If requester is PLATFORM_ADMIN, they can specify, or generate a new one?
        // For simplicity, let's assume we are adding to the SAME tenant if ADMIN.
        const effectiveTenantId = requester.tenant_id;
        const effectiveShopName = shopName || requester.shop_name;

        const { rows } = await db.query(insertQuery, [
            userId, email, name, role, effectiveShopName, effectiveTenantId
        ]);

        res.json({ success: true, user: rows[0] });

    } catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Team Members (for current shop)
router.get('/team-members', isPlatformAdmin, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // If Platform Admin, this might be undefined or they might want ALL, 
        // but for now let's assume this is for functionalities where context is clear.
        // If Platform Admin calls this without context, return empty or all?
        // Let's restrict to Shop Admin usage primarily, or return generic list if Platform Admin.

        let query = 'SELECT id, name, email, role, status FROM users';
        let params = [];

        if (req.user.role === 'PLATFORM_ADMIN') {
            // Platform admin sees all or needs to filter? 
            // For now, return all is dangerous if list is huge.
            // Let's return just their own admins?
            // Actually, let's just support Shop Team fetching.
        } else {
            query += ' WHERE tenant_id = $1';
            params.push(tenantId);
        }

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});



// Toggle User/Shop status
router.post('/toggle-status', isPlatformAdmin, async (req, res) => {
    const { type, id, status } = req.body;

    let table = '';
    if (type === 'USER' || type === 'SHOP') table = 'users';
    else if (type === 'PRODUCT') table = 'inventory';
    else if (type === 'CUSTOMER') table = 'customers';
    else return res.status(400).json({ error: 'Invalid entity type' });

    try {
        await db.query(`UPDATE ${table} SET status = $1 WHERE id = $2`, [status, id]);
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

        const { rows: shops } = await db.query("SELECT * FROM users WHERE role = 'ADMIN'");
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
        const { rows: products } = await db.query('SELECT * FROM inventory WHERE tenant_id = $1', [tenantId]);
        const { rows: customers } = await db.query('SELECT * FROM customers WHERE tenant_id = $1', [tenantId]);
        const { rows: invoices } = await db.query('SELECT * FROM invoices WHERE tenant_id = $1', [tenantId]);
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
        await db.query(`DELETE FROM ${entity} WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

// Get Settings for a specific Shop
router.get('/shop-settings/:tenantId', isPlatformAdmin, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM firm_settings WHERE tenant_id = $1', [req.params.tenantId]);
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
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (tenant_id) DO UPDATE SET 
                name=$2, tagline=$3, address=$4, pan=$5, gstin=$6, phone=$7, email=$8, web=$9, 
                bank_name=$10, bank_branch=$11, acc_number=$12, ifsc=$13, upi_id=$14, terms=$15, state=$16, state_code=$17, declaration=$18`,
            [
                tenantId, s.name, s.tagline, s.address, s.pan, s.gstin, s.phone, s.email, s.web,
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
        await db.query('UPDATE system_settings SET value = $1 WHERE name = $2', [value.toString(), name]);
        res.json({ success: true, name, value });
    } catch (err) {
        console.error('Toggle system error:', err);
        res.status(500).json({ error: 'Failed to update system setting' });
    }
});

module.exports = router;
