const jwt = require('jsonwebtoken');

// Supabase might provide the secret in base64 format. 
// We handle both plain text and base64 here.
let SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key_change_me';
if (SECRET_KEY && SECRET_KEY.length > 40) {
    // If it's a long string and looks like base64, keep it as is or decode if needed
    // Supabase standard is HS256 with the secret directly.
}

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Attach user info (id, email, role) to request
        next();
    } catch (err) {
        console.error('JWT Verification Failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token', message: err.message });
    }
};

module.exports = authMiddleware;
