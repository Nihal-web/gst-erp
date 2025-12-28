import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv might be inconsistent in some shells
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key) env[key.trim()] = val.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    try {
        console.log('--- DIAGNOSTIC START ---');
        const { data: users, error: uErr } = await supabase.from('users').select('*');
        if (uErr) throw uErr;

        console.log(`Found ${users.length} users in public.users:`);
        users.forEach(u => {
            console.log(` - ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Shop: ${u.shop_name}`);
        });

        const { data: invs, error: iErr } = await supabase.from('invoices').select('tenant_id, total_amount');
        if (iErr) throw iErr;

        const totalGMV = invs.reduce((sum, i) => sum + (i.total_amount || 0), 0);
        console.log(`Total Invoices: ${invs.length} | Total GMV: ₹${totalGMV}`);

        const uniqueTenants = [...new Set(invs.map(i => i.tenant_id))];
        console.log(`Unique tenant_ids in invoices: ${uniqueTenants.length}`);

        uniqueTenants.forEach(tid => {
            const hasUser = users.find(u => u.id === tid);
            if (!hasUser) {
                console.log(` [!!!] MISSING USER RECORD for Tenant ID: ${tid}`);
                const tenantInvs = invs.filter(i => i.tenant_id === tid);
                console.log(`       -> This ghost tenant has ${tenantInvs.length} invoices worth ₹${tenantInvs.reduce((s, i) => s + (i.total_amount || 0), 0)}`);
            } else {
                console.log(` [OK] Tenant ID ${tid} maps to ${hasUser.shop_name || hasUser.name}`);
            }
        });
        console.log('--- DIAGNOSTIC END ---');
    } catch (e) {
        console.error('Diagnostic failed:', e);
    }
}

check();
