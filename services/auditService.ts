import { supabase } from '../supabaseClient';

export interface AuditLog {
    id: string;
    tenant_id?: string;
    user_email: string;
    action: string;
    details: string;
    timestamp: string; // Map from created_at in DB
}

export const logActivity = async (userEmail: string, action: string, details: string, tenantId?: string) => {
    try {
        const payload: any = { user_email: userEmail, action, details };
        if (tenantId) payload.tenant_id = tenantId;

        const { error } = await supabase
            .from('activity_logs')
            .insert([payload]);

        if (error) {
            console.warn("Audit Log DB Insert Failed:", error.message);
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
        .select('id, tenant_id, user_email, action, details, timestamp:created_at')
        .order('created_at', { ascending: false })
        .limit(100);

    if (!error && data) {
        return data as unknown as AuditLog[];
    }

    console.warn("Audit logs fetch error:", error);

    // Fallback to local storage
    return JSON.parse(localStorage.getItem('local_audit_logs') || '[]');
};
