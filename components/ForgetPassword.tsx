import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Link } from 'react-router-dom';

const ForgetPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to send reset email");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black italic mx-auto mb-4 shadow-xl shadow-blue-200">
                        GFT
                    </div>
                    <h1 className="text-3xl font-black text-slate-800">Check Your Email</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Password Reset Instructions Sent</p>
                    <div className="mt-6 p-4 bg-green-50 text-green-600 rounded-2xl text-sm font-bold border border-green-100">
                        ✅ We've sent a password reset link to {email}. Please check your inbox and follow the instructions.
                    </div>
                    <Link to="/login" className="mt-6 inline-block text-blue-600 font-black text-sm hover:underline">
                        Back to Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black italic mx-auto mb-4 shadow-xl shadow-blue-200">
                        GFT
                    </div>
                    <h1 className="text-3xl font-black text-slate-800">Reset Password</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Enter your email to receive a reset link</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-2">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                            placeholder="admin@gft.com"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                    <p className="text-slate-400 text-sm font-bold">Remember your password?</p>
                    <Link to="/login" className="text-blue-600 font-black text-sm hover:underline mt-1 block">
                        Back to Login →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgetPassword;