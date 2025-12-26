import { Customer, Product, Invoice, User, UserRole, FirmSettings } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AuthResponse {
    token: string;
    user: User;
}

// Helper to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Login failed');
    }
    return response.json();
};

export const signupUser = async (email: string, password: string, name: string, shopName: string, role: UserRole): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, shopName, role }),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Signup failed');
    }
    return response.json();
};

// --- SETTINGS ---
export const fetchSettings = async (): Promise<FirmSettings | null> => {
    const response = await fetch(`${API_URL}/settings`, { headers: getAuthHeaders() });
    if (!response.ok) return null;
    return response.json();
};

export const saveSettings = async (settings: FirmSettings) => {
    const response = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
    });
    return response.json();
};

// --- CUSTOMERS ---
export const fetchCustomers = async (): Promise<Customer[]> => {
    const response = await fetch(`${API_URL}/customers`, { headers: getAuthHeaders() });
    if (!response.ok) {
        throw new Error('Failed to fetch customers');
    }
    return response.json();
};

export const createCustomer = async (customer: Customer): Promise<Customer> => {
    const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(customer),
    });
    if (!response.ok) {
        throw new Error('Failed to create customer');
    }
    return response.json();
};

// --- INVENTORY ---
export const fetchProducts = async (): Promise<Product[]> => {
    const response = await fetch(`${API_URL}/inventory`, { headers: getAuthHeaders() });
    if (!response.ok) {
        throw new Error('Failed to fetch inventory');
    }
    return response.json();
};

export const createProduct = async (product: Product): Promise<Product> => {
    const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(product),
    });
    if (!response.ok) {
        throw new Error('Failed to create product');
    }
    return response.json();
};

// --- INVOICES ---
export const fetchInvoices = async (): Promise<Invoice[]> => {
    const response = await fetch(`${API_URL}/invoices`, { headers: getAuthHeaders() });
    if (!response.ok) return [];
    return response.json();
};

export const createInvoice = async (invoice: Invoice) => {
    const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(invoice),
    });
    if (!response.ok) throw new Error('Failed to sync invoice');
    return response.json();
};

// --- ADMIN ---
export const toggleStatus = async (type: string, id: string, status: string) => {
    const response = await fetch(`${API_URL}/admin/toggle-status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type, id, status }),
    });
    if (!response.ok) throw new Error('Failed to toggle status');
    return response.json();
};

export const toggleSystem = async (name: string, value: boolean) => {
    const response = await fetch(`${API_URL}/admin/toggle-system`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, value }),
    });
    if (!response.ok) throw new Error('Failed to toggle system setting');
    return response.json();
};

export const fetchStockLogs = async () => {
    const response = await fetch(`${API_URL}/stock-logs`, { headers: getAuthHeaders() });
    if (!response.ok) return [];
    return response.json();
};

export const adjustStockApi = async (productId: string, delta: number, reason: string) => {
    const response = await fetch(`${API_URL}/inventory/adjust`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, delta, reason }),
    });
    if (!response.ok) throw new Error('Failed to adjust stock');
    return response.json();
};

export const fetchGlobalStats = async () => {
    const response = await fetch(`${API_URL}/admin/stats`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
};

export const fetchShopSettingsAdmin = async (tenantId: string): Promise<FirmSettings | null> => {
    const response = await fetch(`${API_URL}/admin/shop-settings/${tenantId}`, { headers: getAuthHeaders() });
    if (!response.ok) return null;
    return response.json();
};

export const saveShopSettingsAdmin = async (tenantId: string, settings: FirmSettings) => {
    const response = await fetch(`${API_URL}/admin/shop-settings/${tenantId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Failed to update shop settings');
    return response.json();
};

export const fetchTenantData = async (tenantId: string) => {
    const response = await fetch(`${API_URL}/admin/tenants/${tenantId}/data`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch tenant data');
    return response.json();
};

export const deleteTenantRecord = async (tenantId: string, entity: string, id: string) => {
    const response = await fetch(`${API_URL}/admin/tenants/${tenantId}/${entity}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete tenant record');
    return response.json();
};
