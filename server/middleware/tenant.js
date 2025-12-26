const tenantMiddleware = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required for tenant scoping' });
    }

    // Every logged in user has a tenant_id. 
    // In our model, for Shop Owners, their user.id IS their tenant_id.
    // For Platform Admins, they might be accessing a specific tenant's data.

    // We attach tenant_id to the request for use in route handlers.
    req.tenantId = req.user.id;

    // Platform Admins can override this via headers or query params if needed for Master CRUD
    if (req.user.role === 'PLATFORM_ADMIN' && (req.headers['x-tenant-id'] || req.query.tenantId)) {
        req.tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    }

    next();
};

module.exports = tenantMiddleware;
