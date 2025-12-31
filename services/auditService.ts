import { supabase } from '../supabaseClient';

export interface AuditLog {
    id: string;
    user_email: string;
    action: string;
    details: string;
    timestamp: string;
}

export const logActivity = async (userEmail: string, action: string, details: string) => {
    try {
        // In a real app with RLS, we'd insert to a table.
        // For this MVP, we will try to insert if the table exists, otherwise just console log
        // and potentially store in localStorage for a demo "local" audit log if DB fails.

        /* 
          Table Schema needed:
          create table activity_logs (
            id uuid default uuid_generate_v4() primary key,
            user_email text,
            action text,
            details text,
            timestamp timestamptz default now()
          );
        */

        const { error } = await supabase
            .from('activity_logs')
            .insert([
                { user_email: userEmail, action, details }
            ]);

        if (error) {
            console.warn("Audit Log DB Insert Failed (Table might be missing):", error.message);
            // Fallback for Demo: Store in LocalStorage
            const currentLogs = JSON.parse(localStorage.getItem('local_audit_logs') || '[]');
            currentLogs.unshift({
                id: Date.now().toString(),
                user_email: userEmail,
                action,
                details,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('local_audit_logs', JSON.stringify(currentLogs.slice(0, 50)));
        }
    } catch (err) {
        console.error("Audit Logging Error:", err);
    }
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
    // Try DB first
    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

    if (!error && data) {
        return data;
    }

    // Fallback to local storage
    return JSON.parse(localStorage.getItem('local_audit_logs') || '[]');
};
