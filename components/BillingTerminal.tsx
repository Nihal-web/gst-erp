import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Customer, Product, InvoiceItem, Invoice, InvoiceType } from '../types';
import InvoiceView from './InvoiceView';
import { formatCurrency, preciseRound, calculateGST } from '../utils/helpers';
import { createInvoice, fetchProducts, uploadInvoicePDF } from '../services/apiService';
import { fetchHSNDetails } from '../services/geminiService';
import { generateEWayBillJSON, validateGSTIN } from '../utils/ewayBill';
import { logActivity } from '../services/auditService';
import { useApp } from '../AppContext';
import { useAuth } from '../AuthContext';

const BillingTerminal: React.FC = () => {
  const { products, customers, addInvoice, firm, showAlert, invoices } = useApp();
  const { user } = useAuth();
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

  // Invoice Customization State
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [customDeclaration, setCustomDeclaration] = useState(firm.declaration);
  const [customTerms, setCustomTerms] = useState(firm.terms.join('\n'));

  // Sync state with firm details when they load
  React.useEffect(() => {
    setCustomDeclaration(firm.declaration);
    setCustomTerms(firm.terms.join('\n'));
  }, [firm]);


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

  // --- Barcode Scanner Listener ---
  React.useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field (except body)
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      const char = e.key;

      if (currentTime - lastKeyTime > 300) {
        buffer = ''; // Reset buffer if too slow (manual typing)
      }
      lastKeyTime = currentTime;

      if (char === 'Enter') {
        if (buffer.length > 3) {
          // Attempt to find product by barcode or ID
          const product = products.find(p => p.barcode === buffer || p.id === buffer || p.productName === buffer);
          if (product) {
            addItemToCart(product);
            buffer = '';
            e.preventDefault();
          }
        }
        buffer = '';
      } else if (char.length === 1) {
        buffer += char;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, items]); // Re-bind when products change

  const addItemToCart = (p: Product) => {
    // Check if item already exists
    const existingIndex = items.findIndex(i => i.productId === p.id);

    if (existingIndex >= 0) {
      // Increment Qty
      const newItems = [...items];
      newItems[existingIndex].qty += 1;
      newItems[existingIndex].taxableValue = newItems[existingIndex].qty * newItems[existingIndex].rate;
      setItems(newItems);
      showAlert(`Added +1 ${p.name}`, "success");
    } else {
      // Add New Item
      const newItem: InvoiceItem = {
        productId: p.id,
        productName: p.name,
        hsn: p.hsn,
        sac: p.sac || '',
        qty: 1,
        rate: p.rate,
        unit: p.unit,
        taxableValue: p.rate,
        gstPercent: p.gstPercent,
        conversionFactor: undefined
      };
      setItems([...items, newItem]);
      showAlert(`Scanned: ${p.name}`, "success");
    }
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
    const isInterState = selectedCustomer.stateCode !== (firm.stateCode || firm.gstin.substring(0, 2)) || invoiceType === InvoiceType.EXPORT;

    // Calculate detailed taxes for each item
    const itemsWithTax = items.map(item => {
      const { igst, cgst, sgst } = calculateGST(item.taxableValue, item.gstPercent, isInterState);
      return {
        ...item,
        igst: (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT') ? 0 : igst,
        cgst: (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT') ? 0 : cgst,
        sgst: (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT') ? 0 : sgst,
      };
    });

    // Sum up totals from line items
    let totalIgst = itemsWithTax.reduce((sum, item) => preciseRound(sum + (item.igst || 0)), 0);
    let totalCgst = itemsWithTax.reduce((sum, item) => preciseRound(sum + (item.cgst || 0)), 0);
    let totalSgst = itemsWithTax.reduce((sum, item) => preciseRound(sum + (item.sgst || 0)), 0);

    // Final Grand Total Rounding (Math.round for nearest rupee)
    const exactTotal = preciseRound(totalTaxable + totalIgst + totalCgst + totalSgst);
    const roundedTotal = Math.round(exactTotal);
    const roundingDiff = preciseRound(roundedTotal - exactTotal);

    // If there's a rounding difference, adjust the tax components and the LAST item
    if (roundingDiff !== 0 && itemsWithTax.length > 0) {
      const lastIdx = itemsWithTax.length - 1;
      if (isInterState) {
        totalIgst = preciseRound(totalIgst + roundingDiff);
        itemsWithTax[lastIdx].igst = preciseRound((itemsWithTax[lastIdx].igst || 0) + roundingDiff);
      } else {
        const halfDiff = preciseRound(roundingDiff / 2);
        const secondHalf = preciseRound(roundingDiff - halfDiff);

        totalCgst = preciseRound(totalCgst + halfDiff);
        totalSgst = preciseRound(totalSgst + secondHalf);

        itemsWithTax[lastIdx].cgst = preciseRound((itemsWithTax[lastIdx].cgst || 0) + halfDiff);
        itemsWithTax[lastIdx].sgst = preciseRound((itemsWithTax[lastIdx].sgst || 0) + secondHalf);
      }
    }

    const totalAmount = roundedTotal;

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
      items: itemsWithTax,
      totalTaxable,
      igst: totalIgst || undefined,
      cgst: totalCgst || undefined,
      sgst: totalSgst || undefined,
      totalAmount,
      isPaid: false,
      isReverseCharge: isReverseCharge,
      exportType: invoiceType === InvoiceType.EXPORT ? exportType : undefined,
      shippingBillNo: invoiceType === InvoiceType.EXPORT ? shippingBill : undefined,
      shippingBillDate: invoiceType === InvoiceType.EXPORT ? shippingDate : undefined,
    };

    addInvoice(invoice);
    logActivity(firm.email || 'admin', 'CREATE INVOICE', `Generated Invoice ${generatedInvoiceNo} for ₹${totalAmount}`, user?.id);
    setInvoiceData(invoice);
    setShowInvoice(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateInvoicePDF = async (): Promise<Blob | null> => {
    let tempContainer: HTMLDivElement | null = null;
    try {
      showAlert("Preparing high-quality document...", "info");

      const invoiceElement = document.getElementById('invoice-capture-area');
      if (!invoiceElement) {
        showAlert("Reference lost. Please refresh and try again.", "error");
        return null;
      }

      const A4_PIXEL_WIDTH = 794;
      const A4_PIXEL_HEIGHT = 1123;

      tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      tempContainer.style.width = `${A4_PIXEL_WIDTH}px`;
      tempContainer.style.minHeight = `${A4_PIXEL_HEIGHT}px`;
      tempContainer.style.background = '#ffffff';
      tempContainer.style.opacity = '1';
      tempContainer.style.visibility = 'visible';
      tempContainer.style.zIndex = '-9999'; // Stay behind everything but still "visible"
      document.body.appendChild(tempContainer);

      // Wait for layout to settle in the NEW container
      await new Promise(resolve => setTimeout(resolve, 800));

      // Clone all head styles to ensure Tailwind 4 variables and global styles are available in the temp container
      const allStyles = document.head.querySelectorAll('style, link[rel="stylesheet"]');
      allStyles.forEach(style => {
        tempContainer.appendChild(style.cloneNode(true));
      });

      const clonedInvoice = invoiceElement.cloneNode(true) as HTMLElement;
      clonedInvoice.className = 'invoice-container';
      clonedInvoice.style.width = '100%';
      clonedInvoice.style.minHeight = `${A4_PIXEL_HEIGHT}px`;
      clonedInvoice.style.padding = '35px';
      clonedInvoice.style.margin = '0';
      clonedInvoice.style.border = 'none';
      clonedInvoice.style.boxShadow = 'none';
      clonedInvoice.style.transform = 'none';
      clonedInvoice.style.boxSizing = 'border-box';

      tempContainer.appendChild(clonedInvoice);

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: A4_PIXEL_WIDTH,
        windowWidth: A4_PIXEL_WIDTH,
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (Math.abs(contentHeight - pdfHeight) < 20) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } else {
        if (contentHeight > pdfHeight) {
          const customPdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfWidth, contentHeight]
          });
          customPdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, contentHeight);
          return customPdf.output('blob'); // Return blob for dynamic sizing
        } else {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, contentHeight);
        }
      }

      return pdf.output('blob');

    } catch (error) {
      console.error("PDF Generation Error:", error);
      showAlert("PDF error. Try using the browser print option (Ctrl+P).", "error");
      return null;
    } finally {
      if (tempContainer && document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    const pdfBlob = await generateInvoicePDF();
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceData?.invoiceNo || 'document'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert("PDF downloaded successfully.", "success");
    }
    setIsPrinting(false);
  };

  const handleWhatsAppShare = async () => {
    if (!invoiceData) return;
    setIsPrinting(true);

    try {
      const pdfBlob = await generateInvoicePDF();
      if (!pdfBlob) throw new Error("Failed to generate PDF");

      // Upload to Supabase Storage
      const fileName = `Invoice_${invoiceData.invoiceNo}_${Date.now()}.pdf`;
      const publicUrl = await uploadInvoicePDF(pdfBlob, fileName);

      if (!publicUrl) throw new Error("Failed to upload PDF");

      const rawPhone = invoiceData.customer.phone || '';
      const phone = rawPhone.replace(/\D/g, '');
      const targetPhone = phone.length === 10 ? `91${phone}` : phone;

      const text = `Hello ${invoiceData.customer.name},\n\nHere is your invoice *${invoiceData.invoiceNo}* for *₹${formatCurrency(invoiceData.totalAmount)}*.\n\nYou can view and download it here: ${publicUrl}\n\nThank you for your business!`;

      // Open WhatsApp
      const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');

      showAlert("Invoice Link Generated & WhatsApp Opened!", "success");

    } catch (e) {
      console.error("Share Error:", e);
      showAlert("Failed to share invoice.", "error");
    } finally {
      setIsPrinting(false);
    }
  };



  if (showInvoice && invoiceData) {
    // Merge custom details into the firm object for the view
    const displayFirm = {
      ...firm,
      declaration: customDeclaration,
      terms: customTerms.split('\n').filter(t => t.trim() !== '')
    };

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
              onClick={() => setShowEditDetails(true)}
              className="w-full sm:w-auto bg-slate-100 text-slate-700 px-6 py-3 rounded-2xl hover:bg-slate-200 font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              Edit Details ✏️
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 font-black shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 ${isPrinting ? 'opacity-50' : ''}`}
            >
              {isPrinting ? 'Generating...' : 'Download PDF 🖨️'}
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="w-full sm:w-auto bg-green-500 text-white px-6 py-3 rounded-2xl hover:bg-green-600 font-black shadow-xl shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              WhatsApp 💬
            </button>

          </div>
        </div>

        {/* PDF Preview Area - Styled like a document viewer */}
        <div className="flex justify-center bg-slate-800/90 rounded-3xl p-4 lg:p-10 overflow-auto max-h-[80vh] border border-slate-700 shadow-inner scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent backdrop-blur-sm">
          <div className="relative shadow-2xl shadow-black/50 print:shadow-none transition-transform duration-300 ease-out origin-top scale-[0.4] sm:scale-[0.55] md:scale-[0.7] lg:scale-90 xl:scale-100">
            <div id="invoice-capture-area" className="invoice-wrapper bg-white" style={{ width: '210mm' }}>
              <InvoiceView invoice={invoiceData} firm={displayFirm} />
            </div>
          </div>
        </div>

        {/* Edit Details Modal */}
        {showEditDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-3xl p-8 animate-in zoom-in-95 shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 mb-6">Edit Invoice Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Declaration</label>
                  <textarea
                    value={customDeclaration}
                    onChange={e => setCustomDeclaration(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold h-20 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Terms & Conditions (One per line)</label>
                  <textarea
                    value={customTerms}
                    onChange={e => setCustomTerms(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold h-32 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowEditDetails(false)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs">Done</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const calculateTotalPayable = () => {
    const totalTaxable = items.reduce((sum, item) => sum + item.taxableValue, 0);
    const isInterState = selectedCustomer ? selectedCustomer.stateCode !== (firm.stateCode || firm.gstin.substring(0, 2)) || invoiceType === InvoiceType.EXPORT : false;

    if (invoiceType === InvoiceType.EXPORT && exportType === 'WITHOUT_PAYMENT') {
      return totalTaxable;
    }

    let tIgst = 0, tCgst = 0, tSgst = 0;
    items.forEach(item => {
      const { igst, cgst, sgst } = calculateGST(item.taxableValue, item.gstPercent, isInterState);
      tIgst = preciseRound(tIgst + igst);
      tCgst = preciseRound(tCgst + cgst);
      tSgst = preciseRound(tSgst + sgst);
    });

    return Math.round(preciseRound(totalTaxable + tIgst + tCgst + tSgst));
  };

  const totalPayable = calculateTotalPayable();

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

          <div className="w-full no-print">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8">
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

            {/* Inline Edit Details Section */}
            <div className="px-6 lg:px-8 py-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/30 border-t border-slate-100 mt-4 rounded-b-3xl mx-2">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-2 tracking-widest">Terms & Conditions</label>
                <textarea
                  value={customTerms}
                  onChange={e => setCustomTerms(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold h-24 outline-none focus:ring-2 focus:ring-blue-100 resize-none shadow-sm"
                  placeholder="Enter invoice terms..."
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 block mb-2 tracking-widest">Declaration</label>
                <textarea
                  value={customDeclaration}
                  onChange={e => setCustomDeclaration(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold h-24 outline-none focus:ring-2 focus:ring-blue-100 resize-none shadow-sm"
                  placeholder="Enter declaration..."
                />
              </div>
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
