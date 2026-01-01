import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import ActivityLog from './ActivityLog';
import { logActivity } from '../services/auditService';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: string;
}

const Team: React.FC = () => {
    const { user } = useAuth();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newItem, setNewItem] = useState({ email: '', password: '', name: '', role: UserRole.SALES });
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    const API_URL = 'http://localhost:5000/api/admin'; // TODO: Move to constants or environment config

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('gst_erp_current_session'); // Assuming token is stored here
            if (!token) return;

            const res = await fetch(`${API_URL}/team-members`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMsg('');

        try {
            const token = localStorage.getItem('gst_erp_current_session');
            const res = await fetch(`${API_URL}/create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newItem)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');

            setMsg('Team member added successfully!');
            logActivity(user?.email || 'admin', 'ADD USER', `Invited ${newItem.name} (${newItem.role})`, user?.id);
            setShowModal(false);
            setNewItem({ email: '', password: '', name: '', role: UserRole.SALES });
            fetchMembers();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.PLATFORM_ADMIN)) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Team Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage access and roles for your shop</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Member
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400 animate-pulse">Loading team...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {member.name.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-slate-900">{member.name}</div>
                                                <div className="text-sm text-slate-500">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${member.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' :
                                                member.role === UserRole.SALES ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center text-sm text-slate-600">
                                            <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                            {member.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-red-600 text-sm font-medium">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {members.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            No team members found. Add someone to get started!
                        </div>
                    )}
                </div>
            )}

            {/* Add Member Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">New Team Member</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                            {msg && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg">{msg}</div>}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    value={newItem.email}
                                    onChange={e => setNewItem({ ...newItem, email: e.target.value })}
                                    placeholder="colleague@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    value={newItem.password}
                                    onChange={e => setNewItem({ ...newItem, password: e.target.value })}
                                    placeholder="Min 6 characters"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role Permission</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[UserRole.SALES, UserRole.ACCOUNTANT, UserRole.ADMIN].map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, role: r })}
                                            className={`px-3 py-2 text-sm font-medium rounded-lg border ${newItem.role === r
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    {newItem.role === UserRole.ADMIN ? 'Full access to all features.' :
                                        newItem.role === UserRole.SALES ? 'Can create invoices and view customers.' :
                                            'Can view reports and invoices.'}
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:shadow-lg hover:bg-indigo-700 transition-all active:scale-[0.98]"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="mt-8">
                <ActivityLog />
            </div>
        </div>
    );
};

export default Team;
