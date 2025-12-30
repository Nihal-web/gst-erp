import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { FirmSettings } from '../types';
import { GST_STATES } from '../constants';

const OnboardingModal: React.FC = () => {
    const { firm, setFirm, isLoaded } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState<FirmSettings>(firm);

    // Sync form data when firm settings load
    useEffect(() => {
        if (firm) {
            setFormData(firm);
            // Check if critical details are missing
            // We check for name, address, phone. 
            // Note: firm.name might be set to shopName from Auth user on init, so we check address/phone/gstin mostly 
            if (isLoaded) {
                const isMissingDetails = !firm.address || !firm.phone || !firm.gstin;
                if (isMissingDetails) {
                    setIsOpen(true);
                }
            }
        }
    }, [firm, isLoaded]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.address || !formData.phone) {
            alert("Please fill in at least the Firm Name, Address, and Phone.");
            return;
        }
        await setFirm(formData);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="bg-slate-900 text-white p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black tracking-tight mb-2">Welcome to GST MASTER! 🚀</h2>
                        <p className="text-slate-400 font-medium text-sm">Let's get your business setup in less than 60 seconds.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Firm Details */}
                        <div className="col-span-full">
                            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">Business Identity</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Firm Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        placeholder="e.g. My Awesome Shop"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        placeholder="Mobile Number"
                                    />
                                </div>
                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Address *</label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        rows={2}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                                        placeholder="Shop No, Street, City..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tax Details */}
                        <div className="col-span-full">
                            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4 mt-2">Tax & Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        name="gstin"
                                        value={formData.gstin}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                                        placeholder="GST Number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                                    <select
                                        name="state"
                                        value={formData.state}
                                        onChange={(e) => {
                                            const selected = GST_STATES.find(s => s.name === e.target.value);
                                            setFormData({
                                                ...formData,
                                                state: e.target.value,
                                                stateCode: selected ? selected.code : ''
                                            });
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    >
                                        <option value="">Select State</option>
                                        {GST_STATES.map(s => (
                                            <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Banking Details */}
                        <div className="col-span-full">
                            <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4 mt-2">Banking (Optional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name</label>
                                    <input
                                        type="text"
                                        name="bankName"
                                        value={formData.bankName}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        placeholder="Bank Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number</label>
                                    <input
                                        type="text"
                                        name="accNumber"
                                        value={formData.accNumber}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        placeholder="Account No"
                                    />
                                </div>
                                <div className="col-span-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">IFSC Code</label>
                                    <input
                                        type="text"
                                        name="ifsc"
                                        value={formData.ifsc}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                                        placeholder="IFSC Code"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest px-8 py-4 rounded-xl shadow-xl shadow-blue-200 active:scale-95 transition-all w-full md:w-auto"
                        >
                            Save & Launch 🚀
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OnboardingModal;
