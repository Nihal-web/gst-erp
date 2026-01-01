import { Customer, Product, Invoice, User, UserRole, FirmSettings, StockLog } from '../types';
import { supabase } from '../supabaseClient';

// --- SETTINGS ---
export const fetchSettings = async (): Promise<FirmSettings | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('firm_settings')
        .select('*')
        .eq('tenant_id', user.id)
        .maybeSingle();

    if (error || !data) return null;

    // Map DB columns to Frontend Types (snake_case to camelCase)
    return {
        ...data,
        name: data.firm_name,
        bankName: data.bank_name,
        bankBranch: data.bank_branch,
        accNumber: data.acc_number,
        upiId: data.upi_id,
        stateCode: data.state_code,
        terms: typeof data.terms === 'string' ? JSON.parse(data.terms) : data.terms
    } as FirmSettings;
};

export const saveSettings = async (settings: FirmSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const payload = {
        tenant_id: user.id,
        firm_name: settings.name,
        tagline: settings.tagline,
        address: settings.address,
        pan: settings.pan,
        gstin: settings.gstin,
        phone: settings.phone,
        email: settings.email,
        web: settings.web,
        bank_name: settings.bankName,
        bank_branch: settings.bankBranch,
        acc_number: settings.accNumber,
        ifsc: settings.ifsc,
        upi_id: settings.upiId,
        terms: JSON.stringify(settings.terms || []),
        state: settings.state,
        state_code: settings.stateCode,
        declaration: settings.declaration
    };

    // Use upsert with onConflict on tenant_id for guaranteed single-record persistence
    const { data, error } = await supabase
        .from('firm_settings')
        .upsert(payload, { onConflict: 'tenant_id' })
        .select()
        .single();

    if (error) {
        console.error("Save Settings Error:", error);
        throw error;
    }

    return {
        ...settings,
        // Any server side fields like 'id' or 'created_at' would be in 'data'
    };
};

// --- CUSTOMERS ---
export const fetchCustomers = async (): Promise<Customer[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map((row: any) => ({
        ...row,
        stateCode: row.state_code
    }));
};

export const createCustomer = async (customer: Customer): Promise<Customer> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const payload = {
        tenant_id: user.id,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        gstin: customer.gstin,
        state: customer.state,
        state_code: customer.stateCode,
        country: customer.country || 'India',
        status: 'active'
    };

    const { data, error } = await supabase.from('customers').insert([payload]).select().single();
    if (error) throw error;
    return { ...data, stateCode: data.state_code } as Customer;
};

export const updateCustomerApi = async (customer: Customer): Promise<Customer> => {
    const payload = {
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        gstin: customer.gstin,
        state: customer.state,
        state_code: customer.stateCode,
        country: customer.country || 'India'
    };

    const { data, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customer.id)
        .select()
        .single();

    if (error) throw error;
    return { ...data, stateCode: data.state_code } as Customer;
};

export const deleteCustomerApi = async (id: string) => {
    const { error } = await supabase.from('customers').update({ status: 'archived' }).eq('id', id);
    if (error) throw error;
};

export const fetchCustomerInvoices = async (customerId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
      *,
      customer:customers!invoices_customer_id_fkey ( name, gstin, address, state, state_code ),
      items:invoice_items!invoice_items_invoice_id_fkey (
        product_id, quantity, rate, gst_percent, amount,
        product:inventory!invoice_items_product_id_fkey ( name, product_name, hsn, sac, unit )
      )
    `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row: any) => {
        const custData = Array.isArray(row.customer) ? row.customer[0] : row.customer;
        return {
            id: row.id,
            invoiceNo: row.invoice_number,
            type: (row.status === 'generated' ? 'GOODS' : row.status) as any,
            date: row.created_at,
            totalTaxable: (row.total_amount || 0) - (row.tax_amount || 0),
            totalAmount: row.total_amount,
            customer: {
                name: custData?.name || 'Unknown',
                gstin: custData?.gstin,
                address: custData?.address,
                state: custData?.state,
                stateCode: custData?.state_code
            },
            items: (row.items || []).map((item: any) => ({
                productId: item.product_id,
                productName: item.product?.product_name || item.product?.name || 'Unknown',
                hsn: item.product?.hsn || '',
                sac: item.product?.sac || '',
                qty: item.quantity,
                rate: item.rate,
                unit: item.product?.unit || 'NOS',
                taxableValue: item.amount,
                gstPercent: item.gst_percent
            }))
        } as unknown as Invoice;
    });
};

// --- INVENTORY ---
export const fetchProducts = async (): Promise<Product[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('inventory')
        .select('*, packaging_units(*)')
        .eq('tenant_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map((row: any) => ({
        ...row,
        productName: row.product_name,
        description: row.description,
        gstPercent: row.gst_percent,
        warehouseId: row.warehouse_id,
        alertThreshold: row.alert_threshold,
        packagingUnits: row.packaging_units?.map((pu: any) => ({
            id: pu.id,
            productId: pu.product_id,
            unitName: pu.unit_name,
            conversionFactor: pu.conversion_factor,
            isDefault: pu.is_default
        })) || []
    }));
};

export const createProduct = async (product: Product): Promise<Product> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const payload = {
        tenant_id: user.id,
        name: product.name,
        product_name: product.productName,
        description: product.description,
        hsn: product.hsn,
        sac: product.sac || null,
        rate: product.rate,
        unit: product.unit,
        stock: product.stock,
        gst_percent: product.gstPercent,
        alert_threshold: product.alertThreshold ?? 10,
        warehouse_id: product.warehouseId || null,
        barcode: product.barcode || null,
        status: 'active'
    };

    const { data, error } = await supabase.from('inventory').insert([payload]).select().single();
    if (error) throw error;

    if (product.packagingUnits && product.packagingUnits.length > 0) {
        const puPayload = product.packagingUnits.map(pu => ({
            product_id: data.id,
            unit_name: pu.unitName,
            conversion_factor: pu.conversionFactor,
            is_default: pu.isDefault
        }));
        const { error: puError } = await supabase.from('packaging_units').insert(puPayload);
        if (puError) console.error("Error inserting packaging units", puError);
    }

    return { ...data, gstPercent: data.gst_percent } as Product;
};

export const updateProductApi = async (product: Product): Promise<Product> => {
    const payload = {
        name: product.name,
        product_name: product.productName,
        description: product.description,
        hsn: product.hsn,
        sac: product.sac || null,
        rate: product.rate,
        unit: product.unit,
        stock: product.stock,
        gst_percent: product.gstPercent,
        alert_threshold: product.alertThreshold ?? 10,
        warehouse_id: product.warehouseId || null,
        barcode: product.barcode || null
    };

    const { data, error } = await supabase
        .from('inventory')
        .update(payload)
        .eq('id', product.id)
        .select()
        .single();

    if (error) throw error;

    // Synchronize Packaging Units: Clear existing and re-insert new to handle additions/removals
    await supabase.from('packaging_units').delete().eq('product_id', product.id);

    if (product.packagingUnits && product.packagingUnits.length > 0) {
        const puPayload = product.packagingUnits.map(pu => ({
            product_id: product.id,
            unit_name: pu.unitName,
            conversion_factor: pu.conversionFactor,
            is_default: pu.isDefault
        }));
        const { error: puError } = await supabase.from('packaging_units').insert(puPayload);
        if (puError) console.error("Error updating packaging units", puError);
    }

    // Return the updated product with mapped fields for the frontend
    return {
        ...data,
        productName: data.product_name,
        description: data.description,
        gstPercent: data.gst_percent,
        warehouseId: data.warehouse_id,
        alertThreshold: data.alert_threshold,
        packagingUnits: product.packagingUnits || []
    } as Product;
};

export const deleteProductApi = async (id: string): Promise<void> => {
    const { error } = await supabase.from('inventory').update({ status: 'archived' }).eq('id', id);
    if (error) throw error;
};

// --- INVOICES ---
export const fetchInvoices = async (): Promise<Invoice[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Using explicit foreign key relationship to resolve ambiguity
    // 'invoices_customer_id_fkey' is the likely standard FK name for customer_id
    const { data, error } = await supabase
        .from('invoices')
        .select(`
      *,
      customer:customers!invoices_customer_id_fkey ( name, gstin, address, state, state_code ),
      items:invoice_items!invoice_items_invoice_id_fkey (
        product_id, quantity, rate, gst_percent, amount,
        product:inventory!invoice_items_product_id_fkey ( name, product_name, hsn, sac, unit )
      )
    `)
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase fetchInvoices Error:", error.message, error.details, error.hint);
        throw error; // Throw so AppContext knows sync failed
    }

    console.log(`Fetched ${data.length} invoices for user ${user.id}`);

    return data.map((row: any) => {
        // relationship is aliased as 'customer', might be object or array
        const custData = Array.isArray(row.customer) ? row.customer[0] : row.customer;

        const invoice = {
            id: row.id,
            invoiceNo: row.invoice_number,
            type: (row.status === 'generated' ? 'GOODS' : row.status) as any,
            date: row.created_at,
            totalTaxable: (row.total_amount || 0) - (row.tax_amount || 0),
            igst: row.igst || 0, cgst: row.cgst || 0, sgst: row.sgst || 0,
            totalAmount: row.total_amount,
            isPaid: false,
            customer: {
                name: custData?.name || 'Unknown',
                gstin: custData?.gstin,
                address: custData?.address,
                state: custData?.state,
                stateCode: custData?.state_code
            },
            items: (row.items || []).map((item: any) => ({
                productId: item.product_id,
                productName: item.product?.product_name || item.product?.name || 'Unknown',
                hsn: item.product?.hsn || '',
                sac: item.product?.sac || '',
                qty: item.quantity,
                rate: item.rate,
                unit: item.product?.unit || 'NOS',
                taxableValue: item.amount,
                gstPercent: item.gst_percent
            }))
        } as unknown as Invoice;
        return invoice;
    });
};

export const createInvoice = async (invoice: Invoice) => {
    const authHeaders = await getBackendAuthHeader();

    // The backend expects specific field names and structure
    const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(invoice)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice via server');
    }

    return await response.json();
};

// --- STOCK LOGS ---
export const fetchStockLogs = async (): Promise<StockLog[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('stock_logs')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data.map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        change: row.change_amt,
        reason: row.reason,
        date: row.date,
        user: 'System'
    }));
};

export const adjustStockApi = async (productId: string, delta: number, reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prod } = await supabase.from('inventory').select('stock, name').eq('id', productId).single();

    if (prod) {
        await supabase.from('inventory').update({ stock: prod.stock + delta }).eq('id', productId);

        await supabase.from('stock_logs').insert([{
            tenant_id: user?.id,
            product_id: productId,
            product_name: prod.name,
            change_amt: delta,
            reason: reason,
            date: new Date().toLocaleString()
        }]);
    }
};

export const fetchGlobalStats = async () => {
    // Platform Admin: Fetch stats from all tables - restricted columns for scalability
    const { data: users } = await supabase.from('users').select('id, name, email, role, shop_name, status, plan, created_at');
    const { data: invoices } = await supabase.from('invoices').select('total_amount, tenant_id');

    const totalRevenue = invoices?.reduce((sum, inv: any) => sum + (inv.total_amount || 0), 0) || 0;

    // Calculate per-tenant aggregates
    const tenantMetrics = (invoices || []).reduce((acc: any, inv: any) => {
        const tid = inv.tenant_id;
        if (tid) {
            if (!acc[tid]) acc[tid] = { revenue: 0, count: 0 };
            acc[tid].revenue += (inv.total_amount || 0);
            acc[tid].count += 1;
        }
        return acc;
    }, {});

    // Map existing users
    const allUsers = (users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        shopName: u.shop_name,
        status: u.status,
        plan: u.plan,
        createdAt: u.created_at,
        revenue: tenantMetrics[u.id]?.revenue || 0,
        invoiceCount: tenantMetrics[u.id]?.count || 0
    }));

    // Ghost tenant detection disabled - showing only registered users
    const combinedUsers = allUsers;
    const shopCount = combinedUsers.filter(u => u.role === 'ADMIN').length;

    // Convert settings array to object map
    const systemSettings: any = {};
    const { data: settings } = await supabase.from('system_settings').select('*');
    settings?.forEach((s: any) => systemSettings[s.name] = (s.value === 'true' || s.value === true));

    return {
        totalShops: shopCount,
        totalRevenue,
        allUsers: combinedUsers,
        allInvoices: [],
        systemSettings
    };
};

export const toggleStatus = async (type: string, id: string, status: string) => {
    let table = 'users';
    if (type === 'PRODUCT') table = 'inventory';
    if (type === 'CUSTOMER') table = 'customers';

    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) throw error;
};

export const toggleSystem = async (name: string, value: boolean) => {
    const { error } = await supabase.from('system_settings').upsert({ name, value: String(value) }, { onConflict: 'name' });
    if (error) throw error;
};

export const fetchShopSettingsAdmin = async (tenantId: string): Promise<FirmSettings | null> => {
    const { data, error } = await supabase.from('firm_settings').select('*').eq('tenant_id', tenantId).single();
    if (error) return null;
    return {
        ...data,
        bankName: data.bank_name,
        bankBranch: data.bank_branch,
        accNumber: data.acc_number,
        upiId: data.upi_id,
        stateCode: data.state_code,
        terms: typeof data.terms === 'string' ? JSON.parse(data.terms) : data.terms
    } as FirmSettings;
};

export const saveShopSettingsAdmin = async (tenantId: string, settings: FirmSettings) => {
    const payload = {
        tenant_id: tenantId,
        name: settings.name,
        tagline: settings.tagline,
        address: settings.address,
        pan: settings.pan,
        gstin: settings.gstin,
        phone: settings.phone,
        email: settings.email,
        web: settings.web,
        bank_name: settings.bankName,
        bank_branch: settings.bankBranch,
        acc_number: settings.accNumber,
        ifsc: settings.ifsc,
        upi_id: settings.upiId,
        terms: JSON.stringify(settings.terms || []),
        state: settings.state,
        state_code: settings.stateCode,
        declaration: settings.declaration
    };

    const { error } = await supabase
        .from('firm_settings')
        .upsert(payload, { onConflict: 'tenant_id' });
    if (error) throw error;
};

export const fetchTenantData = async (tenantId: string) => {
    const { data: products } = await supabase.from('inventory').select('*').eq('tenant_id', tenantId);
    const { data: customers } = await supabase.from('customers').select('*').eq('tenant_id', tenantId);
    const { data: invoices } = await supabase.from('invoices').select('*').eq('tenant_id', tenantId);

    return { products, customers, invoices };
};

export const deleteTenantRecord = async (tenantId: string, entity: string, id: string) => {
    const { error } = await supabase.from(entity).delete().match({ id, tenant_id: tenantId });
    if (error) throw error;
};

export const deleteUser = async (userId: string) => {
    // Platform Admin Only
    // This removes the user record from public.users.
    // It cascades to other tables if Foreign Keys are set to CASCADE,
    // otherwise we might need to delete related data first.
    // Assuming schema has ON DELETE CASCADE for tenant_id fkeys.
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
};

export const updateUserProfile = async (userId: string, data: { name: string; shopName: string }) => {
    const { error } = await supabase.from('users').update({
        name: data.name,
        shop_name: data.shopName
    }).eq('id', userId);

    if (error) throw error;
};

// --- WAREHOUSES ---
export const fetchWarehouses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createWarehouse = async (warehouse: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const payload = {
        tenant_id: user.id,
        name: warehouse.name,
        location: warehouse.location || '',
        manager: warehouse.manager || '',
        phone: warehouse.phone || '',
        status: 'active'
    };

    const { data, error } = await supabase.from('warehouses').insert([payload]).select().single();
    if (error) throw error;
    return data;
};

export const deleteWarehouse = async (id: string) => {
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) throw error;
};

// --- STORAGE ---
export const uploadInvoicePDF = async (blob: Blob, fileName: string): Promise<string | null> => {
    const filePath = `public/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('invoices').upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true
    });

    if (uploadError) {
        console.error("Upload Error:", uploadError);
        return null;
    }

    const { data } = supabase.storage.from('invoices').getPublicUrl(filePath);
    return data.publicUrl;
};

// --- BACKEND API HELPERS ---
const getBackendAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
    };
};

// --- GSTR OPERATIONS ---
export const fetchGSTRReturns = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const { data: gstr1Data, error: gstr1Error } = await supabase
        .from('gstr1_returns')
        .select('*')
        .eq('tenant_id', user.id)
        .order('return_period', { ascending: false });

    if (gstr1Error) throw gstr1Error;

    const { data: gstr3bData, error: gstr3bError } = await supabase
        .from('gstr3b_returns')
        .select('*')
        .eq('tenant_id', user.id)
        .order('return_period', { ascending: false });

    if (gstr3bError) throw gstr3bError;

    return {
        gstr1: gstr1Data || [],
        gstr3b: gstr3bData || []
    };
};

export const generateGSTR1 = async (returnPeriod: string) => {
    const authHeaders = await getBackendAuthHeader();
    const response = await fetch('/api/gstr1/generate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ returnPeriod }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate GSTR-1');
    }

    return response.json();
};

export const generateGSTR3B = async (returnPeriod: string) => {
    const authHeaders = await getBackendAuthHeader();
    const response = await fetch('/api/gstr3b/generate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ returnPeriod }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate GSTR-3B');
    }

    return response.json();
};

export const fetchGSTR1Details = async (returnPeriod: string) => {
    const authHeaders = await getBackendAuthHeader();
    const response = await fetch(`/api/gstr1/${returnPeriod}`, {
        headers: authHeaders
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GSTR-1 details');
    }

    return response.json();
};

export const fetchGSTR3BDetails = async (returnPeriod: string) => {
    const authHeaders = await getBackendAuthHeader();
    const response = await fetch(`/api/gstr3b/${returnPeriod}`, {
        headers: authHeaders
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GSTR-3B details');
    }

    return response.json();
};
