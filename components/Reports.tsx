
import React from 'react';
import { useApp } from '../AppContext';
import { formatCurrency } from '../utils/helpers';
import { InvoiceType } from '../types';

const Reports: React.FC = () => {
    const { invoices } = useApp();

    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalTax = invoices.reduce((sum, inv) => sum + (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0), 0);
    const totalTaxable = invoices.reduce((sum, inv) => sum + inv.totalTaxable, 0);

    // Mock expense logic (since we don't have expenses yet)
    const estimatedExpenses = totalSales * 0.65;
    const netProfit = totalSales - estimatedExpenses;

    const gstByType = {
        [InvoiceType.GOODS]: invoices.filter(i => i.type === InvoiceType.GOODS).reduce((s, i) => s + i.totalAmount, 0),
        [InvoiceType.SERVICES]: invoices.filter(i => i.type === InvoiceType.SERVICES).reduce((s, i) => s + i.totalAmount, 0),
    };

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Financial Intelligence</h2>
                    <p className="text-slate-400 text-sm font-medium tracking-tight">Real-time profit & tax liability analysis.</p>
                </div>
                <button className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
                    Download Statement
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* P&L Card */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <h3 className="text-xl font-black text-slate-800 mb-8">Profit & Loss Statement</h3>
                    <div className="space-y-6">
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-2xl border border-green-100">
                            <div>
                                <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">Total Revenue</p>
                                <h4 className="text-2xl font-black text-slate-800">₹{formatCurrency(totalSales)}</h4>
                            </div>
                            <span className="text-2xl">💰</span>
                        </div>

                        <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                            <div>
                                <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1">Total Expenses (Est)</p>
                                <h4 className="text-2xl font-black text-slate-800">₹{formatCurrency(estimatedExpenses)}</h4>
                            </div>
                            <span className="text-2xl">📉</span>
                        </div>

                        <hr className="border-slate-100 border-dashed" />

                        <div className="flex justify-between items-center px-4">
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Net Profit</p>
                            <h4 className={`text-3xl font-black ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                ₹{formatCurrency(netProfit)}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* Tax Liability */}
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>
                    <h3 className="text-xl font-black mb-8 relative z-10">GST Liability</h3>

                    <div className="space-y-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tax Collected</p>
                            <h4 className="text-4xl font-black text-indigo-400">₹{formatCurrency(totalTax)}</h4>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium opacity-80">
                                <span>Taxable Value</span>
                                <span>₹{formatCurrency(totalTaxable)}</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-full animate-pulse"></div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Breakdown by Type</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Goods</span>
                                    <span>₹{formatCurrency(gstByType[InvoiceType.GOODS])}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold">
                                    <span>Services</span>
                                    <span>₹{formatCurrency(gstByType[InvoiceType.SERVICES])}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
