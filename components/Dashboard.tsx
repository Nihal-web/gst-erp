
import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/helpers';
import { useAuth } from '../AuthContext';
import { useApp } from '../AppContext';
import { UserRole } from '../types';

const invoiceData = [
  { name: 'Sun', thisWeek: 30000, lastWeek: 20000 },
  { name: 'Mon', thisWeek: 45000, lastWeek: 30000 },
  { name: 'Tue', thisWeek: 35000, lastWeek: 42000 },
  { name: 'Wed', thisWeek: 60000, lastWeek: 38000 },
  { name: 'Thu', thisWeek: 55000, lastWeek: 45000 },
  { name: 'Fri', thisWeek: 85000, lastWeek: 60000 },
  { name: 'Sat', thisWeek: 65000, lastWeek: 55000 },
];

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, iconBg, iconColor, onClick }) => (
  <div onClick={onClick} className="bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center gap-4 lg:gap-6 hover:shadow-xl transition-all cursor-pointer group">
    <div className={`w-12 h-12 lg:w-16 lg:h-16 ${iconBg} rounded-2xl flex items-center justify-center text-xl lg:text-2xl ${iconColor} shadow-sm group-hover:scale-110 transition-transform shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <h3 className="text-xl lg:text-2xl font-black text-slate-800 leading-tight tracking-tight truncate">{value}</h3>
      <p className="text-[9px] lg:text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest truncate">{subtitle}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { invoices, products } = useApp();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  const isAccountant = user?.role === UserRole.ACCOUNTANT;

  // Calculate real stats
  const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingAmount = invoices.filter(inv => !inv.isPaid).reduce((sum, inv) => sum + inv.totalAmount, 0);
  // Assuming 70% is cost for profit calculation (mock logic until expense tracking is added)
  const estimatedProfit = totalSales * 0.3;
  const expenses = totalSales * 0.7; // Mock expenses

  const lowStockCount = products.filter(p => p.stock < (p.alertThreshold || 10)).length;

  // Chart Data Generation
  const getChartData = () => {
    const days = viewMode === 'week' ? 7 : 30;
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];

      const daySales = invoices
        .filter(inv => inv.date.startsWith(dateStr))
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      data.push({ name: dayStr, sales: daySales });
    }
    return data;
  };

  const chartData = getChartData();

  if (!user) return null;

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 lg:gap-0">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Shop Console</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight truncate">Business health for <span className="text-blue-600 font-black">{user?.shopName}</span></p>
        </div>
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex gap-1 shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${viewMode === 'week' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-blue-600'}`}
          >
            Live Analytics
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${viewMode === 'month' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-blue-600'}`}
          >
            History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard onClick={() => navigate('/reports')} title="Revenue" value={`₹${formatCurrency(totalSales)}`} subtitle="Total Sales" icon="💰" iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard onClick={() => navigate('/reports')} title="Expenses" value={`₹${formatCurrency(expenses)}`} subtitle="Est. Outflow" icon="📉" iconBg="bg-indigo-50" iconColor="text-indigo-600" />
        <StatCard onClick={() => navigate('/reports')} title="Dues" value={`₹${formatCurrency(pendingAmount)}`} subtitle="Pending" icon="💳" iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard onClick={() => navigate('/reports')} title="Profit" value={`₹${formatCurrency(estimatedProfit)}`} subtitle="Net Income" icon="💎" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50 min-h-[350px]">
          <div className="flex justify-between items-start mb-6 lg:mb-10">
            <div>
              <h4 className="text-lg lg:text-xl font-black text-slate-800">Shop Performance</h4>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{viewMode === 'week' ? 'Weekly' : 'Monthly'} Sales Trend</p>
            </div>
          </div>
          <div className="h-64 lg:h-72">
            <ResponsiveContainer width="100%" height="100%" minHeight={100}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900' }} dy={10} />
                <YAxis hide={true} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value}`, '']}
                />
                <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={5} dot={{ r: 5, strokeWidth: 3, fill: '#fff', stroke: '#2563eb' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 lg:p-10 rounded-3xl lg:rounded-[2.5rem] shadow-2xl text-white flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
          <div>
            <h4 className="text-lg lg:text-xl font-black mb-6 lg:mb-8 flex items-center gap-3">
              <span className="text-blue-400">⚡</span>
              Quick Actions
            </h4>
            <div className="space-y-3 lg:space-y-4">
              {!isAccountant && (
                <button onClick={() => navigate('/customers')} className="w-full py-3 lg:py-4 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest text-left px-5 lg:px-6 transition-all flex justify-between items-center text-white shadow-xl shadow-blue-900/20">
                  Register New Client 👥 <span>+</span>
                </button>
              )}
              {!isAccountant && (
                <button onClick={() => navigate('/billing')} className="w-full py-3 lg:py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest text-left px-5 lg:px-6 transition-all flex justify-between items-center">
                  Launch POS Terminal 🧾 <span>→</span>
                </button>
              )}
              <button onClick={() => navigate('/reports')} className="w-full py-3 lg:py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest text-left px-5 lg:px-6 transition-all flex justify-between items-center">
                Export GST Report 📑 <span>→</span>
              </button>
              {!isAccountant && (
                <button onClick={() => navigate('/inventory')} className="w-full py-3 lg:py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest text-left px-5 lg:px-6 transition-all flex justify-between items-center">
                  Warehouse Audit 📦 <span>→</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 lg:mt-10 pt-6 lg:pt-8 border-t border-white/10">
            {lowStockCount > 0 && (
              <div className="mb-4 bg-red-500/20 border border-red-500/30 p-3 rounded-xl flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="text-[10px] font-black text-red-300 uppercase tracking-widest">Action Required</p>
                  <p className="text-xs font-bold text-white">{lowStockCount} items below stock threshold.</p>
                </div>
              </div>
            )}
            <p className="text-[9px] lg:text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Compliance Alert</p>
            <p className="text-[11px] lg:text-xs font-medium text-white/60 leading-relaxed">GSTR-1 filing window closes in 4 days. Synchronize all invoices.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
