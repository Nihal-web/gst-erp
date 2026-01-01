
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
import ForgetPassword from './components/ForgetPassword';
import ResetPassword from './components/ResetPassword';
import Team from './components/Team';
import Reports from './components/Reports';
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



const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

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

      <Route path="/team" element={
        <ProtectedRoute roles={[UserRole.ADMIN, UserRole.PLATFORM_ADMIN]}>
          <Layout><Team /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute roles={[UserRole.ADMIN, UserRole.ACCOUNTANT]}>
          <Layout><Reports /></Layout>
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
