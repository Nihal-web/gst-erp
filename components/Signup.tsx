
import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserRole } from '../types';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [role] = useState<UserRole>(UserRole.ADMIN);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, password, name, shopName, role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-12 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black italic mx-auto mb-4 shadow-xl shadow-blue-200">
            GFT
          </div>
          <h1 className="text-3xl font-black text-slate-800">Firm Registration</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Create your shop owner profile</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Business Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800"
                placeholder="owner@yourfirm.com"
              />
            </div>
            <div className="col-span-2 relative">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Your Name</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800"
                placeholder="Full Name"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Firm Name</label>
              <input
                type="text" required value={shopName} onChange={e => setShopName(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold text-slate-800"
                placeholder="e.g. Gujarat Freight Tools"
              />
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Initializing ERP...' : 'Complete Setup'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-slate-400 text-sm font-bold">Already have an account?</p>
          <Link to="/login" className="text-blue-600 font-black text-sm hover:underline mt-1 block">
            Login to Console
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
