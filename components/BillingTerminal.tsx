import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Customer, Product, InvoiceItem, Invoice, InvoiceType } from '../types';
import InvoiceView from './InvoiceView';
import { formatCurrency } from '../utils/helpers';
import { fetchHSNDetails } from '../services/geminiService';
import { useApp } from '../AppContext';

const BillingTerminal: React.FC = () => {
  const { products, customers, addInvoice, firm, showAlert, invoices } = useApp();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(null);
  const [isFetchingHSN, setIsFetchingHSN] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'history'>('editor');
  const [isPrinting, setIsPrinting] = useState(false);

  // Invoice Meta
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.GOODS);
  const [isReverseCharge, setIsReverseCharge] = useState(false);
  const [exportType, setExportType] = useState<'WITH_PAYMENT' | 'WITHOUT_PAYMENT'>('WITHOUT_PAYMENT');
  const [shippingBill, setShippingBill] = useState('');
  const [shippingDate, setShippingDate] = useState('');


  const addItem = () => {
    setItems([...items, {
      productId: '',
      productName: '',
      hsn: '',
      sac: '',
      qty: 1,
      rate: 0,
      unit: invoiceType === InvoiceType.SERVICES ? 'HRS' : 'NOS',
      taxableValue: 0,
      gstPercent: 18
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const resetTerminal = () => {
    setItems([]);
    setSelectedCustomer(null);
    setInvoiceType(InvoiceType.GOODS);
    setIsReverseCharge(false);
    setExportType('WITHOUT_PAYMENT');
    setShippingBill('');
    setShippingDate('');
    showAlert("Billing table cleared.", "info");
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'qty' || field === 'rate') {
      const q = parseFloat(field === 'qty' ? value : item.qty) || 0;
      const r = parseFloat(field === 'rate' ? value : item.rate) || 0;
      item.taxableValue = q * r;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleHSNMagicFetch = async (index: number) => {
    const query = items[index].productName;
    if (!query || query.length < 3) {
      showAlert("Enter description for HSN/SAC fetch.", "error");
      return;
    }

    setIsFetchingHSN(index);
    try {
      const results = await fetchHSNDetails(query, invoiceType);
      if (results && results.length > 0) {
        const best = results[0];
        const rateMatch = best.gstRate.match(/(\d+(\.\d+)?)/);
        const rate = rateMatch ? parseFloat(rateMatch[0]) : 0;

        if (invoiceType === InvoiceType.SERVICES) {
          updateItem(index, 'sac', best.hsnCode);
        } else {
          updateItem(index, 'hsn', best.hsnCode);
        }
        updateItem(index, 'gstPercent', rate);
        showAlert(`AI detected ${best.hsnCode} — ${rate}% GST`, "success");
      } else {
        showAlert("No matching code found.", "error");
      }
    } finally {
      setIsFetchingHSN(null);
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;

    if (p.stock <= 0 && invoiceType !== InvoiceType.SERVICES) {
      showAlert(`Low Stock warning: ${p.name}`, "info");
    }

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: p.id,
      productName: p.name,
      hsn: p.hsn,
      sac: p.sac || '',
      rate: p.rate,
      unit: p.unit,
      gstPercent: p.gstPercent,
      taxableValue: newItems[index].qty * p.rate,
      conversionFactor: undefined // Reset to base unit
    };
    setItems(newItems);
  };

  const handleUnitChange = (index: number, unitName: string) => {
    const item = items[index];
    const product = products.find(p => p.id === item.productId);
    if (!product) return;

    let newRate = product.rate;
    let newFactor: number | undefined = undefined;

    if (unitName !== product.unit) {
      // Find packaging unit
      const pkgUnit = product.packagingUnits?.find(u => u.unitName === unitName);
      if (pkgUnit) {
        newRate = product.rate * pkgUnit.conversionFactor;
        newFactor = pkgUnit.conversionFactor;
      }
    }

    const newItems = [...items];
    newItems[index] = {
      ...item,
      unit: unitName,
      rate: newRate,
      conversionFactor: newFactor,
      taxableValue: item.qty * newRate
    };
    setItems(newItems);
  };

  const generateInvoice = () => {
    if (!selectedCustomer) {
      showAlert("Customer selection is required.", "error");
      return;
    }
    if (items.length === 0 || items.some(i => !i.productName || i.taxableValue < 0)) {
      showAlert("Add valid line items to generate invoice.", "error");
      return;
    }

    const totalTaxable = items.reduce((sum, item) => sum + item.taxableValue, 0);
    const isInterState = selectedCustomer.stateCode !== firm.gstin.substring(0, 2) || invoiceType === InvoiceType.EXPORT;

    let igst = 0, cgst = 0, sgst = 0;
    const totalGst = items.reduce((sum, item) => sum + (item.taxableValue * (item.gstPercent / 100)), 0);

    if (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT') {
      // No tax
    } else if (isInterState) {
      igst = totalGst;
    } else {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    }

    const totalAmount = totalTaxable + (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT' ? 0 : totalGst);

    const currentYear = new Date().getFullYear();
    const typePrefix = invoiceType.charAt(0).toUpperCase();
    const sameTypeInvoices = invoices.filter(inv => inv.type === invoiceType);
    const nextSeq = (sameTypeInvoices.length + 1).toString().padStart(4, '0');
    const generatedInvoiceNo = `${typePrefix}-INV-${currentYear}-${nextSeq}`;

    const invoice: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      type: invoiceType,
      invoiceNo: generatedInvoiceNo,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
      customer: selectedCustomer,
      items: items,
      totalTaxable,
      igst: igst || undefined,
      cgst: cgst || undefined,
      sgst: sgst || undefined,
      totalAmount,
      isPaid: false,
      isReverseCharge: isReverseCharge,
      exportType: invoiceType === InvoiceType.EXPORT ? exportType : undefined,
      shippingBillNo: invoiceType === InvoiceType.EXPORT ? shippingBill : undefined,
      shippingBillDate: invoiceType === InvoiceType.EXPORT ? shippingDate : undefined,
    };

    addInvoice(invoice);
    setInvoiceData(invoice);
    setShowInvoice(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const handlePrint = async () => {
    setIsPrinting(true);
    const invoiceElement = document.querySelector('.invoice-container') as HTMLElement;

    if (!invoiceElement) {
      showAlert("Could not find invoice to generate PDF.", "error");
      setIsPrinting(false);
      return;
    }

    try {
      showAlert("Generating high-quality PDF...", "info");

      // Wait a moment for UI to stabilize (optional)
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(invoiceElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Auto-download (works on mobile too)
      pdf.save(`${invoiceData?.invoiceNo || 'invoice'}.pdf`);

      showAlert("Invoice PDF downloaded.", "success");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      showAlert("Failed to generate PDF.", "error");
    } finally {
      setIsPrinting(false);
    }
  };

  if (showInvoice && invoiceData) {
    return (
      <div className="space-y-4 lg:space-y-6 print:space-y-0 print:m-0">
        <div className="flex flex-col sm:flex-row justify-between items-center no-print bg-white p-4 lg:p-6 rounded-3xl border border-slate-100 shadow-sm gap-4">
          <button
            onClick={() => setShowInvoice(false)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-50 font-bold shadow-sm transition-all"
          >
            ← Back
          </button>
          <div className="w-full sm:w-auto flex gap-4">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 ${isPrinting ? 'opacity-50' : ''}`}
            >
              {isPrinting ? '⏳ Processing' : '🖨️ Download PDF'}
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto no-scrollbar py-4 lg:py-0 flex justify-center">
          <div className="invoice-container origin-top scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-100 min-w-max rounded-xl shadow-2xl bg-white border border-slate-200 print:shadow-none print:border-none print:rounded-none print:scale-100 print:origin-top-left print:block">
            <InvoiceView invoice={invoiceData} firm={firm} />
          </div>
        </div>
      </div>
    );
  }

  const totalPayable = items.reduce((sum, item) => sum + (item.taxableValue * (1 + (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT' ? 0 : item.gstPercent / 100))), 0);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 no-print">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">Invoice Center</h2>
          <p className="text-slate-400 text-sm font-medium">GST Ready Billing & Stock Management.</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}
          >
            Create Bill
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all ${viewMode === 'history' ? 'bg-white shadow-md text-blue-600' : 'text-slate-400'}`}
          >
            History
          </button>
        </div>
      </div>

      {viewMode === 'history' ? (
        <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden no-print">
          <div className="p-6 lg:p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-sm lg:text-base">Sequential Bill Archive</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="text-[10px] lg:text-[11px] text-slate-500 uppercase font-black tracking-widest bg-slate-50/30">
                  <th className="px-6 lg:px-8 py-5">Invoice #</th>
                  <th className="px-6 lg:px-8 py-5">Date</th>
                  <th className="px-6 lg:px-8 py-5">Customer</th>
                  <th className="px-6 lg:px-8 py-5 text-right">Value</th>
                  <th className="px-6 lg:px-8 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {invoices.length > 0 ? invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 lg:px-8 py-4 text-blue-600 text-sm">{inv.invoiceNo}</td>
                    <td className="px-6 lg:px-8 py-4 text-slate-500 text-sm">{inv.date}</td>
                    <td className="px-6 lg:px-8 py-4 text-slate-800 text-sm truncate max-w-[200px]">{inv.customer.name}</td>
                    <td className="px-6 lg:px-8 py-4 text-right text-slate-800 text-sm">₹{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-6 lg:px-8 py-4 text-right">
                      <button
                        onClick={() => { setInvoiceData(inv); setShowInvoice(true); }}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Open Bill
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 italic">No historical records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Format</label>
              <select
                value={invoiceType}
                onChange={(e) => {
                  setInvoiceType(e.target.value as InvoiceType);
                  setItems([]);
                }}
                className="w-full bg-slate-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-slate-800"
              >
                <option value={InvoiceType.GOODS}>Goods Invoice</option>
                <option value={InvoiceType.SERVICES}>Services Invoice</option>
                <option value={InvoiceType.EXPORT}>Export Bill</option>
              </select>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={isReverseCharge}
                  onChange={(e) => setIsReverseCharge(e.target.checked)}
                  className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-black text-slate-700 group-hover:text-blue-600 transition-colors">Reverse Charge</span>
              </label>
            </div>

            {invoiceType === InvoiceType.EXPORT && (
              <>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Export Mode</label>
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value as any)}
                    className="w-full bg-slate-50 border-none rounded-xl py-3 px-3 text-sm font-bold text-slate-800"
                  >
                    <option value="WITHOUT_PAYMENT">LUT (No Tax)</option>
                    <option value="WITH_PAYMENT">IGST Paid</option>
                  </select>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">SB No.</label>
                    <input
                      type="text"
                      value={shippingBill}
                      onChange={(e) => setShippingBill(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-lg py-2 px-2 text-[10px] font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Date</label>
                    <input
                      type="date"
                      value={shippingDate}
                      onChange={(e) => setShippingDate(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-lg py-2 px-2 text-[10px] font-bold"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 no-print">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8 no-print">
              <div className="md:col-span-2 bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Select Customer</h3>
                </div>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 lg:py-4 px-4 lg:px-5 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-blue-100 transition-all outline-none shadow-sm cursor-pointer"
                  onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                  value={selectedCustomer?.id || ''}
                >
                  <option value="">Search customer directory...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.gstin}</option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-4 p-4 lg:p-6 bg-slate-50/50 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-100 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Tax Identity</p>
                      <p className="font-bold text-slate-800 text-xs truncate">{selectedCustomer.gstin}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Location</p>
                      <p className="font-bold text-slate-800 text-xs">{selectedCustomer.state} ({selectedCustomer.stateCode})</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-white to-slate-50">
                <div>
                  <h3 className="text-lg font-black text-slate-800 mb-4 tracking-tight">Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal</span>
                      <span className="text-sm font-black text-slate-800 truncate">₹{formatCurrency(items.reduce((sum, item) => sum + item.taxableValue, 0))}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Sum</span>
                      <span className="text-sm font-black text-slate-800 truncate">
                        ₹{formatCurrency(items.reduce((sum, item) => sum + (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT' ? 0 : (item.taxableValue * (item.gstPercent / 100))), 0))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-200 mt-4">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1 tracking-widest">Total Payable</p>
                  <span className="font-black text-blue-600 tracking-tighter block truncate text-2xl lg:text-3xl">
                    ₹{formatCurrency(totalPayable)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl lg:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden no-print">
            <div className="p-6 lg:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 gap-4">
              <h3 className="font-black text-slate-800 text-sm">Draft Table</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={resetTerminal}
                  className="flex-1 sm:flex-none bg-white border border-slate-300 text-slate-700 font-bold text-[10px] px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Reset
                </button>
                <button
                  onClick={addItem}
                  className="flex-1 sm:flex-none bg-blue-600 text-white font-bold text-[10px] px-6 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                >
                  + Add Item
                </button>
              </div>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase font-black tracking-widest bg-slate-50/30">
                    <th className="px-6 py-4 w-12 text-center">#</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 w-28 text-center">HSN/SAC</th>
                    <th className="px-6 py-4 w-24 text-center">Qty</th>
                    <th className="px-6 py-4 w-32 text-right">Rate</th>
                    <th className="px-6 py-4 w-40 text-right">Net</th>
                    <th className="px-6 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={index} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-black text-slate-400 text-center">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold text-slate-800 shadow-sm"
                          >
                            <option value="">Warehouse Select...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Manual description..."
                            value={item.productName}
                            onChange={(e) => updateItem(index, 'productName', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-[10px] font-bold text-slate-800 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-center">
                          <input
                            type="text"
                            value={invoiceType === InvoiceType.SERVICES ? item.sac : item.hsn}
                            onChange={(e) => updateItem(index, invoiceType === InvoiceType.SERVICES ? 'sac' : 'hsn', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-[10px] font-black text-slate-600 text-center outline-none"
                            placeholder={invoiceType === InvoiceType.SERVICES ? 'SAC' : 'HSN'}
                          />
                          <button
                            onClick={() => handleHSNMagicFetch(index)}
                            disabled={isFetchingHSN === index}
                            className="text-[8px] font-black text-blue-600 hover:text-blue-800 uppercase"
                          >
                            {isFetchingHSN === index ? '⌛ Finding' : '✨ AI'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateItem(index, 'qty', e.target.value)}
                            className="w-16 bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-xs font-black text-slate-800 text-center outline-none"
                          />
                          {/* Unit Selector */}
                          {products.find(p => p.id === item.productId)?.packagingUnits?.length ? (
                            <select
                              value={item.unit}
                              onChange={(e) => handleUnitChange(index, e.target.value)}
                              className="w-20 bg-slate-50 border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none p-1"
                            >
                              <option value={products.find(p => p.id === item.productId)?.unit}>{products.find(p => p.id === item.productId)?.unit} (Base)</option>
                              {products.find(p => p.id === item.productId)?.packagingUnits?.map(u => (
                                <option key={u.id} value={u.unitName}>{u.unitName}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-xs font-black text-slate-800 text-right outline-none"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-slate-800 text-xs">₹{formatCurrency(item.taxableValue)}</p>
                        <p className="text-[8px] font-black text-blue-500 uppercase">{item.gstPercent}% Tax</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => removeItem(index)}
                          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 lg:p-8 border-t border-slate-100 flex justify-end sticky bottom-0 bg-white/80 backdrop-blur-md z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] lg:shadow-none lg:static lg:bg-transparent">
              <button
                onClick={generateInvoice}
                className="w-full sm:w-auto bg-blue-600 text-white px-12 py-3.5 rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-100 transition-all active:scale-95"
              >
                Generate Bill
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BillingTerminal;
