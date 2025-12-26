const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_change_me';

// Helper to format user for response
const formatUser = (row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    shopName: row.shop_name,
    status: row.status,
    plan: row.plan
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Platform Maintenance Check
        const { rows: maintRows } = await db.query('SELECT value FROM system_settings WHERE name = "maintenance_mode"');
        const isMaintenance = maintRows[0]?.value === 'true';

        const { rows } = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Allow Admin to bypass maintenance
        if (isMaintenance && user.role !== 'PLATFORM_ADMIN') {
            return res.status(503).json({ error: 'System is currently under maintenance. Please try again later.' });
        }

        if (user.status === 'inactive' || user.status === 'suspended') {
            return res.status(403).json({ error: 'Account disabled or suspended by platform administrator' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });

        res.json({
            token,
            user: formatUser(user)
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// SIGNUP
router.post('/signup', async (req, res) => {
    const { email, password, name, shopName } = req.body;
    try {
        // Signups Allowed Check
        const { rows: signupRows } = await db.query('SELECT value FROM system_settings WHERE name = "signups_enabled"');
        const isSignupEnabled = signupRows[0]?.value === 'true';

        if (!isSignupEnabled) {
            return res.status(403).json({ error: 'Public signups are currently disabled by the administrator.' });
        }

        // Check if user exists
        const { rows: existing } = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // SECURE ROLE LOGIC: 
        // 1. Mandatory role: 'ADMIN' (Shop Owner).
        // 2. Platform Admins cannot be created via public signup.
        const assignedRole = 'ADMIN';

        const id = crypto.randomUUID();

        await db.query(
            `INSERT INTO users (id, email, password_hash, name, role, shop_name, status, plan) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, email, passwordHash, name, assignedRole, shopName || 'My Shop', 'active', 'pro']
        );

        // Fetch created user
        const { rows: newUsers } = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        const user = newUsers[0];

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '24h' });

        res.status(201).json({
            token,
            user: formatUser(user)
        });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
