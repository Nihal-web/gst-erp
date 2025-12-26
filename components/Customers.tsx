
import React from 'react';
import { useApp } from '../AppContext';

const Customers: React.FC = () => {
  const { customers, addCustomer } = useApp();
  const [showModal, setShowModal] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({
    name: '',
    address: '',
    phone: '',
    gstin: '',
    state: 'Gujarat',
    stateCode: '24',
    country: 'India'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({ ...newCustomer, id: Math.random().toString(36).substr(2, 9) } as any);
    setShowModal(false);
    setNewCustomer({
      name: '', address: '', phone: '', gstin: '', state: 'Gujarat', stateCode: '24', country: 'India'
    });
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Client Directory</h2>
          <p className="text-slate-400 text-sm font-medium tracking-tight">B2B relationship and tax profiles.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-100 transition-all text-xs lg:text-sm whitespace-nowrap"
        >
          + Add Client
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 lg:p-12 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">New Client</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-800">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Company Name</label>
                  <input required value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Address</label>
                  <input required value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Phone</label>
                  <input required value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">GSTIN</label>
                  <input required value={newCustomer.gstin} onChange={e => setNewCustomer({ ...newCustomer, gstin: e.target.value })} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl mt-6">Register Client</button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  🏢
                </div>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-50 px-3 py-1 rounded-full">Active</span>
              </div>
              <h3 className="text-lg lg:text-xl font-black text-slate-800 mb-2 truncate">{customer.name}</h3>
              <div className="space-y-3 text-[11px] lg:text-xs font-bold text-slate-400 leading-relaxed">
                <p className="line-clamp-2 min-h-[32px]">📍 {customer.address}</p>
                <p>📞 {customer.phone}</p>
                <p>📄 <span className="text-slate-800 tracking-wider font-black">{customer.gstin}</span></p>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-50 flex gap-2">
              <button className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors text-[10px] font-black uppercase">Edit</button>
              <button className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors text-[10px] font-black uppercase">History</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Customers;
