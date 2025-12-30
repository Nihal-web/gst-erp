
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import OnboardingModal from './OnboardingModal';

const Logo = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg lg:w-[48px] lg:h-[48px]">
    <path d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z" fill="#2563EB" />
    <path d="M50 20V80" stroke="white" strokeWidth="8" strokeLinecap="round" />
    <path d="M30 40H70" stroke="white" strokeWidth="8" strokeLinecap="round" />
    <path d="M30 60H70" stroke="white" strokeWidth="8" strokeLinecap="round" />
  </svg>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout, switchRole, originalRole } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Overview', icon: '🚀', roles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.PLATFORM_ADMIN] },
    { to: '/platform', label: 'Command Center', icon: '🕹️', roles: [UserRole.PLATFORM_ADMIN] },
    { to: '/billing', label: 'Terminal / POS', icon: '🧾', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.PLATFORM_ADMIN] },
    { to: '/customers', label: 'Client Base', icon: '👥', roles: [UserRole.ADMIN, UserRole.SALES, UserRole.ACCOUNTANT, UserRole.PLATFORM_ADMIN] },
    { to: '/inventory', label: 'Warehouse', icon: '📦', roles: [UserRole.ADMIN, UserRole.PLATFORM_ADMIN] },
    { to: '/settings', label: 'Shop Config', icon: '⚙️', roles: [UserRole.ADMIN, UserRole.PLATFORM_ADMIN] },
    { to: '/reports', label: 'Intelligence', icon: '📈', roles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.PLATFORM_ADMIN] },
  ];

  const filteredItems = navItems.filter(item => user && item.roles.includes(user.role));
  const isImpersonating = originalRole === UserRole.PLATFORM_ADMIN && user?.role !== UserRole.PLATFORM_ADMIN;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-[#F1F6FA] print:block print:h-auto print:bg-white print:overflow-visible overflow-hidden">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 lg:px-8 lg:py-4 rounded-3xl shadow-2xl flex items-center gap-4 lg:gap-6 border border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-10 w-[90%] lg:w-auto">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest truncate">Context: <span className="text-blue-400">{user?.role}</span></p>
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
          <button
            onClick={() => switchRole(UserRole.PLATFORM_ADMIN)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 lg:px-5 lg:py-2 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg whitespace-nowrap"
          >
            Exit Mode
          </button>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col p-6 shadow-sm no-print transition-transform duration-300 transform lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div
          onClick={() => { navigate('/'); setIsSidebarOpen(false); }}
          className="flex items-center gap-4 mb-10 px-2 cursor-pointer group"
        >
          <div className="group-hover:rotate-6 transition-transform">
            <Logo />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-none tracking-tighter">GST MASTER</h1>
            <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">Enterprise Pro</p>
          </div>
        </div>

        <div className="mb-8 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-2 px-2 mb-4">
            <span className="text-blue-500 font-bold">📂</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigation</span>
          </div>
          <nav className="space-y-1">
            {filteredItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 w-full text-left px-4 py-3 text-[13px] rounded-xl transition-all font-bold
                  ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-50'}
                `}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-auto space-y-4 pt-6 border-t border-slate-50">
          <div className="p-5 bg-slate-900 rounded-[2rem] shadow-xl text-white relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-600/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Session</p>
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${user?.status === 'inactive' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {user?.status || 'Active'}
              </span>
            </div>
            <p className="text-sm font-bold truncate">{user?.name}</p>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
              {user?.role === UserRole.PLATFORM_ADMIN ? 'Platform Super' : user?.role}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full py-3 text-[11px] font-black text-red-500 hover:bg-red-50 uppercase tracking-[0.2em] transition-colors border border-red-100 rounded-xl"
          >
            Logout 🚪
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 print:block print:overflow-visible overflow-hidden relative">
        <header className="h-16 lg:h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-10 flex-shrink-0 z-30 no-print">
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl lg:hidden"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[120px] sm:max-w-none">
                {user?.role === UserRole.PLATFORM_ADMIN ? 'PLATFORM ACTIVE' : 'SECURE NODE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-800 tracking-tight">{user?.name}</p>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{user?.role}</p>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-100 rounded-xl border-2 border-white shadow-lg overflow-hidden shrink-0">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} alt="Avatar" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-10 scroll-smooth bg-[#F8FAFC] print:p-0 print:bg-white print:overflow-visible no-scrollbar sm:no-scrollbar lg:no-scrollbar">
          <div className="max-w-7xl mx-auto pb-20 print:pb-0 print:max-w-none">
            {children}
          </div>
        </main>
      </div>

      <OnboardingModal />
    </div>
  );
};

export default Layout;
