
import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { FirmSettings } from '../types';
import { useAuth } from '../AuthContext';
import { GST_STATES } from '../constants';

const Settings: React.FC = () => {
  const { firm, setFirm, showAlert, invoices, updateUserProfile, isLoaded } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'firm' | 'profile'>('firm');

  // Firm Form Data
  const [formData, setFormData] = useState<FirmSettings>(firm);

  // Profile Form Data
  const [profileData, setProfileData] = useState({ name: '', shopName: '' });

  useEffect(() => {
    if (isLoaded) {
      setFormData(firm);
    }
  }, [firm, isLoaded]);

  useEffect(() => {
    if (user) {
      setProfileData({ name: user.name, shopName: user.shopName });
    }
  }, [user]);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Syncing Shop Config...</p>
      </div>
    );
  }

  const handleChange = (field: keyof FirmSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setFirm(formData);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name || !profileData.shopName) {
      showAlert("Name and Shop Name are required", "error");
      return;
    }
    await updateUserProfile(profileData.name, profileData.shopName);
  };

  const handleExport = (type: string) => {
    showAlert(`Compiling ${type} Archive...`, 'info');

    // Generate CSV Content
    let csvContent = "data:text/csv;charset=utf-8,";

    if (type === 'GSTR-1') {
      // Standard GSTR-1 Columns
      csvContent += "GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice Date,Invoice Value,Place Of Supply,Reverse Charge,Applicable % of Tax Rate,Invoice Type,E-Commerce GSTIN,Rate,Taxable Value,Cess Amount\n";

      invoices.forEach(inv => {
        // We need to iterate items to get accurate rate-wise breakdown if needed, 
        // but for now we'll do a simplified row per invoice as per basic request, 
        // OR better: Aggregate by Tax Rate per Invoice.

        // Group items by GST Rate
        const rateGroups: { [key: number]: number } = {};
        inv.items.forEach(item => {
          rateGroups[item.gstPercent] = (rateGroups[item.gstPercent] || 0) + item.taxableValue;
        });

        Object.keys(rateGroups).forEach(rate => {
          const taxable = rateGroups[Number(rate)];
          const row = [
            inv.customer.gstin || '',
            inv.customer.name,
            inv.invoiceNo,
            inv.date, // Format DD-MMM-YYYY usually required, but keeping string for now
            inv.totalAmount,
            `${inv.customer.stateCode}-${inv.customer.state}`,
            inv.isReverseCharge ? 'Y' : 'N',
            '', // Applicable % (legacy)
            'Regular', // Invoice Type (Regular, SEZ, etc.)
            '', // E-com GSTIN
            rate,
            taxable,
            0 // Cess
          ].join(",");
          csvContent += row + "\n";
        });
      });

    } else if (type === 'GSTR-3B') {
      // GSTR-3B 3.1 Format
      csvContent += "Nature of Supplies,Total Taxable Value,Integrated Tax,Central Tax,State/UT Tax,Cess\n";

      const totalTaxable = invoices.reduce((s, i) => s + i.totalTaxable, 0);
      const totalIGST = invoices.reduce((s, i) => s + (i.igst || 0), 0);
      const totalCGST = invoices.reduce((s, i) => s + (i.cgst || 0), 0);
      const totalSGST = invoices.reduce((s, i) => s + (i.sgst || 0), 0);

      // (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
      csvContent += `(a) Outward taxable supplies (other than zero rated nil rated and exempted),${totalTaxable},${totalIGST},${totalCGST},${totalSGST},0\n`;
      // (b) Outward taxable supplies (zero rated)
      csvContent += `(b) Outward taxable supplies (zero rated),0,0,0,0,0\n`;
      // (c) Other outward supplies (Nil rated exempted)
      csvContent += `(c) Other outward supplies (Nil rated exempted),0,0,0,0,0\n`;
      // (d) Inward supplies (liable to reverse charge)
      csvContent += `(d) Inward supplies (liable to reverse charge),0,0,0,0,0\n`;
      // (e) Non-GST outward supplies
      csvContent += `(e) Non-GST outward supplies,0,0,0,0,0\n`;
    }

    // Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      showAlert(`${type} Excel downloaded.`, 'success');
    }, 1500);
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Settings & Config</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight">Manage your firm and personal profile.</p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('firm')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'firm' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Firm Console
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'profile' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            My Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="lg:col-span-2 space-y-6 lg:space-y-8 animate-in fade-in zoom-in-95">
            <div className="bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-200">
              <h3 className="text-lg lg:text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                <span className="text-purple-500">👤</span> User Profile
              </h3>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-black">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Logged in as</p>
                    <p className="text-lg font-bold text-slate-800">{user?.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded">{user?.role}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[9px] font-black uppercase rounded">{user?.plan} Plan</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Display Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Shop Identifier Name</label>
                    <input
                      type="text"
                      value={profileData.shopName}
                      onChange={(e) => setProfileData({ ...profileData, shopName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-xl shadow-purple-200 hover:shadow-2xl active:scale-[0.98] transition-all text-xs lg:text-sm uppercase"
                >
                  Update My Profile
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Firm Tab Content - Wrap existing div */}
        <div className={`lg:col-span-2 space-y-6 lg:space-y-8 ${activeTab === 'firm' ? 'block animate-in fade-in zoom-in-95' : 'hidden'}`}>
          <div className="bg-white p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-200">
            <h3 className="text-lg lg:text-xl font-black text-slate-800 mb-6 lg:mb-8 flex items-center gap-3">
              <span className="text-blue-500">🏢</span> Business Identity
            </h3>
            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Legal Firm Entity Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Primary State</label>
                <select
                  value={formData.state}
                  onChange={(e) => {
                    const selectedState = e.target.value;
                    const stateObj = GST_STATES.find(s => s.name === selectedState);
                    setFormData(prev => ({
                      ...prev,
                      state: selectedState,
                      stateCode: stateObj ? stateObj.code : prev.stateCode
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select State</option>
                  {GST_STATES.map(s => (
                    <option key={s.code} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">State Code</label>
                <input
                  type="text"
                  value={formData.stateCode}
                  onChange={(e) => handleChange('stateCode', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm"
                  readOnly
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Corporate Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Firm GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm uppercase"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Firm PAN</label>
                <input
                  type="text"
                  value={formData.pan}
                  onChange={(e) => handleChange('pan', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm uppercase"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Contact Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Contact Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Registered Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 resize-none outline-none shadow-sm text-xs"
                ></textarea>
              </div>

              <div className="sm:col-span-2 pt-4">
                <h3 className="text-lg lg:text-xl font-black text-slate-800 mb-6 lg:mb-8 flex items-center gap-3">
                  <span className="text-indigo-500">🏦</span> Settlement Config
                </h3>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifsc}
                  onChange={(e) => handleChange('ifsc', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 outline-none text-sm uppercase"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Account No.</label>
                <input
                  type="text"
                  value={formData.accNumber}
                  onChange={(e) => handleChange('accNumber', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">UPI VPA</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => handleChange('upiId', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm"
                />
              </div>

              <div className="sm:col-span-2 pt-4">
                <h3 className="text-lg lg:text-xl font-black text-slate-800 mb-6 lg:mb-8 flex items-center gap-3">
                  <span className="text-teal-500">📜</span> Default Declarations
                </h3>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Terms & Conditions (One per line)</label>
                <textarea
                  rows={4}
                  value={Array.isArray(formData.terms) ? formData.terms.join('\n') : formData.terms}
                  onChange={(e) => handleChange('terms', e.target.value.split('\n'))}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 resize-none outline-none shadow-sm text-xs"
                  placeholder="e.g. Sales are final&#10;Payment due in 30 days"
                ></textarea>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Legal Declaration (Footer)</label>
                <textarea
                  rows={2}
                  value={formData.declaration}
                  onChange={(e) => handleChange('declaration', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 resize-none outline-none shadow-sm text-xs"
                ></textarea>
              </div>

              <button
                type="submit"
                className="sm:col-span-2 mt-4 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:shadow-2xl active:scale-[0.98] transition-all text-xs lg:text-sm uppercase"
              >
                Save Profile Sync
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6 lg:space-y-8">
          <div className="bg-indigo-600 p-8 lg:p-10 rounded-3xl lg:rounded-[2.5rem] shadow-2xl text-white">
            <h3 className="text-lg lg:text-xl font-black mb-4">Tax Exports</h3>
            <p className="text-indigo-100 text-[11px] lg:text-sm font-medium mb-8 leading-relaxed opacity-80">Download compliant records for GSTR filing portals.</p>
            <div className="space-y-3">
              <button
                onClick={() => handleExport('GSTR-1')}
                className="w-full py-3 lg:py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-black text-xs transition-all text-left px-5 lg:px-6 flex justify-between items-center"
              >
                GSTR-1 <span>⬇️</span>
              </button>
              <button
                onClick={() => handleExport('GSTR-3B')}
                className="w-full py-3 lg:py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-black text-xs transition-all text-left px-5 lg:px-6 flex justify-between items-center"
              >
                GSTR-3B <span>⬇️</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-200">
            <h4 className="text-[10px] font-black text-slate-800 mb-2 uppercase tracking-widest">Platform Status</h4>
            <p className="text-[10px] font-bold text-slate-400">Registry: SECURE | Node: ACTIVE</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
