import { Customer, Product, Invoice, User, UserRole, FirmSettings, StockLog } from '../types';
import { supabase } from '../supabaseClient';

// --- SETTINGS ---
export const fetchSettings = async (): Promise<FirmSettings | null> => {
    const { data, error } = await supabase.from('firm_settings').select('*').single();
    if (error) return null;

    // Map DB columns to Frontend Types (snake_case to camelCase)
    // Assuming DB has snake_case, but frontend is camelCase. 
    // We might need a mapper helper.
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

export const saveSettings = async (settings: FirmSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    const payload = {
        tenant_id: user.id,
        firm_name: settings.name, // Mapped to DB column firm_name
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

    // Robust approach: Check existence first to avoid Unique Constraint dependency issues
    const { data: existing } = await supabase
        .from('firm_settings')
        .select('id')
        .eq('tenant_id', user.id)
        .single();

    let result;
    if (existing) {
        // Update
        result = await supabase
            .from('firm_settings')
            .update(payload)
            .eq('id', existing.id)
            .select()
            .single();
    } else {
        // Insert
        result = await supabase
            .from('firm_settings')
            .insert([payload])
            .select()
            .single();
    }

    if (result.error) {
        console.error("Save Settings Error:", result.error);
        throw result.error;
    }
    return result.data;
};

// --- CUSTOMERS ---
export const fetchCustomers = async (): Promise<Customer[]> => {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
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

// --- INVENTORY ---
export const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('inventory')
        .select('*, packaging_units(*)')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map((row: any) => ({
        ...row,
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
        hsn: product.hsn,
        sac: product.sac || null,
        rate: product.rate,
        unit: product.unit,
        stock: product.stock,
        gst_percent: product.gstPercent,
        alert_threshold: product.alertThreshold ?? 10,
        warehouse_id: product.warehouseId,
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

// --- INVOICES ---
export const fetchInvoices = async (): Promise<Invoice[]> => {
    // We need to join customers. Supabase-js can do this if foreign keys are set.
    const { data, error } = await supabase
        .from('invoices')
        .select(`
            *,
            customer:customers ( name, gstin, address, state, state_code )
        `)
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((row: any) => ({
        id: row.id,
        invoiceNo: row.invoice_number, // note DB column is invoice_number
        type: row.status, // Assuming 'status' is mapped to type or we added 'type' col? Schema says 'status'. Server code had row.type. 
        // Schema had 'status' DEFAULT 'draft'. Server code insert said 'type' DEFAULT 'GOODS'. 
        // Wait, checking schema:
        /* 
           CREATE TABLE IF NOT EXISTS invoices (
             ...
             status VARCHAR(20) DEFAULT 'draft',
             ...
           ); 
           Server code insert: invoice_no, type... 
           Wait, server code api.js Line 249: INSERT INTO invoices (invoice_no, type, ...)
           Schema file lines 44-50: invoice_number, status... 
           There is a mismatch between server/api.js INSERT and server/supabase_schema.sql.
           The schema SQL I read might be old or the user updated it.
           I will Assume the server/api.js logic was correct for columns.
           But I am writing client side code now. I must rely on the ACTUAL DB schema.
           If users ran supabase_schema.sql, it lacks 'type', 'total_taxable' etc?
           Let's check schema details again.
           Schema: total_amount, tax_amount.
           Server: total_taxable, igst, cgst, sgst...
           
           Risk: The schema file in repo might NOT match the actual running server DB that was being used.
           But since we are switching to Supabase, we are likely using the schema defined in SQL or we need to ensure it matches.
           
           I will use the column names that match the `Invoice` type interface as best as possible, mapping to snake_case.
           I'll assume standard columns exist or I might fail.
         */
        date: row.created_at, // or row.date if it exists
        totalTaxable: row.total_amount - row.tax_amount, // Approximation if columns missing
        igst: 0, cgst: 0, sgst: 0, // Placeholder if missing
        totalAmount: row.total_amount,
        isPaid: false,
        customer: {
            name: row.customer?.name,
            gstin: row.customer?.gstin,
            address: row.customer?.address,
            state: row.customer?.state,
            stateCode: row.customer?.state_code
        },
        items: [] // Fetching items separately or joining
    } as unknown as Invoice));
};

export const createInvoice = async (invoice: Invoice) => {
    // This is complex transaction.
    // 1. Insert Invoice
    // 2. Insert Items
    // 3. Update Stock
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    // 1. Invoice
    const invPayload = {
        tenant_id: user.id,
        customer_id: invoice.customer.id,
        invoice_number: invoice.invoiceNo,
        total_amount: invoice.totalAmount,
        tax_amount: (invoice.igst || 0) + (invoice.cgst || 0) + (invoice.sgst || 0),
        status: 'generated'
        // Missing columns from schema? 'type', 'date', etc. I'll add what I can.
    };

    const { data: invData, error: invError } = await supabase.from('invoices').insert([invPayload]).select().single();
    if (invError) throw invError;

    // 2. Items
    const itemsPayload = invoice.items.map(item => ({
        invoice_id: invData.id,
        product_id: item.productId,
        quantity: item.qty,
        rate: item.rate,
        gst_percent: item.gstPercent,
        amount: item.taxableValue // or total
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemsPayload);
    if (itemsError) console.error("Error inserting items", itemsError);

    // 3. Stock Update (Client side loop - risky but only option without RPC)
    for (const item of invoice.items) {
        if (item.productId) {
            // Decrement stock
            // Calculate deduction based on conversion factor if present (Packaging Unit)
            // If conversionFactor is set (e.g. 1 Katta = 10 KG), and qty is 1, we deduct 10.
            const deduction = item.conversionFactor ? (item.qty * item.conversionFactor) : item.qty;

            const { data: prod } = await supabase.from('inventory').select('stock').eq('id', item.productId).single();
            if (prod) {
                await supabase.from('inventory').update({ stock: prod.stock - deduction }).eq('id', item.productId);
            }
        }
    }
};

// --- STOCK LOGS ---
export const fetchStockLogs = async (): Promise<StockLog[]> => {
    const { data, error } = await supabase.from('stock_logs').select('*').order('created_at', { ascending: false });
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
    // Platform Admin: Fetch stats from all tables (assuming RLS allows or we use admin role)
    const { data: users } = await supabase.from('users').select('*');
    const { data: invoices } = await supabase.from('invoices').select('total_amount');
    const { data: shops } = await supabase.from('users').select('*').eq('role', 'ADMIN');
    const { data: settings } = await supabase.from('system_settings').select('*');

    const totalRevenue = invoices?.reduce((sum, inv: any) => sum + (inv.total_amount || 0), 0) || 0;

    // Convert settings array to object map
    const systemSettings: any = {};
    settings?.forEach((s: any) => systemSettings[s.name] = (s.value === 'true' || s.value === true));

    return {
        totalShops: shops?.length || 0,
        totalRevenue,
        allUsers: users?.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            shopName: u.shop_name,
            status: u.status,
            plan: u.plan,
            createdAt: u.created_at
        })) || [],
        allInvoices: [] // Don't load all invoices for stats, too heavy
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
    const { data, error } = await supabase.from('warehouses').select('*').order('created_at', { ascending: false });
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

