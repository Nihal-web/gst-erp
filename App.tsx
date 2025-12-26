
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { AuthProvider, useAuth } from './AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PlatformAdmin from './components/PlatformAdmin';
import BillingTerminal from './components/BillingTerminal';
import Inventory from './components/Inventory';
import Customers from './components/Customers';
import Settings from './components/Settings';
import Login from './components/Login';
import Signup from './components/Signup';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode, roles?: UserRole[] }> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="h-screen flex items-center justify-center font-black text-slate-400 tracking-widest">INITIALIZING ERP STACK...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // Platform Admin bypasses role checks for general views but specific shop views are restricted
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const ReportsPlaceholder = () => (
  <div className="bg-white p-20 rounded-[3rem] shadow-sm border border-slate-50 text-center animate-in fade-in zoom-in-95">
    <div className="text-6xl mb-8">📊</div>
    <h2 className="text-3xl font-black text-slate-800 mb-4">Financial Intelligence</h2>
    <p className="text-slate-400 font-medium max-w-lg mx-auto">Full Profit & Loss, GST Summary, and Expense tracking for this shop is currently being calculated from recent invoices.</p>
    <button className="mt-10 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:scale-105 transition-transform">Run GSTR Audit</button>
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      <Route path="/" element={
        <ProtectedRoute roles={[UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.PLATFORM_ADMIN]}>
          <Layout>
            <DashboardSelector />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/platform" element={
        <ProtectedRoute roles={[UserRole.PLATFORM_ADMIN]}>
          <Layout><PlatformAdmin /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/billing" element={
        <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SALES]}>
          <Layout><BillingTerminal /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/inventory" element={
        <ProtectedRoute roles={[UserRole.ADMIN]}>
          <Layout><Inventory /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/customers" element={
        <ProtectedRoute roles={[UserRole.ADMIN, UserRole.SALES, UserRole.ACCOUNTANT]}>
          <Layout><Customers /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute roles={[UserRole.ADMIN]}>
          <Layout><Settings /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute roles={[UserRole.ADMIN, UserRole.ACCOUNTANT]}>
          <Layout><ReportsPlaceholder /></Layout>
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const DashboardSelector = () => {
  const { user } = useAuth();
  if (user?.role === UserRole.PLATFORM_ADMIN) return <PlatformAdmin />;
  return <Dashboard />;
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
