import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { formatCurrency } from '../utils/helpers';
import { Product, Warehouse } from '../types';
import { fetchHSNDetails, HSNSuggestion } from '../services/geminiService';

const Inventory: React.FC = () => {
  const { products, stockLogs, showAlert, updateProduct, addProduct, adjustStock, warehouses, addWarehouse, deleteWarehouse, deleteProduct } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<Product | null>(null);
  const [viewTab, setViewTab] = useState<'warehouse' | 'history'>('warehouse');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [isFetchingHSN, setIsFetchingHSN] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<HSNSuggestion[]>([]);

  const [adjustData, setAdjustData] = useState({ quantity: 0, reason: 'Stock correction' });

  // New Product State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', productName: '', description: '', type: 'GOODS', hsn: '', rate: 0, unit: 'NOS', stock: 0, gstPercent: 18, warehouseId: '', alertThreshold: 10, packagingUnits: []
  });

  // Temp state for adding a packaging unit
  const [newPkgUnit, setNewPkgUnit] = useState({ unitName: '', conversionFactor: 1, isDefault: false });

  const addPkgUnit = () => {
    if (!newPkgUnit.unitName || newPkgUnit.conversionFactor <= 0) return showAlert("Invalid Unit Details", "error");
    setNewProduct(prev => ({
      ...prev,
      packagingUnits: [...(prev.packagingUnits || []), { ...newPkgUnit, id: Math.random().toString(36), productId: '' }]
    }));
    setNewPkgUnit({ unitName: '', conversionFactor: 1, isDefault: false });
  };

  const removePkgUnit = (index: number) => {
    setNewProduct(prev => ({
      ...prev,
      packagingUnits: prev.packagingUnits?.filter((_, i) => i !== index)
    }));
  };

  // New Warehouse State
  const [newWarehouse, setNewWarehouse] = useState<Partial<Warehouse>>({
    name: '', location: '', manager: '', phone: ''
  });

  const handleAIHSNFetch = async () => {
    const searchName = newProduct.productName || newProduct.name;
    if (!searchName || searchName.length < 3) {
      showAlert("Enter product name for AI lookup.", "error");
      return;
    }
    setIsFetchingHSN(true);
    setAiSuggestions([]);
    try {
      const results = await fetchHSNDetails(searchName, newProduct.type || 'GOODS');
      if (results && results.length > 0) {
        setAiSuggestions(results);
        showAlert("AI found matching HSN codes ✨", "success");
      } else {
        showAlert("No HSN found.", "info");
      }
    } catch (e) {
      showAlert("AI lookup failed.", "error");
    } finally {
      setIsFetchingHSN(false);
    }
  };

  const applySuggestion = (s: HSNSuggestion) => {
    // Extract number from string rate e.g. "18%" -> 18, "0% (Exempt)" -> 0
    const rateMatch = s.gstRate.match(/(\d+(\.\d+)?)/);
    const rate = rateMatch ? parseFloat(rateMatch[0]) : 0;

    setNewProduct(prev => ({ ...prev, hsn: s.hsnCode, gstPercent: rate }));
    setAiSuggestions([]); // clear suggestions
  };

  const handleAddWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.name) return showAlert("Warehouse Name required", "error");
    addWarehouse({
      id: Math.random().toString(36).substr(2, 9),
      name: newWarehouse.name!,
      location: newWarehouse.location || '',
      manager: newWarehouse.manager || '',
      phone: newWarehouse.phone || ''
    });
    setNewWarehouse({ name: '', location: '', manager: '', phone: '' });
    setShowWarehouseModal(false);
  };

  const handleAddNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.productName || !newProduct.hsn) {
      showAlert("Product Name and HSN are required.", "error");
      return;
    }

    const product: Product = {
      id: window.crypto.randomUUID() || Math.random().toString(36).substr(2, 9),
      name: newProduct.name || newProduct.productName!,
      productName: newProduct.productName!,
      description: newProduct.description || '',
      type: newProduct.type || 'GOODS',
      hsn: newProduct.hsn!,
      rate: Number(newProduct.rate) || 0,
      unit: newProduct.unit || 'NOS',
      stock: Number(newProduct.stock) || 0,
      gstPercent: Number(newProduct.gstPercent) || 18,
      warehouseId: newProduct.warehouseId,
      alertThreshold: Number(newProduct.alertThreshold) || 10,
      packagingUnits: newProduct.packagingUnits || []
    };
    addProduct(product);
    setShowAddModal(false);
    setNewProduct({ name: '', productName: '', description: '', type: 'GOODS', hsn: '', rate: 0, unit: 'NOS', stock: 0, gstPercent: 18, warehouseId: '', alertThreshold: 10, packagingUnits: [] });
  };

  const filteredProducts = selectedWarehouseId === 'all'
    ? products
    : products.filter(p => p.warehouseId === selectedWarehouseId);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Inventory Control</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight">Manage Your Warehouses and Assets </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button onClick={() => setShowWarehouseModal(true)} className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all">
            Manage Warehouses 🏭
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-8 py-3 lg:py-3.5 rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-100 transition-all active:scale-95 whitespace-nowrap">
            + Add Asset
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-8">
        <div className="bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 lg:mb-2">Active SKUs</p>
          <h3 className="text-3xl lg:text-4xl font-black text-slate-800">{products.length}</h3>
        </div>
        <div className="bg-orange-50 p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-orange-100">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 lg:mb-2">Low Stock</p>
          <h3 className="text-3xl lg:text-4xl font-black text-orange-800">{products.filter(p => p.stock < (p.alertThreshold || 10)).length}</h3>
        </div>
        <div className="bg-blue-50 p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-blue-100">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 lg:mb-2">Valuation</p>
          <h3 className="text-2xl lg:text-4xl font-black text-blue-800 tracking-tighter truncate">
            ₹{formatCurrency(products.reduce((s, p) => s + (p.rate * p.stock), 0))}
          </h3>
        </div>
      </div>

      {/* Warehouse Filter */}
      {
        viewTab === 'warehouse' && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setSelectedWarehouseId('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedWarehouseId === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
            >
              All Warehouses
            </button>
            {warehouses.map(w => (
              <button
                key={w.id}
                onClick={() => setSelectedWarehouseId(w.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedWarehouseId === w.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
              >
                {w.name}
              </button>
            ))}
          </div>
        )
      }

      {
        viewTab === 'warehouse' ? (
          <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
            {/* Table Header & Search */}
            <div className="p-4 lg:p-8 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center gap-4 bg-slate-50/30">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
                <input type="text" placeholder="Search assets..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs lg:text-sm font-medium focus:ring-4 focus:ring-blue-50 transition-all outline-none" />
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="text-[10px] lg:text-[11px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-50">
                    <th className="px-6 lg:px-8 py-5 lg:py-6">Product Details</th>
                    <th className="px-6 lg:px-8 py-5 lg:py-6 w-32">Location</th>
                    <th className="px-6 lg:px-8 py-5 lg:py-6 w-40 text-right">Price</th>
                    <th className="px-6 lg:px-8 py-5 lg:py-6 w-32">Stock</th>
                    <th className="px-6 lg:px-8 py-5 lg:py-6 text-right w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 lg:px-8 py-4 lg:py-6">
                        <p className="font-black text-slate-800 uppercase tracking-tight text-xs lg:text-sm truncate max-w-[200px] lg:max-w-none">{product.productName || product.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{product.name !== product.productName ? product.name : `HSN: ${product.hsn}`}</p>
                        {product.description && <p className="text-[8px] text-slate-300 italic mt-0.5 truncate max-w-[150px]">{product.description}</p>}
                      </td>
                      <td className="px-6 lg:px-8 py-4 lg:py-6 text-xs text-slate-500 font-black uppercase">
                        {warehouses.find(w => w.id === product.warehouseId)?.name || 'Unassigned'}
                      </td>
                      <td className="px-6 lg:px-8 py-4 lg:py-6 text-sm font-black text-slate-800 text-right">₹{formatCurrency(product.rate)}</td>
                      <td className="px-6 lg:px-8 py-4 lg:py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${product.stock < (product.alertThreshold || 10) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {product.stock} {product.unit}
                        </span>
                      </td>
                      <td className="px-6 lg:px-8 py-4 lg:py-6 text-right">
                        <div className="flex gap-2 justify-end lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setShowAdjustModal(product)} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg hover:bg-slate-200">Adjust</button>
                          <button onClick={() => deleteProduct(product.id)} className="px-3 py-1.5 bg-red-50 text-red-600 text-[10px] font-black rounded-lg hover:bg-red-100">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* History View Placeholder */
          <div className="bg-white p-8 rounded-[2.5rem] text-center text-slate-400">Stock log history view enabled.</div>
        )
      }

      {/* Warehouse Modal */}
      {
        showWarehouseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
              <h3 className="text-xl font-black text-slate-800 mb-6">Add Warehouse</h3>
              <form onSubmit={handleAddWarehouse} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500">Name</label>
                  <input type="text" value={newWarehouse.name} onChange={e => setNewWarehouse({ ...newWarehouse, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Surat Main Depot" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500">Location</label>
                  <input type="text" value={newWarehouse.location} onChange={e => setNewWarehouse({ ...newWarehouse, location: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" placeholder="City / Area" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500">Manager</label>
                  <input type="text" value={newWarehouse.manager} onChange={e => setNewWarehouse({ ...newWarehouse, manager: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" placeholder="Manager Name" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500">Phone</label>
                  <input type="text" value={newWarehouse.phone} onChange={e => setNewWarehouse({ ...newWarehouse, phone: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none" placeholder="Contact Number" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowWarehouseModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-xl shadow-indigo-200">Create Warehouse</button>
                </div>
              </form>

              {/* List Existing Warehouses */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Existing Locations</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {warehouses.map(w => (
                    <div key={w.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="font-bold text-slate-700 text-xs">{w.name}</span>
                      <button type="button" onClick={() => deleteWarehouse(w.id)} className="text-red-500 text-[10px] font-black hover:text-red-700">REMOVE</button>
                    </div>
                  ))}
                  {warehouses.length === 0 && <p className="text-xs text-slate-400 italic">No warehouses added yet.</p>}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Product Modal */}
      {
        showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <div className="bg-white w-full max-w-lg rounded-3xl lg:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
              <div className="p-6 lg:p-10 border-b border-slate-50 flex-shrink-0">
                <h3 className="text-xl lg:text-2xl font-black text-slate-800">New Asset Registration</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-6 lg:p-10 no-scrollbar">
                <form id="add-product-form" onSubmit={handleAddNewProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 flex gap-4 pb-2">
                    <label className={`flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${newProduct.type === 'GOODS' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-slate-50 border-slate-100'}`}>
                      <input type="radio" name="prodType" checked={newProduct.type === 'GOODS' || !newProduct.type} onChange={() => setNewProduct({ ...newProduct, type: 'GOODS' })} className="hidden" />
                      <span className="text-lg">📦</span>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500">Type</p>
                        <p className="text-xs font-black text-slate-800">Goods</p>
                      </div>
                    </label>
                    <label className={`flex-1 flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all ${newProduct.type === 'SERVICES' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-slate-50 border-slate-100'}`}>
                      <input type="radio" name="prodType" checked={newProduct.type === 'SERVICES'} onChange={() => setNewProduct({ ...newProduct, type: 'SERVICES' })} className="hidden" />
                      <span className="text-lg">🛠️</span>
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500">Type</p>
                        <p className="text-xs font-black text-slate-800">Services</p>
                      </div>
                    </label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Product Name (Simple)</label>
                    <input type="text" value={newProduct.productName} onChange={e => setNewProduct({ ...newProduct, productName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm" placeholder="e.g. Portland Cement" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Full Description / Goods Name</label>
                    <input type="text" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm" placeholder="e.g. Portland Cement 50kg Grade 43" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Additional Details (Optional)</label>
                    <input type="text" value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm" placeholder="e.g. Batch #45, Exp 2026" />
                  </div>

                  <div className="relative sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">{newProduct.type === 'SERVICES' ? 'SAC Code' : 'HSN Code'}</label>
                    <div className="flex gap-2">
                      <input type="text" value={newProduct.hsn} onChange={e => setNewProduct({ ...newProduct, hsn: e.target.value })} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm" placeholder={newProduct.type === 'SERVICES' ? '99xxxx' : 'xxxx'} />
                      <button type="button" onClick={handleAIHSNFetch} disabled={isFetchingHSN} className="bg-purple-50 text-purple-600 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center gap-2 border border-purple-100 shadow-sm whitespace-nowrap">
                        {isFetchingHSN ? '⏳...' : '✨ Auto'}
                      </button>
                    </div>

                    {/* AI Suggestions Table UI */}
                    {aiSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-slate-900 text-white rounded-xl shadow-2xl z-50 mt-2 overflow-hidden animate-in fade-in slide-in-from-top-2 border border-slate-700">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">✨ AI Recommendations</span>
                          <button type="button" onClick={() => setAiSuggestions([])} className="text-white hover:text-red-200">✕</button>
                        </div>

                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-white/5">
                            {aiSuggestions.map((s, idx) => (
                              <tr key={idx} onClick={() => applySuggestion(s)} className="hover:bg-white/10 cursor-pointer transition-colors group">
                                <td className="p-3">
                                  <p className="font-bold text-xs text-slate-200 group-hover:text-white line-clamp-1">{s.description}</p>
                                  <div className="flex gap-2 mt-1">
                                    <span className="text-blue-300 font-mono text-[10px]">{s.hsnCode}</span>
                                    <span className="text-emerald-300 font-black text-[10px]">{s.gstRate}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Warehouse Location</label>
                    <select value={newProduct.warehouseId || ''} onChange={e => setNewProduct({ ...newProduct, warehouseId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm">
                      <option value="">Select Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Unit</label>
                    <select value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm">
                      <option value="NOS">NOS</option><option value="PCS">PCS</option><option value="KG">KG</option><option value="SET">SET</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Rate</label>
                    <input type="number" value={newProduct.rate} onChange={e => setNewProduct({ ...newProduct, rate: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Stock</label>
                    <input type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Low Stock Alert</label>
                    <input type="number" value={newProduct.alertThreshold} onChange={e => setNewProduct({ ...newProduct, alertThreshold: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 lg:py-3 px-4 font-bold outline-none text-sm" />
                  </div>

                  <div className="sm:col-span-2 pt-4 border-t border-slate-100 mt-2">
                    <p className="text-[10px] font-black uppercase text-slate-500 mb-3">Packaging Units (Optional)</p>
                    <div className="flex flex-col sm:flex-row gap-2 mb-2 bg-slate-50 p-3 rounded-xl">
                      <div className="flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-400">Name (e.g. Box)</label>
                        <input type="text" value={newPkgUnit.unitName} onChange={e => setNewPkgUnit({ ...newPkgUnit, unitName: e.target.value })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold" />
                      </div>
                      <div className="sm:w-24">
                        <label className="text-[8px] font-black uppercase text-slate-400">Qty ({newProduct.unit || 'Base'})</label>
                        <input type="number" value={newPkgUnit.conversionFactor} onChange={e => setNewPkgUnit({ ...newPkgUnit, conversionFactor: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold" />
                      </div>
                      <button type="button" onClick={addPkgUnit} className="bg-slate-800 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider h-10 self-end w-full sm:w-auto">+ Add</button>
                    </div>
                    {/* List added units */}
                    <div className="space-y-1">
                      {newProduct.packagingUnits?.map((u, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600 bg-white border border-slate-100 px-3 py-2 rounded-lg">
                          <span>1 {u.unitName} = {u.conversionFactor} {newProduct.unit}</span>
                          <button type="button" onClick={() => removePkgUnit(idx)} className="text-red-500 hover:text-red-700">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 lg:p-10 border-t border-slate-50 flex gap-3 flex-shrink-0 bg-slate-50/10">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 lg:py-4 bg-slate-100 text-slate-600 rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                <button type="submit" form="add-product-form" className="flex-1 py-3 lg:py-4 bg-blue-600 text-white rounded-xl lg:rounded-2xl font-black shadow-xl shadow-blue-100 text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95">Register Asset</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Adjust Modal */}
      {
        showAdjustModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 lg:p-10 animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-800">Adjust Inventory</h3>
              <p className="text-slate-400 text-xs font-bold mb-4">{showAdjustModal.name}</p>
              <form onSubmit={(e) => { e.preventDefault(); adjustStock(showAdjustModal.id, adjustData.quantity, adjustData.reason); setShowAdjustModal(null); }}>
                <input type="number" placeholder="+/- Qty" className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-3 font-bold" onChange={e => setAdjustData({ ...adjustData, quantity: +e.target.value })} />
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-xs">Update</button>
                <button type="button" onClick={() => setShowAdjustModal(null)} className="w-full mt-2 text-slate-400 text-xs font-bold uppercase">Cancel</button>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Inventory;
