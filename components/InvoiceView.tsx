import React, { useEffect, useState } from 'react';
import { Invoice, FirmSettings, InvoiceType } from '../types';
import { formatCurrency, numberToWords } from '../utils/helpers';
import QRCode from 'qrcode';

interface Props {
  invoice: Invoice;
  firm: FirmSettings;
}

const InvoiceView: React.FC<Props> = ({ invoice, firm }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const isInterState = invoice.igst !== undefined && invoice.igst > 0;

  useEffect(() => {
    if (firm.upiId) {
      const upiString = `upi://pay?pa=${firm.upiId}&pn=${encodeURIComponent(firm.name)}&am=${invoice.totalAmount}&cu=INR`;
      QRCode.toDataURL(upiString, { width: 100, margin: 0 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR Gen Error', err));
    }
  }, [firm.upiId, firm.name, invoice.totalAmount]);

  const getInvoiceTitle = () => {
    switch (invoice.type) {
      case InvoiceType.EXPORT: return 'EXPORT INVOICE';
      case InvoiceType.ISD: return 'ISD INVOICE';
      case InvoiceType.REVERSE_CHARGE: return 'TAX INVOICE (RC)';
      default: return 'TAX INVOICE';
    }
  };

  // Helper to calculate item discount per unit (derived) or total discount
  // Logic: List Price (Rate) * Qty = Expected Total. 
  // Actual Taxable Value = Expected Total - Discount.
  // So Discount = (Rate * Qty) - Taxable Value.
  const calculateDiscount = (item: any) => {
    const expected = item.rate * item.qty;
    const discount = expected - item.taxableValue;
    return discount > 0 ? discount : 0;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const ITEMS_PER_PAGE = 12; // Adjusted for better A4 fit

  const pages = [];
  for (let i = 0; i < invoice.items.length; i += ITEMS_PER_PAGE) {
    pages.push(invoice.items.slice(i, i + ITEMS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  // Calculate generic totals for display if needed globally
  const totalTax = invoice.items.reduce((acc, item) => acc + (item.taxableValue * item.gstPercent / 100), 0);
  const totalDiscount = invoice.items.reduce((acc, item) => acc + calculateDiscount(item), 0);

  return (
    <div className="flex flex-col gap-8 print:block print:gap-0 font-sans text-std-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
          .print-break-after { break-after: page; }
        }
        
        /* Base styles for the invoice to match PDF and avoid OKLCH errors */
        .invoice-container {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm;
            margin: 0 auto;
            background: #ffffff;
            font-size: 10px;
            display: flex;
            flex-direction: column;
            border: 1px solid #d1d5db; /* Visible on screen */
            box-sizing: border-box;
        }
        
        .invoice-container * {
            box-sizing: border-box;
        }

        @media print {
            .invoice-container {
                border: none;
                height: 297mm;
            }
        }

        /* Explicit Hex Colors/Styles to avoid Tailwind OKLCH issues in html2canvas */
        .text-std-black { color: #000000; }
        .text-std-white { color: #ffffff; }
        .bg-std-black { background-color: #000000; }
        .bg-std-white { background-color: #ffffff; }
        
        .border-std-black { border-color: #000000; }
        .border-std-gray { border-color: #d1d5db; }
        
        /* Custom Grays with explicit Hex */
        .bg-gray-light { background-color: #f9fafb; }
        .bg-gray-med { background-color: #f3f4f6; }
        
        /* Text Colors */
        .text-gray-med { color: #9ca3af; }
        .text-gray-dark { color: #6b7280; }

        /* Borders helpers */
        .border-right { border-right: 1px solid #000000; }
        .border-bottom { border-bottom: 1px solid #000000; }
        .border-top { border-top: 1px solid #000000; }
        .border-left { border-left: 1px solid #000000; }
        
        /* Specific border colors used in layouts */
        .border-b-gray { border-bottom: 1px solid #e5e7eb; } 
        .border-b-std-gray { border-bottom: 1px solid #d1d5db; }
        
        .border-b-black { border-bottom: 1px solid #000000; }
        .border-r-black { border-right: 1px solid #000000; }
        .border-t-black { border-top: 1px solid #000000; }

        /* Table Styles */
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
        }
        .invoice-table th {
            border-bottom: 1px solid #000000;
            border-right: 1px solid #000000;
            font-weight: bold;
            padding: 4px;
            text-align: center;
            background: transparent;
        }
        .invoice-table th:last-child { border-right: none; }
        
        .invoice-table td {
            border-right: 1px solid #000000;
            padding: 4px;
            vertical-align: top;
        }
        .invoice-table td:last-child { border-right: none; }

        .text-xxs { font-size: 8px; }
        .font-bold-title { font-size: 18px; font-weight: 800; }
        /* Sticky Underline Class */
        .sticky-underline {
            border-bottom: 2px solid #000000;
            padding-bottom: 2px;
            display: inline-block;
            line-height: 2;
        }
        .sticky-underline-2 {
            border-bottom: 1px solid #000000; 
            padding-bottom: 2px;
            display: inline-block;
            line-height: 2; 
        }


        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            position: relative;
            z-index: 10;
        }
      `}</style>

      {/* Hidden container for QR Code generator if needed, but we use useEffect */}

      {pages.map((itemChunk, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;

        return (
          <div key={pageIdx} className="invoice-container print-break-after relative">

            {/* --- TOP HEADER --- */}
            <div className="flex justify-between items-center text-[9px] mb-1">
              <span>Page No. {pageIdx + 1} of {pages.length}</span>
              <span className="font-bold text-sm sticky-underline">{getInvoiceTitle()}</span>
              <span>Original Copy</span>
            </div>

            {/* --- MAIN BORDERED CONTAINER --- */}
            <div className="bordered-box border-std-black border flex-grow flex flex-col">

              {/* COMPANY HEADER */}
              <div className="border-bottom flex flex-col items-center justify-center p-4 text-center">
                <h1 className="font-bold-title uppercase tracking-wide">{firm.name}</h1>
                <p className="text-[10px] mt-1">{firm.address}</p>
                <p className="text-[10px] mt-1 font-semibold">
                  <span className="font-bold">Mobile:</span> {firm.phone || (firm as any).mobile || ''} | <span className="font-bold">Email:</span> {firm.email}
                </p>
                <p className="mt-2 font-bold text-sm">GSTIN - {firm.gstin}</p>
              </div>

              {/* INVOICE METADATA GRID - Adjusted Grid Cols for Better Supply Fit */}
              <div className="border-bottom grid grid-cols-[1.2fr_0.9fr_1.3fr_1.0fr_0.8fr] text-[9px] divide-x divide-black">
                <div className="p-1 pl-2 border-r-black">
                  <span className="font-bold">Invoice No:</span> <span className="ml-1">{invoice.invoiceNo}</span>
                </div>
                <div className="p-1 pl-2 border-r-black">
                  <span className="font-bold">Date:</span> <span className="ml-1">{formatDate(invoice.date)}</span>
                </div>
                <div className="p-1 pl-2 border-r-black">
                  {/* Removed truncate to prevent cutoff and allowed wrapping */}
                  <span className="font-bold">Place of Supply:</span> <span className="ml-1">{invoice.customer.stateCode}-{invoice.customer.state}</span>
                </div>
                <div className="p-1 pl-2 border-r-black">
                  <span className="font-bold">Due Date:</span> <span className="ml-1">{formatDate(invoice.date)}</span>
                </div>
                <div className="p-1 pl-2">
                  <span className="font-bold">Reverse Charge:</span> <span className="ml-1">{invoice.isReverseCharge ? 'Yes' : 'No'}</span>
                </div>
              </div>

              {/* BILLING & SHIPPING SPLIT */}
              <div className="border-bottom grid grid-cols-2">
                {/* Billing */}
                <div className="p-2 border-r-black">
                  <div className="font-bold uppercase text-[9px] mb-1 border-b-std-gray pb-1 inline-block">Billing Details</div>
                  <div className="text-[10px] leading-tight flex flex-col gap-1">
                    <p><span className="font-bold w-12 inline-block">Name:</span> {invoice.customer.name}</p>
                    <p><span className="font-bold w-12 inline-block">Address:</span> {invoice.customer.address}</p>
                    <p><span className="font-bold w-12 inline-block">GSTIN:</span> {invoice.customer.gstin}</p>
                    <p><span className="font-bold w-16 inline-block">Mobile:</span> {invoice.customer.phone || (invoice.customer as any).mobile || (invoice.customer as any).contact || (invoice.customer as any).mobileNumber || (invoice.customer as any).phoneNumber || ''}</p>
                    <p><span className="font-bold w-16 inline-block">State:</span> {invoice.customer.state || ''} ({invoice.customer.stateCode || ''})</p>
                  </div>
                </div>
                {/* Shipping (Mirrored) */}
                <div className="p-2">
                  <div className="font-bold uppercase text-[9px] mb-1 border-b-std-gray pb-1 inline-block">Shipping Details</div>
                  <div className="text-[10px] leading-tight flex flex-col gap-1">
                    <p><span className="font-bold w-12 inline-block">Name:</span> {invoice.customer.name}</p>
                    <p><span className="font-bold w-12 inline-block">Address:</span> {invoice.customer.address}</p>
                    <p><span className="font-bold w-12 inline-block">GSTIN:</span> {invoice.customer.gstin}</p>
                    <p><span className="font-bold w-16 inline-block">Mobile:</span> {invoice.customer.phone || (invoice.customer as any).mobile || (invoice.customer as any).contact || (invoice.customer as any).mobileNumber || (invoice.customer as any).phoneNumber || ''}</p>
                    <p><span className="font-bold w-16 inline-block">State:</span> {invoice.customer.state || ''} ({invoice.customer.stateCode || ''})</p>
                  </div>
                </div>
              </div>

              {/* ITEM TABLE */}
              <div className="flex-grow relative">
                {/* FULL HEIGHT VERTICAL GRID LINES OVERLAY */}
                <div className="absolute inset-0 flex pointer-events-none z-0">
                  <div className="w-8 border-r-black h-full"></div>
                  <div className="flex-1 border-r-black h-full"></div>
                  <div className="w-16 border-r-black h-full"></div>
                  <div className="w-12 border-r-black h-full"></div>
                  <div className="w-12 border-r-black h-full"></div>
                  <div className="w-20 border-r-black h-full"></div>
                  <div className="w-16 border-r-black h-full"></div>
                  <div className="w-12 border-r-black h-full"></div>
                  <div className="w-24 h-full"></div>
                </div>

                <table className="invoice-table text-[9px] relative z-10 w-full">
                  <thead>
                    <tr className="h-8">
                      <th className="w-8">Sr.</th>
                      <th className="text-left pl-2">Item Description</th>
                      <th className="w-16">HSN/SAC</th>
                      <th className="w-12">Qty</th>
                      <th className="w-12">Unit</th>
                      <th className="w-20 text-right">Rate</th>
                      <th className="w-16 text-right">Disc.</th>
                      <th className="w-12">Tax %</th>
                      <th className="w-24 text-right pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemChunk.map((item, idx) => {
                      const discount = calculateDiscount(item);
                      return (
                        <tr key={idx} className="border-b-gray">
                          <td className="text-center">{(pageIdx * ITEMS_PER_PAGE) + idx + 1}</td>
                          <td className="pl-2">
                            <p className="font-bold">{item.productName}</p>
                            <p className="text-[8px] italic">{item.hsn ? 'HSN' : 'SAC'}</p>
                          </td>
                          <td className="text-center">{item.hsn || item.sac}</td>
                          <td className="text-center font-bold">{item.qty}</td>
                          <td className="text-center uppercase">{item.unit}</td>
                          <td className="text-right">{formatCurrency(item.rate)}</td>
                          <td className="text-right">{discount > 0 ? formatCurrency(discount) : '-'}</td>
                          <td className="text-center">{item.gstPercent}%</td>
                          <td className="text-right font-bold pr-2">{formatCurrency(item.taxableValue)}</td>
                        </tr>
                      )
                    })}

                    {/* Fill Remaining Rows to maintain correct height and vertical lines */}
                    {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - itemChunk.length) }).map((_, i) => (
                      <tr key={`empty-${i}`} className="border-b-gray h-8">
                        <td className="border-right"></td>
                        <td className="border-right"></td>
                        <td className="border-right"></td>
                        <td className="border-right"></td>
                        <td className="border-right"></td>
                        <td className="border-right"></td>
                        <td className="border-right"></td>
                        <td className="border-right"></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FOOTER TOTALS AREA */}
              {isLastPage && (
                <div className="border-top text-[10px]">
                  {/* Calculations */}
                  <div className="grid grid-cols-[1fr_200px]">
                    {/* Left Footer Content */}
                    <div className="flex flex-col justify-between border-r-black">
                      <div className="p-2 border-b-black">
                        <p className="text-[9px] uppercase font-bold text-gray-med">Amount in Words</p>
                        <p className="font-bold italic mt-1 capitalize">{numberToWords(invoice.totalAmount)} only</p>
                      </div>

                      {/* Detailed Tax Summary Table (HSN/SAC Wise) */}
                      {totalTax > 0 && (
                        <div className="p-2 border-b-black">
                          <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>GST Tax Summary</p>
                          <table className="w-full text-[8px] border-collapse" style={{ border: '1px solid #e2e8f0' }}>
                            <thead>
                              <tr className="font-bold border-b border-slate-200" style={{ backgroundColor: '#f8fafc' }}>
                                <th className="p-1 text-left" style={{ borderRight: '1px solid #e2e8f0' }}>HSN/SAC</th>
                                <th className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>Taxable Val.</th>
                                {isInterState ? (
                                  <>
                                    <th className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>IGST %</th>
                                    <th className="p-1 text-right">IGST Amt</th>
                                  </>
                                ) : (
                                  <>
                                    <th className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>CGST %</th>
                                    <th className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>CGST Amt</th>
                                    <th className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>SGST %</th>
                                    <th className="p-1 text-right">SGST Amt</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {/* Group items by HSN and GST percentage */}
                              {Object.values(invoice.items.reduce((acc: any, item) => {
                                const key = `${item.hsn || item.sac}-${item.gstPercent}`;
                                if (!acc[key]) {
                                  acc[key] = { hsn: item.hsn || item.sac, taxable: 0, rate: item.gstPercent, igst: 0, cgst: 0, sgst: 0 };
                                }
                                acc[key].taxable = (acc[key].taxable || 0) + item.taxableValue;
                                acc[key].igst = (acc[key].igst || 0) + (item.igst || 0);
                                acc[key].cgst = (acc[key].cgst || 0) + (item.cgst || 0);
                                acc[key].sgst = (acc[key].sgst || 0) + (item.sgst || 0);
                                return acc;
                              }, {})).map((group: any, idx) => {
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td className="p-1" style={{ borderRight: '1px solid #e2e8f0' }}>{group.hsn}</td>
                                    <td className="p-1 text-right border-r border-slate-200">{formatCurrency(group.taxable)}</td>
                                    {isInterState ? (
                                      <>
                                        <td className="p-1 text-right border-r border-slate-200">{group.rate}%</td>
                                        <td className="p-1 text-right font-bold">{formatCurrency(group.igst)}</td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>{group.rate / 2}%</td>
                                        <td className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>{formatCurrency(group.cgst)}</td>
                                        <td className="p-1 text-right" style={{ borderRight: '1px solid #e2e8f0' }}>{group.rate / 2}%</td>
                                        <td className="p-1 text-right font-bold">{formatCurrency(group.sgst)}</td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tax Breakup / Terms Grid */}
                      <div className="grid grid-cols-2 flex-grow">
                        <div className="p-2 border-r-black">
                          <p className="mb-1"><span className="font-bold sticky-underline-2">Bank Details</span></p>
                          <div className="grid grid-cols-[auto_1fr] gap-x-2 text-[9px] leading-snug">
                            <span>Bank:</span> <span className="font-bold">{firm.bankName}</span>
                            <span>Acc No:</span> <span className="font-bold">{firm.accNumber}</span>
                            <span>IFSC:</span> <span className="font-bold">{firm.ifsc}</span>
                            <span>Branch:</span> <span>{firm.bankBranch || 'Main'}</span>
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            {/* Dynamic QR Code */}
                            <div className="w-12 h-12 flex items-center justify-center">
                              {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="UPI QR" className="w-full h-full object-contain" />
                              ) : (
                                <div className="border-std-black border w-full h-full flex items-center justify-center text-[6px] text-center">Loading QR</div>
                              )}
                            </div>
                            <div className="text-[8px] leading-tight">
                              <p>Scan to Pay via UPI</p>
                              <p className="font-bold">{firm.upiId}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 flex flex-col justify-between">
                          <div>
                            <p className="mb-1"><span className="font-bold sticky-underline-2 ">Terms and Conditions</span></p>
                            <div className="text-[8px] leading-tight flex flex-col gap-0.5">
                              {/* <div className="flex items-start">
                                <span className="font-bold mr-1">1.</span>
                                <span>E & O.E.</span>
                              </div> */}
                              {firm.terms.slice(0, 4).map((t, i) => (
                                <div key={i} className="flex items-start">
                                  <span className="font-bold mr-1">{i + 1}.</span>
                                  <span>{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="border-t-black mt-2 pt-1">
                            <p className="text-[8px]">Certified that the particulars given above are true and correct.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Totals Column */}
                    <div className="text-[9px]">
                      <div className="flex justify-between p-1 px-2 border-b-std-gray">
                        <span style={{ color: '#64748b' }}>Taxable Amount</span>
                        <span className="font-bold">{formatCurrency(invoice.totalTaxable)}</span>
                      </div>
                      {/* Tax Breakdown */}
                      {invoice.cgst !== undefined && invoice.cgst > 0 && (
                        <div className="flex justify-between p-1 px-2 border-b-std-gray">
                          <span>CGST</span>
                          <span className="font-bold">{formatCurrency(invoice.cgst)}</span>
                        </div>
                      )}
                      {invoice.sgst !== undefined && invoice.sgst > 0 && (
                        <div className="flex justify-between p-1 px-2 border-b-std-gray">
                          <span>SGST</span>
                          <span className="font-bold">{formatCurrency(invoice.sgst)}</span>
                        </div>
                      )}
                      {invoice.igst !== undefined && invoice.igst > 0 && (
                        <div className="flex justify-between p-1 px-2 border-b-std-gray">
                          <span>IGST</span>
                          <span className="font-bold">{formatCurrency(invoice.igst)}</span>
                        </div>
                      )}

                      {/* Fallback if for some reason breakdown isn't provided but tax exists */}
                      {(!invoice.cgst && !invoice.sgst && !invoice.igst && totalTax > 0) && (
                        <div className="flex justify-between p-1 px-2 border-b-std-gray">
                          <span>Total Tax</span>
                          <span className="font-bold">{formatCurrency(totalTax)}</span>
                        </div>
                      )}

                      <div className="flex justify-between p-1 px-2 border-b-std-gray">
                        <span>Discount</span>
                        <span className="font-bold">{formatCurrency(totalDiscount)}</span>
                      </div>

                      <div className="flex justify-between p-1 px-2 border-b-black bg-gray-med font-bold text-sm items-center py-2 h-10">
                        <span>TOTAL</span>
                        <span>₹{formatCurrency(invoice.totalAmount)}</span>
                      </div>

                      {/* Signature */}
                      <div className="h-32 p-2 flex flex-col justify-between items-center text-center">
                        <p className="font-bold text-[8px]">For {firm.name}</p>
                        <div className="w-full">
                          <p className="text-[8px] uppercase font-bold border-t-black pt-1">Authorized Signatory</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isLastPage && (
                <div className="absolute bottom-0 w-full text-center border-t-black p-1 text-[8px] italic">
                  Continued on next page...
                </div>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InvoiceView;
