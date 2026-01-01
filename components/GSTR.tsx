import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useApp } from '../AppContext';
import { fetchGSTRReturns, generateGSTR1, generateGSTR3B, fetchGSTR1Details, fetchGSTR3BDetails } from '../services/apiService';
import { formatCurrency } from '../utils/helpers';

interface GSTRReturn {
    id: string;
    tenantId: string;
    returnPeriod: string;
    status: 'draft' | 'filed' | 'amended';
    totalInvoiceCount?: number;
    totalTaxableValue?: number;
    totalIgst?: number;
    totalCgst?: number;
    totalSgst?: number;
    financialYear?: string;
    filedDate?: string;
    createdAt: string;
    updatedAt: string;
}

const GSTR: React.FC = () => {
    const { showAlert } = useApp();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'returns' | 'generate'>('returns');
    const [gstr1Returns, setGstr1Returns] = useState<GSTRReturn[]>([]);
    const [gstr3bReturns, setGstr3bReturns] = useState<GSTRReturn[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<any>(null);
    const [returnDetails, setReturnDetails] = useState<any>(null);

    // Generate form state
    const [returnPeriod, setReturnPeriod] = useState('');
    const [generateType, setGenerateType] = useState<'gstr1' | 'gstr3b'>('gstr1');

    useEffect(() => {
        loadGSTRReturns();
    }, []);

    const loadGSTRReturns = async () => {
        try {
            setLoading(true);
            const data = await fetchGSTRReturns();
            setGstr1Returns(data.gstr1 || []);
            setGstr3bReturns(data.gstr3b || []);
        } catch (error) {
            console.error('Error loading GSTR returns:', error);
            showAlert('Failed to load GSTR returns', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!returnPeriod || !/^\d{6}$/.test(returnPeriod)) {
            showAlert('Please enter a valid return period (YYYYMM)', 'error');
            return;
        }

        try {
            setLoading(true);
            if (generateType === 'gstr1') {
                await generateGSTR1(returnPeriod);
                showAlert('GSTR-1 generated successfully!', 'success');
            } else {
                await generateGSTR3B(returnPeriod);
                showAlert('GSTR-3B generated successfully!', 'success');
            }
            await loadGSTRReturns();
            setReturnPeriod('');
        } catch (error: any) {
            console.error('Error generating return:', error);
            showAlert(error.message || 'Failed to generate return', 'error');
        } finally {
            setLoading(false);
        }
    };

    const viewReturnDetails = async (returnType: 'gstr1' | 'gstr3b', returnPeriod: string) => {
        try {
            setLoading(true);
            let details;
            if (returnType === 'gstr1') {
                details = await fetchGSTR1Details(returnPeriod);
            } else {
                details = await fetchGSTR3BDetails(returnPeriod);
            }
            setSelectedReturn({ type: returnType, period: returnPeriod });
            setReturnDetails(details);
        } catch (error) {
            console.error('Error loading return details:', error);
            showAlert('Failed to load return details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatReturnPeriod = (period: string) => {
        const year = period.substring(0, 4);
        const month = period.substring(4, 6);
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'filed': return 'text-green-600 bg-green-50';
            case 'amended': return 'text-orange-600 bg-orange-50';
            default: return 'text-blue-600 bg-blue-50';
        }
    };

    if (selectedReturn && returnDetails) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">
                            {selectedReturn.type.toUpperCase()} - {formatReturnPeriod(selectedReturn.period)}
                        </h2>
                        <p className="text-slate-400 text-sm">Return Period: {selectedReturn.period}</p>
                    </div>
                    <button
                        onClick={() => { setSelectedReturn(null); setReturnDetails(null); }}
                        className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-200 font-bold"
                    >
                        ← Back to Returns
                    </button>
                </div>

                {/* Return Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                        <p className={`text-sm font-black ${getStatusColor(returnDetails.return.status)} px-2 py-1 rounded inline-block mt-1`}>
                            {returnDetails.return.status.toUpperCase()}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total Taxable</p>
                        <p className="text-lg font-black text-slate-800">₹{formatCurrency(returnDetails.return.total_taxable_value || 0)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total IGST</p>
                        <p className="text-lg font-black text-slate-800">₹{formatCurrency(returnDetails.return.total_igst || 0)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-bold">Total CGST+SGST</p>
                        <p className="text-lg font-black text-slate-800">₹{formatCurrency((returnDetails.return.total_cgst || 0) + (returnDetails.return.total_sgst || 0))}</p>
                    </div>
                </div>

                {/* Section Details */}
                <div className="space-y-4">
                    {selectedReturn.type === 'gstr1' ? (
                        <>
                            {returnDetails.sections.b2b?.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-black text-slate-800">B2B Invoices (Section 4A/4B/4C)</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Invoice</th>
                                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Customer GSTIN</th>
                                                    <th className="px-4 py-3 text-left font-bold text-slate-600">POS</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">Taxable</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">IGST</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">CGST</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">SGST</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {returnDetails.sections.b2b.map((item: any, index: number) => (
                                                    <tr key={index} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold">{item.invoice_number}</td>
                                                        <td className="px-4 py-3">{item.customer_gstin}</td>
                                                        <td className="px-4 py-3">{item.place_of_supply}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.taxable_value)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.igst_amount)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.cgst_amount)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.sgst_amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {returnDetails.sections.b2cs?.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-black text-slate-800">B2C Small (Section 7)</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Place of Supply</th>
                                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Rate</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">Taxable</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">IGST</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">CGST</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">SGST</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {returnDetails.sections.b2cs.map((item: any, index: number) => (
                                                    <tr key={index} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold">{item.place_of_supply}</td>
                                                        <td className="px-4 py-3">{item.applicable_tax_rate}%</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.taxable_value)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.igst_amount)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.cgst_amount)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.sgst_amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {returnDetails.sections['3_1_a']?.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                                        <h3 className="font-black text-slate-800">Outward Taxable Supplies (3.1(a))</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold text-slate-600">Place of Supply</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">Taxable</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">IGST</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">CGST</th>
                                                    <th className="px-4 py-3 text-right font-bold text-slate-600">SGST</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {returnDetails.sections['3_1_a'].map((item: any, index: number) => (
                                                    <tr key={index} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold">{item.place_of_supply || 'EXPORT'}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.taxable_value)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.igst_amount)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.cgst_amount)}</td>
                                                        <td className="px-4 py-3 text-right">₹{formatCurrency(item.sgst_amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 no-print">
                <div>
                    <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">GST Returns</h2>
                    <p className="text-slate-400 text-sm font-medium">GSTR-1 & GSTR-3B Management</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
                    <button
                        onClick={() => setActiveTab('returns')}
                        className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all ${activeTab === 'returns' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}
                    >
                        View Returns
                    </button>
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all ${activeTab === 'generate' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}
                    >
                        Generate New
                    </button>
                </div>
            </div>

            {activeTab === 'generate' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200">
                        <h3 className="text-lg font-black text-slate-800 mb-4">Generate GST Return</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Return Type</label>
                                <select
                                    value={generateType}
                                    onChange={(e) => setGenerateType(e.target.value as 'gstr1' | 'gstr3b')}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold"
                                >
                                    <option value="gstr1">GSTR-1 (Sales Return)</option>
                                    <option value="gstr3b">GSTR-3B (Summary Return)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Return Period (YYYYMM)</label>
                                <input
                                    type="text"
                                    value={returnPeriod}
                                    onChange={(e) => setReturnPeriod(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                    placeholder="e.g. 202412"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading || !returnPeriod}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Generating...' : `Generate ${generateType.toUpperCase()}`}
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h3 className="text-lg font-black text-slate-800 mb-4">Instructions</h3>
                        <div className="space-y-3 text-sm text-slate-600">
                            <div>
                                <h4 className="font-bold text-slate-800">GSTR-1:</h4>
                                <p>Auto-generates from your invoices. Contains detailed sales data by customer type and location.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">GSTR-3B:</h4>
                                <p>Summary return derived from GSTR-1. Contains aggregated tax liability and ITC claims.</p>
                            </div>
                            <div className="pt-2 border-t border-slate-300">
                                <p className="text-xs font-bold text-slate-500">💡 Generate GSTR-1 first, then GSTR-3B for the same period.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* GSTR-1 Returns */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-black text-slate-800 text-lg">GSTR-1 Returns</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead>
                                    <tr className="text-[10px] lg:text-[11px] text-slate-500 uppercase font-black tracking-widest bg-slate-50/30">
                                        <th className="px-6 lg:px-8 py-5">Period</th>
                                        <th className="px-6 lg:px-8 py-5">Status</th>
                                        <th className="px-6 lg:px-8 py-5 text-right">Invoices</th>
                                        <th className="px-6 lg:px-8 py-5 text-right">Taxable Value</th>
                                        <th className="px-6 lg:px-8 py-5 text-right">Total Tax</th>
                                        <th className="px-6 lg:px-8 py-5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold">
                                    {gstr1Returns.length > 0 ? gstr1Returns.map(ret => (
                                        <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 lg:px-8 py-4 text-blue-600 text-sm">{formatReturnPeriod(ret.returnPeriod)}</td>
                                            <td className="px-6 lg:px-8 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-black ${getStatusColor(ret.status)}`}>
                                                    {ret.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 lg:px-8 py-4 text-right text-slate-800 text-sm">{ret.totalInvoiceCount || 0}</td>
                                            <td className="px-6 lg:px-8 py-4 text-right text-slate-800 text-sm">₹{formatCurrency(ret.totalTaxableValue || 0)}</td>
                                            <td className="px-6 lg:px-8 py-4 text-right text-slate-800 text-sm">
                                                ₹{formatCurrency((ret.totalIgst || 0) + (ret.totalCgst || 0) + (ret.totalSgst || 0))}
                                            </td>
                                            <td className="px-6 lg:px-8 py-4 text-center">
                                                <button
                                                    onClick={() => viewReturnDetails('gstr1', ret.returnPeriod)}
                                                    className="text-blue-600 hover:underline text-xs"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">No GSTR-1 returns found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* GSTR-3B Returns */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-black text-slate-800 text-lg">GSTR-3B Returns</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead>
                                    <tr className="text-[10px] lg:text-[11px] text-slate-500 uppercase font-black tracking-widest bg-slate-50/30">
                                        <th className="px-6 lg:px-8 py-5">Period</th>
                                        <th className="px-6 lg:px-8 py-5">Financial Year</th>
                                        <th className="px-6 lg:px-8 py-5">Status</th>
                                        <th className="px-6 lg:px-8 py-5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-bold">
                                    {gstr3bReturns.length > 0 ? gstr3bReturns.map(ret => (
                                        <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 lg:px-8 py-4 text-blue-600 text-sm">{formatReturnPeriod(ret.returnPeriod)}</td>
                                            <td className="px-6 lg:px-8 py-4 text-slate-500 text-sm">{ret.financialYear}</td>
                                            <td className="px-6 lg:px-8 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-black ${getStatusColor(ret.status)}`}>
                                                    {ret.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 lg:px-8 py-4 text-center">
                                                <button
                                                    onClick={() => viewReturnDetails('gstr3b', ret.returnPeriod)}
                                                    className="text-blue-600 hover:underline text-xs"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">No GSTR-3B returns found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GSTR;