
import React from 'react';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';
import { UserRole } from '../types';
import { formatCurrency } from '../utils/helpers';
import {
  toggleStatus,
  toggleSystem,
  fetchShopSettingsAdmin,
  saveShopSettingsAdmin,
  fetchTenantData,
  deleteTenantRecord,
  deleteUser
} from '../services/apiService';
import { FirmSettings } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const PlatformAdmin: React.FC = () => {
  const { globalStats, showAlert, refreshData } = useApp();
  const { switchRole, user } = useAuth();

  // States
  const [editingShop, setEditingShop] = React.useState<string | null>(null);
  const [shopSettings, setShopSettings] = React.useState<FirmSettings | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Drill-down states
  const [viewingTenantData, setViewingTenantData] = React.useState<string | null>(null);
  const [tenantInventory, setTenantInventory] = React.useState<any[]>([]);
  const [tenantInvoices, setTenantInvoices] = React.useState<any[]>([]);
  const [isLoadingTenant, setIsLoadingTenant] = React.useState(false);

  if (!globalStats) return <div className="p-10 text-slate-400 font-black tracking-widest animate-pulse flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    SYNCING GLOBAL RECO...
  </div>;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
  const planData = [
    { name: 'Free', value: globalStats.allUsers.filter(u => u.plan === 'free').length || 0 },
    { name: 'Pro', value: globalStats.allUsers.filter(u => u.plan === 'pro').length || 1 },
    { name: 'Ent', value: globalStats.allUsers.filter(u => u.plan === 'enterprise').length || 0 },
  ];

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    showAlert(`Active context: ${role}`, 'info');
  };

  const handleToggleStatus = async (type: string, id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await toggleStatus(type, id, newStatus);
      showAlert(`${type} status updated to ${newStatus}`, 'success');
      refreshData();
    } catch (e) {
      showAlert('Failed to update status', 'error');
    }
  };

  const handleToggleSystem = async (name: string) => {
    const currentValue = globalStats.systemSettings?.[name] ?? true;
    const newValue = !currentValue;
    try {
      await toggleSystem(name, newValue);
      showAlert(`${name.toUpperCase()} toggled ${newValue ? 'ON' : 'OFF'}`, 'info');
      refreshData();
    } catch (e) {
      showAlert('System toggle failed', 'error');
    }
  };

  const openShopEditor = async (shopUserId: string) => {
    try {
      const settings = await fetchShopSettingsAdmin(shopUserId);
      setShopSettings(settings || {
        name: '', tagline: '', address: '', pan: '', gstin: '', phone: '', email: '', web: '',
        bankName: '', bankBranch: '', accNumber: '', ifsc: '', upiId: '', terms: [], state: '', stateCode: '', declaration: ''
      });
      setEditingShop(shopUserId);
    } catch (e) {
      showAlert('Failed to load shop configuration', 'error');
    }
  };

  const openTenantDrillDown = async (tenantId: string) => {
    setIsLoadingTenant(true);
    setViewingTenantData(tenantId);
    try {
      const data = await fetchTenantData(tenantId);
      setTenantInventory(data.products || []);
      setTenantInvoices(data.invoices || []);
    } catch (e) {
      showAlert('Failed to fetch tenant-specific data', 'error');
      setViewingTenantData(null);
    } finally {
      setIsLoadingTenant(false);
    }
  };

  const handleDeleteRecord = async (tenantId: string, entity: string, id: string) => {
    if (!window.confirm(`Master Override: Are you sure you want to delete this ${entity} record? This cannot be undone.`)) return;
    try {
      await deleteTenantRecord(tenantId, entity, id);
      showAlert('Record purged successfully', 'success');
      // Refresh local data
      if (entity === 'inventory') setTenantInventory(prev => prev.filter(i => i.id !== id));
      if (entity === 'invoices') setTenantInvoices(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      showAlert('Purge failed', 'error');
    }
  };

  const handleTenantDelete = async (userId: string) => {
    if (!window.confirm("CRITICAL WARNING: You are about to DELETE a Tenant Account.\n\nThis will remove their profile and prevents login.\n\nAre you sure?")) return;
    try {
      await deleteUser(userId);
      showAlert('Tenant account purged.', 'success');
      refreshData();
    } catch (e) {
      showAlert('Failed to delete tenant. Check FK constraints.', 'error');
    }
  };

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop || !shopSettings) return;
    setIsSaving(true);
    try {
      await saveShopSettingsAdmin(editingShop, shopSettings);
      showAlert('Shop configuration updated successfully', 'success');
      setEditingShop(null);
      refreshData();
    } catch (e) {
      showAlert('Failed to update shop configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Platform Command Center</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight">Shopify-style multi-tenant orchestration.</p>
        </div>
      </div>

      <div className="bg-slate-900 p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4 lg:mb-6">
              <span className="text-xl lg:text-2xl">🎭</span>
              <h3 className="text-lg lg:text-xl font-black uppercase tracking-widest">Context Engine</h3>
            </div>
            <p className="text-slate-400 text-[11px] lg:text-sm font-medium mb-6 lg:mb-8 max-w-xl leading-relaxed">
              Switch your active role context to test shop-level views.
              <span className="text-blue-400"> Current session only.</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
              <button onClick={() => handleRoleSwitch(UserRole.ADMIN)} className="bg-white/10 hover:bg-white/20 border border-white/10 py-3 lg:py-4 px-3 lg:px-6 rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest transition-all text-center">Shop Owner</button>
              <button onClick={() => handleRoleSwitch(UserRole.SALES)} className="bg-white/10 hover:bg-white/20 border border-white/10 py-3 lg:py-4 px-3 lg:px-6 rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest transition-all text-center">Billing</button>
              <button onClick={() => handleRoleSwitch(UserRole.ACCOUNTANT)} className="bg-white/10 hover:bg-white/20 border border-white/10 py-3 lg:py-4 px-3 lg:px-6 rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest transition-all text-center">Accountant</button>
              <button onClick={() => handleRoleSwitch(UserRole.PLATFORM_ADMIN)} disabled={user?.role === UserRole.PLATFORM_ADMIN} className={`py-3 lg:py-4 px-3 lg:px-6 rounded-2xl font-black text-[9px] lg:text-[10px] uppercase tracking-widest transition-all text-center ${user?.role === UserRole.PLATFORM_ADMIN ? 'bg-blue-600/30 text-white/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'}`}>Master</button>
            </div>
          </div>
          <div className="lg:w-1/3 flex flex-col gap-4">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Master Toggles</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider">Maintenance Mode</span>
                  <button onClick={() => handleToggleSystem('maintenance_mode')} className={`w-10 h-5 rounded-full relative transition-all ${globalStats.systemSettings?.maintenance_mode ? 'bg-red-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${globalStats.systemSettings?.maintenance_mode ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider">Public Signups</span>
                  <button onClick={() => handleToggleSystem('signups_enabled')} className={`w-10 h-5 rounded-full relative transition-all ${globalStats.systemSettings?.signups_enabled ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${globalStats.systemSettings?.signups_enabled ? 'left-6' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-50 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Shops</p>
          <h3 className="text-2xl lg:text-3xl font-black text-slate-800">{globalStats.totalShops}</h3>
        </div>
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-50 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Users</p>
          <h3 className="text-2xl lg:text-3xl font-black text-slate-800">{globalStats.allUsers.length}</h3>
        </div>
        <div className="bg-blue-600 p-6 lg:p-8 rounded-3xl shadow-xl text-white">
          <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">GMV (EST)</p>
          <h3 className="text-2xl lg:text-3xl font-black tracking-tighter truncate">₹{formatCurrency(globalStats.totalRevenue)}</h3>
        </div>
        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-50 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Load</p>
          <h3 className="text-2xl lg:text-3xl font-black text-green-500">OPTIMAL</h3>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-50 shadow-sm overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-sm">Tenant Directory</h3>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 bg-slate-50/20">
                <th className="px-6 lg:px-10 py-5 lg:py-6">Entity</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6">Operator</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6">Plan</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6">Status</th>
                <th className="px-6 lg:px-10 py-5 lg:py-6 text-right">Master Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              {globalStats.allUsers.filter(u => u.role === 'ADMIN').map((shopUser) => (
                <tr key={shopUser.id} className="hover:bg-slate-50/50 transition-colors group text-sm">
                  <td className="px-6 lg:px-10 py-4 lg:py-6">
                    <p className="font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{shopUser.shopName}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {shopUser.id.toUpperCase()}</p>
                  </td>
                  <td className="px-6 lg:px-10 py-4 lg:py-6">
                    <p className="font-bold text-slate-600 truncate max-w-[120px]">{shopUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px] font-medium">{shopUser.email}</p>
                  </td>
                  <td className="px-6 lg:px-10 py-4 lg:py-6">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest">
                      {shopUser.plan || 'PRO'}
                    </span>
                  </td>
                  <td className="px-6 lg:px-10 py-4 lg:py-6">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${shopUser.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {shopUser.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 lg:px-10 py-4 lg:py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openTenantDrillDown(shopUser.id)} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg hover:bg-blue-100 transition-colors">DATA</button>
                      <button onClick={() => openShopEditor(shopUser.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-colors">EDIT</button>
                      <button onClick={() => handleToggleStatus('SHOP', shopUser.id, shopUser.status || 'active')} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg hover:bg-black transition-colors">{shopUser.status === 'suspended' ? 'RESTORE' : 'SUSPEND'}</button>
                      <button onClick={() => handleTenantDelete(shopUser.id)} className="px-3 py-1.5 bg-red-100 text-red-600 text-[10px] font-black rounded-lg hover:bg-red-200 transition-colors">DELETE</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Data Drill-Down Modal */}
      {viewingTenantData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Master Data Override</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tenant ID: {viewingTenantData}</p>
              </div>
              <button onClick={() => setViewingTenantData(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-red-500 transition-all">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
              {isLoadingTenant ? (
                <div className="h-full flex items-center justify-center font-black text-slate-400 tracking-widest">LOADING TENANT DATASTREAM...</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 tracking-widest">Tenant Inventory</h4>
                    <div className="border border-slate-50 rounded-2xl overflow-hidden bg-slate-50/20">
                      {tenantInventory.length === 0 ? <p className="p-6 text-xs text-slate-400 font-bold">No products found for this tenant.</p> : (
                        <table className="w-full text-left">
                          <tr className="text-[9px] font-black text-slate-400 uppercase bg-slate-100/50"><th className="p-4">Name</th><th className="p-4">Stock</th><th className="p-4 text-right">Override</th></tr>
                          {tenantInventory.map(prod => (
                            <tr key={prod.id} className="border-t border-slate-50 text-[11px] font-bold">
                              <td className="p-4">{prod.name}</td>
                              <td className="p-4">{prod.stock} {prod.unit}</td>
                              <td className="p-4 text-right"><button onClick={() => handleDeleteRecord(viewingTenantData, 'inventory', prod.id)} className="text-red-500 hover:text-red-700">Delete</button></td>
                            </tr>
                          ))}
                        </table>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 tracking-widest">Tenant Invoices</h4>
                    <div className="border border-slate-50 rounded-2xl overflow-hidden bg-slate-50/20">
                      {tenantInvoices.length === 0 ? <p className="p-6 text-xs text-slate-400 font-bold">No invoices found for this tenant.</p> : (
                        <table className="w-full text-left">
                          <tr className="text-[9px] font-black text-slate-400 uppercase bg-slate-100/50"><th className="p-4">No.</th><th className="p-4">Amount</th><th className="p-4 text-right">Override</th></tr>
                          {tenantInvoices.map(inv => (
                            <tr key={inv.id} className="border-t border-slate-50 text-[11px] font-bold">
                              <td className="p-4">{inv.invoice_no}</td>
                              <td className="p-4">₹{inv.total_amount}</td>
                              <td className="p-4 text-right"><button onClick={() => handleDeleteRecord(viewingTenantData, 'invoices', inv.id)} className="text-red-500 hover:text-red-700">Purge</button></td>
                            </tr>
                          ))}
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shop Settings Modal (Identity/Finance) */}
      {editingShop && shopSettings && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-8 lg:p-12 animate-in zoom-in-95 overflow-y-auto max-h-[90vh] no-scrollbar">
            {/* ... (Existing Shop Settings Form) */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Shop Orchestration</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Deep Configuration Override</p>
              </div>
              <button
                onClick={() => setEditingShop(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all font-black"
              >✕</button>
            </div>

            <form onSubmit={handleSaveShopSettings} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">Identity</h5>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Legal Name</label>
                    <input type="text" value={shopSettings.name} onChange={e => setShopSettings({ ...shopSettings, name: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">GSTIN / Tax ID</label>
                    <input type="text" value={shopSettings.gstin} onChange={e => setShopSettings({ ...shopSettings, gstin: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">Finance</h5>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Bank Name</label>
                    <input type="text" value={shopSettings.bankName} onChange={e => setShopSettings({ ...shopSettings, bankName: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Account Number</label>
                    <input type="text" value={shopSettings.accNumber} onChange={e => setShopSettings({ ...shopSettings, accNumber: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2">Geography</h5>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">State & Code</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={shopSettings.state} onChange={e => setShopSettings({ ...shopSettings, state: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" placeholder="State" />
                      <input type="text" value={shopSettings.stateCode} onChange={e => setShopSettings({ ...shopSettings, stateCode: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" placeholder="02" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Phone</label>
                    <input type="text" value={shopSettings.phone} onChange={e => setShopSettings({ ...shopSettings, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
                <button type="button" onClick={() => setEditingShop(null)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Discard</button>
                <button type="submit" disabled={isSaving} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-200">
                  {isSaving ? 'Synchronizing...' : 'Apply Overrides'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformAdmin;
