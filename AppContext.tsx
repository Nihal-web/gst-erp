
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Customer, Invoice, FirmSettings, User, UserRole, StockLog, Warehouse } from './types';
import {
  fetchCustomers, createCustomer,
  fetchProducts, createProduct,
  fetchInvoices, createInvoice,
  fetchSettings, saveSettings,
  fetchGlobalStats, fetchStockLogs, adjustStockApi, updateUserProfile as updateUserProfileApi,
  fetchWarehouses, createWarehouse as createWarehouseApi, deleteWarehouse as deleteWarehouseApi
} from './services/apiService';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, DEFAULT_FIRM_SETTINGS } from './constants';
import { useAuth } from './AuthContext';

interface GlobalStats {
  totalShops: number;
  totalRevenue: number;
  allUsers: User[];
  allInvoices: Invoice[];
}

interface AppContextType {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  stockLogs: StockLog[];
  firm: FirmSettings;
  warehouses: Warehouse[];
  globalStats?: GlobalStats;
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateProduct: (product: Product) => void;
  addProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, delta: number, reason: string) => void;
  updateCustomer: (customer: Customer) => void;
  addCustomer: (customer: Customer) => Promise<void>;
  setFirm: (settings: FirmSettings) => Promise<void>;
  addWarehouse: (warehouse: Warehouse) => void;
  deleteWarehouse: (id: string) => void;
  showAlert: (message: string, type?: 'success' | 'error' | 'info') => void;
  refreshData: () => void;
  updateUserProfile: (name: string, shopName: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [firm, setFirm] = useState<FirmSettings>(DEFAULT_FIRM_SETTINGS);
  const [alert, setAlert] = useState<{ message: string; type: string } | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | undefined>(undefined);

  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoaded(false);
    try {
      if (user.role === UserRole.PLATFORM_ADMIN) {
        const stats = await fetchGlobalStats();
        setGlobalStats(stats);
      } else {
        const [c, p, invs, sets, logs, wh] = await Promise.all([
          fetchCustomers(),
          fetchProducts(),
          fetchInvoices(),
          fetchSettings(),
          fetchStockLogs(),
          fetchWarehouses()
        ]);
        setCustomers(c);
        setProducts(p.length > 0 ? p : INITIAL_PRODUCTS);
        setInvoices(invs);
        setStockLogs(logs);
        setWarehouses(wh || []);
        if (sets) setFirm(sets);
        else setFirm({ ...DEFAULT_FIRM_SETTINGS, name: user.shopName });
      }
    } catch (e: any) {
      console.error("Failed to load data from sync engine", e);
      const errorMsg = e.message || "Unknown sync error";
      showAlert(`Sync failed: ${errorMsg}. Using local cache.`, "error");
    } finally {
      setIsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addInvoice = async (invoice: Invoice) => {
    try {
      await createInvoice(invoice);
      setInvoices(prev => [invoice, ...prev]);
      // Update local product stock
      setProducts(prev => prev.map(p => {
        const item = invoice.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: Math.max(0, p.stock - item.qty) };
        return p;
      }));
      showAlert(`Invoice ${invoice.invoiceNo} synced successfully.`, 'success');
    } catch (e) {
      showAlert("Failed to sync invoice to cloud.", "error");
    }
  };

  const addProduct = async (product: Product) => {
    try {
      const created = await createProduct(product);
      setProducts(prev => [created, ...prev]);
      showAlert(`Product ${product.name} saved to Warehouse.`, 'success');
    } catch (e) {
      showAlert("Failed to save product.", "error");
    }
  };

  const addCustomer = async (customer: Customer) => {
    try {
      const created = await createCustomer(customer);
      setCustomers(prev => [created, ...prev]);
      showAlert(`Client ${created.name} registered.`, 'success');
    } catch (e: any) {
      console.error('Customer creation error:', e);
      showAlert(`Failed to register client: ${e.message || 'Unknown error'}`, 'error');
    }
  };

  const handleSetFirm = async (settings: FirmSettings) => {
    try {
      await saveSettings(settings);
      setFirm(settings);
      showAlert('Firm profile synced to cloud.', 'success');
    } catch (e) {
      showAlert('Failed to sync profile.', 'error');
    }
  };

  const adjustStock = async (productId: string, delta: number, reason: string) => {
    try {
      await adjustStockApi(productId, delta, reason);
      // Optimistic update
      setProducts(prev => prev.map(p => {
        if (p.id === productId) return { ...p, stock: p.stock + delta };
        return p;
      }));
      const prod = products.find(p => p.id === productId);
      const newLog: StockLog = {
        id: Math.random().toString(36).substr(2, 9),
        productId,
        productName: prod?.name || 'Unknown',
        change: delta,
        reason,
        date: new Date().toLocaleString(),
        user: user?.name || 'You'
      };
      setStockLogs(prev => [newLog, ...prev]);
      showAlert(`Inventory level adjusted.`, 'success');
    } catch (e) {
      showAlert("Failed to sync stock adjustment.", "error");
    }
  };

  const updateProduct = (product: Product) => {
    setProducts(prev => prev.map(p => (p.id === product.id ? product : p)));
    showAlert('Inventory updated locally.', 'success');
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    showAlert('Product removed from inventory.', 'info');
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => (c.id === customer.id ? customer : c)));
    showAlert('Customer profile updated locally.', 'success');
  };

  const addWarehouse = async (warehouse: Warehouse) => {
    try {
      const created = await createWarehouseApi(warehouse);
      setWarehouses(prev => [...prev, created]);
      showAlert(`Warehouse ${warehouse.name} added.`, 'success');
    } catch (e) {
      showAlert('Failed to add warehouse.', 'error');
    }
  };

  const deleteWarehouse = async (id: string) => {
    try {
      await deleteWarehouseApi(id);
      setWarehouses(prev => prev.filter(w => w.id !== id));
      showAlert('Warehouse removed.', 'info');
    } catch (e) {
      showAlert('Failed to delete warehouse.', 'error');
    }
  };

  const updateUserProfile = async (name: string, shopName: string) => {
    if (!user) return;
    try {
      await updateUserProfileApi(user.id, { name, shopName });
      // In a real app we might need to refresh the auth session or local user state
      // For now we assume a refresh or just notify success
      showAlert('Profile updated successfully', 'success');
      loadData(); // To refresh firm settings mostly, but user details in AuthContext won't update unless we reload page or have auth refresh
    } catch (e) {
      showAlert('Failed to update profile', 'error');
      throw e;
    }
  };

  return (
    <AppContext.Provider value={{
      products, customers, invoices, stockLogs, firm, globalStats,
      warehouses,
      addInvoice, updateProduct, addProduct, deleteProduct, adjustStock, updateCustomer, addCustomer, setFirm: handleSetFirm, showAlert,
      addWarehouse, deleteWarehouse, updateUserProfile,
      refreshData: loadData
    }}>
      {children}
      {alert && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-10 no-print">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 font-bold text-sm ${alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
            alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
              'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
            <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : 'ℹ️'}</span>
            {alert.message}
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
