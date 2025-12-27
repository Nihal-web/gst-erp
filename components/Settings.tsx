
import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { FirmSettings } from '../types';

const Settings: React.FC = () => {
  const { firm, setFirm, showAlert, invoices } = useApp();
  const [formData, setFormData] = useState<FirmSettings>(firm);

  useEffect(() => {
    setFormData(firm);
  }, [firm]);

  const handleChange = (field: keyof FirmSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setFirm(formData);
  };

  const handleExport = (type: string) => {
    showAlert(`Compiling ${type} Archive...`, 'info');

    // Generate CSV Content
    let csvContent = "data:text/csv;charset=utf-8,";

    if (type === 'GSTR-1') {
      csvContent += "Invoice No,Date,Customer Name,GSTIN,Taxable Value,IGST,CGST,SGST,Total Amount\n";
      invoices.forEach(inv => {
        const row = [
          inv.invoiceNo,
          inv.date,
          inv.customer.name,
          inv.customer.gstin,
          inv.totalTaxable,
          inv.igst || 0,
          inv.cgst || 0,
          inv.sgst || 0,
          inv.totalAmount
        ].join(",");
        csvContent += row + "\n";
      });
    } else if (type === 'GSTR-3B') {
      csvContent += "Section,Total Taxable,Total IGST,Total CGST,Total SGST\n";
      const totalTaxable = invoices.reduce((s, i) => s + i.totalTaxable, 0);
      const totalIGST = invoices.reduce((s, i) => s + (i.igst || 0), 0);
      const totalCGST = invoices.reduce((s, i) => s + (i.cgst || 0), 0);
      const totalSGST = invoices.reduce((s, i) => s + (i.sgst || 0), 0);

      csvContent += `Outward Supplies,${totalTaxable},${totalIGST},${totalCGST},${totalSGST}\n`;
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
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Firm Console</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight">Identity, banking, and tax config.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
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
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">State Code</label>
                <input
                  type="text"
                  value={formData.stateCode}
                  onChange={(e) => handleChange('stateCode', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-3 px-4 font-bold text-slate-800 text-sm"
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
                className="sm:col-span-2 mt-2 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:shadow-2xl active:scale-[0.98] transition-all text-xs lg:text-sm uppercase"
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
