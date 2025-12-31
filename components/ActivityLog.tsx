import React, { useEffect, useState } from 'react';
import { AuditLog, fetchAuditLogs } from '../services/auditService';

const ActivityLog: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLogs = async () => {
        setLoading(true);
        const data = await fetchAuditLogs();
        setLogs(data);
        setLoading(false);
    };

    useEffect(() => {
        loadLogs();
        // Poll every 10s for updates
        const interval = setInterval(loadLogs, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Security Audit Timeline 🛡️</h3>
                <button onClick={loadLogs} className="text-blue-600 font-bold text-xs uppercase hover:underline">Refresh</button>
            </div>

            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                {loading && logs.length === 0 ? (
                    <p className="pl-6 text-slate-400 text-sm">Loading activity...</p>
                ) : logs.length === 0 ? (
                    <p className="pl-6 text-slate-400 text-sm">No activity recorded yet.</p>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="relative pl-6 animate-in fade-in slide-in-from-left-2">
                            <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500"></span>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                <div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${log.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                                            log.action.includes('CREATE') ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {log.action}
                                    </span>
                                    <p className="text-slate-800 font-bold text-sm mt-1">{log.details}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">by {log.user_email}</p>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                    {new Date(log.timestamp).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
