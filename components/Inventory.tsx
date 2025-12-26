
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { formatCurrency } from '../utils/helpers';
import { Product } from '../types';
import { fetchHSNDetails } from '../services/geminiService';

const Inventory: React.FC = () => {
  const { products, stockLogs, showAlert, updateProduct, addProduct, adjustStock } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<Product | null>(null);
  const [viewTab, setViewTab] = useState<'warehouse' | 'history'>('warehouse');
  const [isFetchingHSN, setIsFetchingHSN] = useState(false);

  const [adjustData, setAdjustData] = useState({ quantity: 0, reason: 'Stock correction' });
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    hsn: '',
    rate: 0,
    unit: 'NOS',
    stock: 0,
    gstPercent: 18
  });

  const handleAIHSNFetch = async () => {
    if (!newProduct.name || newProduct.name.length < 3) {
      showAlert("Enter product name for AI lookup.", "error");
      return;
    }
    setIsFetchingHSN(true);
    try {
      const result = await fetchHSNDetails(newProduct.name);
      if (result) {
        setNewProduct(prev => ({
          ...prev,
          hsn: result.hsnCode,
          gstPercent: result.gstPercent
        }));
        showAlert("HSN & GST% matched by AI ✨", "success");
      }
    } catch (e) {
      showAlert("AI lookup failed.", "error");
    } finally {
      setIsFetchingHSN(false);
    }
  };

  const handleReorder = (id: string) => {
    const p = products.find(prod => prod.id === id);
    if (p) {
      adjustStock(p.id, 50, "Standard Reorder");
    }
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal) return;
    adjustStock(showAdjustModal.id, adjustData.quantity, adjustData.reason);
    setShowAdjustModal(null);
    setAdjustData({ quantity: 0, reason: 'Stock correction' });
  };

  const handleAddNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.hsn) {
      showAlert("Name and HSN are required.", "error");
      return;
    }
    const product: Product = {
      id: window.crypto.randomUUID() || Math.random().toString(36).substr(2, 9),
      name: newProduct.name!,
      hsn: newProduct.hsn!,
      rate: Number(newProduct.rate) || 0,
      unit: newProduct.unit || 'NOS',
      stock: Number(newProduct.stock) || 0,
      gstPercent: Number(newProduct.gstPercent) || 18,
    };
    addProduct(product);
    setShowAddModal(false);
    setNewProduct({ name: '', hsn: '', rate: 0, unit: 'NOS', stock: 0, gstPercent: 18 });
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Inventory Control</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight">Warehouse status for Gujarat Freight Tools.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm w-full sm:w-auto">
            <button
              onClick={() => setViewTab('warehouse')}
              className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'warehouse' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              Warehouse
            </button>
            <button
              onClick={() => setViewTab('history')}
              className={`flex-1 sm:flex-none px-4 lg:px-6 py-2 rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'history' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}
            >
              History
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-8 py-3 lg:py-3.5 rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-100 transition-all active:scale-95 whitespace-nowrap"
          >
            + Add Asset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
        <div className="bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 lg:mb-2">Active SKUs</p>
          <h3 className="text-3xl lg:text-4xl font-black text-slate-800">{products.length}</h3>
        </div>
        <div className="bg-orange-50 p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-orange-100">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 lg:mb-2">Low Stock</p>
          <h3 className="text-3xl lg:text-4xl font-black text-orange-800">
            {products.filter(p => p.stock < 10).length}
          </h3>
        </div>
        <div className="bg-blue-50 p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-blue-100">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 lg:mb-2">Valuation</p>
          <h3 className="text-2xl lg:text-4xl font-black text-blue-800 tracking-tighter truncate">
            ₹{formatCurrency(products.reduce((s, p) => s + (p.rate * p.stock), 0))}
          </h3>
        </div>
      </div>

      {viewTab === 'warehouse' ? (
        <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
          <div className="p-4 lg:p-8 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center gap-4 bg-slate-50/30">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
              <input
                type="text"
                placeholder="Search assets..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs lg:text-sm font-medium focus:ring-4 focus:ring-blue-50 transition-all outline-none"
              />
            </div>
            <button
              onClick={() => showAlert('Compiling CSV for warehouse...', 'info')}
              className="px-6 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] lg:text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all shrink-0"
            >
              Export Warehouse
            </button>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="text-[10px] lg:text-[11px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-50">
                  <th className="px-6 lg:px-8 py-5 lg:py-6">Product Details</th>
                  <th className="px-6 lg:px-8 py-5 lg:py-6 w-32">HSN/SAC</th>
                  <th className="px-6 lg:px-8 py-5 lg:py-6 w-40 text-right">Price</th>
                  <th className="px-6 lg:px-8 py-5 lg:py-6 w-32">Stock</th>
                  <th className="px-6 lg:px-8 py-5 lg:py-6 w-32">Status</th>
                  <th className="px-6 lg:px-8 py-5 lg:py-6 text-right w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 lg:px-8 py-4 lg:py-6">
                      <p className="font-black text-slate-800 uppercase tracking-tight text-xs lg:text-sm truncate max-w-[200px] lg:max-w-none">{product.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">GFT-SKU-{product.id}</p>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-6 text-xs text-slate-500 font-black">{product.hsn}</td>
                    <td className="px-6 lg:px-8 py-4 lg:py-6 text-sm font-black text-slate-800 text-right">₹{formatCurrency(product.rate)}</td>
                    <td className="px-6 lg:px-8 py-4 lg:py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${product.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                        {product.stock} {product.unit}
                      </span>
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-6">
                      {product.stock < 10 ? (
                        <span className="text-orange-600 text-[9px] font-black uppercase tracking-widest">⚠️ LOW</span>
                      ) : (
                        <span className="text-blue-500 text-[9px] font-black uppercase tracking-widest">✓ OK</span>
                      )}
                    </td>
                    <td className="px-6 lg:px-8 py-4 lg:py-6 text-right">
                      <div className="flex gap-2 justify-end lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setShowAdjustModal(product)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg hover:bg-slate-200"
                        >
                          Adjust
                        </button>
                        <button
                          onClick={() => handleReorder(product.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:bg-blue-700"
                        >
                          Fill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden animate-in fade-in slide-in-from-right-4">
          <div className="p-6 lg:p-8 border-b border-slate-50 bg-slate-50/50">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Modification Ledger</h3>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-[10px] lg:text-[11px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-50">
                  <th className="px-6 lg:px-8 py-5">Timestamp</th>
                  <th className="px-6 lg:px-8 py-5">Asset</th>
                  <th className="px-6 lg:px-8 py-5 w-24">Delta</th>
                  <th className="px-6 lg:px-8 py-5">Note</th>
                  <th className="px-6 lg:px-8 py-5 text-right w-32">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold">
                {stockLogs.length > 0 ? stockLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 lg:px-8 py-4 text-[10px] text-slate-500 whitespace-nowrap">{log.date}</td>
                    <td className="px-6 lg:px-8 py-4 text-slate-800 uppercase text-xs truncate max-w-[150px]">{log.productName}</td>
                    <td className="px-6 lg:px-8 py-4">
                      <span className={`text-xs font-black ${log.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {log.change > 0 ? '+' : ''}{log.change}
                      </span>
                    </td>
                    <td className="px-6 lg:px-8 py-4 text-slate-500 font-medium text-[10px] italic">{log.reason}</td>
                    <td className="px-6 lg:px-8 py-4 text-blue-600 text-[10px] text-right truncate">{log.user}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic text-sm">No activity records.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl lg:rounded-[2.5rem] shadow-2xl p-6 lg:p-10 animate-in zoom-in-95">
            <h3 className="text-xl lg:text-2xl font-black text-slate-800 mb-1">Adjust Units</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6 truncate">{showAdjustModal.name}</p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4 lg:space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Delta (+/-)</label>
                <input
                  type="number"
                  autoFocus
                  value={adjustData.quantity}
                  onChange={e => setAdjustData({ ...adjustData, quantity: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 lg:py-4 px-5 lg:px-6 font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Reason</label>
                <select
                  value={adjustData.reason}
                  onChange={e => setAdjustData({ ...adjustData, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold text-slate-800 outline-none text-xs"
                >
                  <option value="Stock correction">Correction</option>
                  <option value="Damaged goods">Damaged</option>
                  <option value="Physical audit match">Audit Match</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl lg:rounded-2xl font-black text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl lg:rounded-2xl font-black shadow-xl shadow-blue-100 text-xs"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto no-scrollbar">
          <div className="bg-white w-full max-w-lg rounded-3xl lg:rounded-[2.5rem] shadow-2xl p-6 lg:p-10 my-8 animate-in zoom-in-95">
            <h3 className="text-xl lg:text-2xl font-black text-slate-800 mb-6">New Asset Registration</h3>
            <form onSubmit={handleAddNewProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Full Description</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm"
                  placeholder="e.g. Heavy Duty Drill"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">HSN Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProduct.hsn}
                    onChange={e => setNewProduct({ ...newProduct, hsn: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm"
                    placeholder="8203"
                  />
                  <button
                    type="button"
                    onClick={handleAIHSNFetch}
                    disabled={isFetchingHSN}
                    className="bg-purple-50 text-purple-600 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center gap-2"
                  >
                    {isFetchingHSN ? '⏳' : '✨ AI'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Unit</label>
                <select
                  value={newProduct.unit}
                  onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm"
                >
                  <option value="NOS">NOS (Numbers)</option>
                  <option value="PCS">PCS (Pieces)</option>
                  <option value="KG">KG (Kilograms)</option>
                  <option value="ML">ML (Milliliters)</option>
                  <option value="LTR">LTR (Liters)</option>
                  <option value="SET">SET (Sets)</option>
                  <option value="BOX">BOX</option>
                  <option value="MTR">MTR (Meters)</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Unit Price</label>
                <input
                  type="number"
                  value={newProduct.rate}
                  onChange={e => setNewProduct({ ...newProduct, rate: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Initial Stock</label>
                <input
                  type="number"
                  value={newProduct.stock}
                  onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm"
                />
              </div>
              <div className="sm:col-span-2 flex gap-3 mt-4 lg:mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 lg:py-4 bg-slate-100 text-slate-600 rounded-xl lg:rounded-2xl font-black text-xs"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 lg:py-4 bg-blue-600 text-white rounded-xl lg:rounded-2xl font-black shadow-xl shadow-blue-100 text-xs"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
