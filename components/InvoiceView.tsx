
import React from 'react';
import { Invoice, FirmSettings, InvoiceType } from '../types';
import { formatCurrency, numberToWords } from '../utils/helpers';

interface Props {
  invoice: Invoice;
  firm: FirmSettings;
}

const InvoiceView: React.FC<Props> = ({ invoice, firm }) => {
  const isInterState = invoice.igst !== undefined && invoice.igst > 0;

  const getInvoiceTitle = () => {
    switch (invoice.type) {
      case InvoiceType.EXPORT: return 'EXPORT INVOICE';
      case InvoiceType.ISD: return 'ISD INVOICE';
      default: return 'TAX INVOICE';
    }
  };

  const ITEMS_PER_PAGE = 10;

  // Chunk items into pages
  const pages = [];
  for (let i = 0; i < invoice.items.length; i += ITEMS_PER_PAGE) {
    pages.push(invoice.items.slice(i, i + ITEMS_PER_PAGE));
  }

  // If no items, show at least one blank page
  if (pages.length === 0) pages.push([]);

  return (
    <div className="flex flex-col gap-8 print:block print:gap-0">
      {pages.map((itemChunk, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;

        // Dynamic spacer for professional alignment
        const itemHeight = 15;
        const tableHeaderHeight = 15;
        const otherElementsHeight = isLastPage ? 180 : 80;
        const remainingHeight = Math.max(0, 270 - (otherElementsHeight + tableHeaderHeight + (itemChunk.length * itemHeight)));
        const spacerHeight = Math.min(120, remainingHeight);

        return (
          <div
            key={pageIdx}
            className="bg-white text-black font-sans leading-tight border border-black flex flex-col mx-auto print:border-none print:shadow-none print:break-after-page mb-8 print:mb-0"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '12mm',
              boxSizing: 'border-box',
              overflow: 'visible'
            }}
          >
            {/* Header Section */}
            <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-black text-black uppercase leading-none mb-1">{firm.name}</h1>
                <p className="text-[10px] font-bold text-black uppercase tracking-widest mb-3 opacity-70">{firm.tagline}</p>
                <div className="text-[11px] space-y-0.5 text-black">
                  <p className="font-bold">{firm.address}</p>
                  <p><strong>GSTIN:</strong> <span className="font-black">{firm.gstin}</span> | <strong>PAN:</strong> <span className="font-black">{firm.pan}</span></p>
                  <p><strong>PH:</strong> {firm.phone} | {firm.email}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="bg-black text-white px-8 py-3 mb-2 font-black text-base uppercase tracking-widest">
                  {getInvoiceTitle()}
                </div>
                {invoice.type === InvoiceType.EXPORT && (
                  <p className="text-[11px] font-black uppercase text-black border-2 border-black px-3 py-1 mb-2">
                    {invoice.exportType === 'WITHOUT_PAYMENT' ? 'EXPORT WITHOUT PAYMENT OF TAX (LUT)' : 'EXPORT WITH PAYMENT OF TAX (IGST)'}
                  </p>
                )}
                {invoice.isReverseCharge && (
                  <p className="text-[11px] font-black uppercase bg-slate-200 px-3 py-1 border border-black">REVERSE CHARGE: YES</p>
                )}
                <p className="text-[10px] font-bold mt-2">Page {pageIdx + 1} of {pages.length}</p>
              </div>
            </div>

            {/* Details Bar */}
            <div className="grid grid-cols-2 gap-px bg-black border border-black mb-6">
              <div className="bg-white p-4">
                <p className="text-[10px] font-black text-black uppercase mb-2 opacity-60">Consignee (Billed To)</p>
                <h2 className="text-sm font-black text-black uppercase mb-2 border-b-2 border-black inline-block">{invoice.customer.name}</h2>
                <div className="text-[11px] space-y-1 text-black leading-snug">
                  <p className="font-bold">{invoice.customer.address}</p>
                  {invoice.customer.country && <p><strong>Country:</strong> {invoice.customer.country}</p>}
                  <p><strong>GSTIN:</strong> <span className="font-black">{invoice.customer.gstin}</span></p>
                  <p><strong>State:</strong> {invoice.customer.state} ({invoice.customer.stateCode})</p>
                </div>
              </div>
              <div className="bg-white p-4 grid grid-cols-2 gap-4 text-[11px] border-l border-black">
                <div className="flex flex-col border-b border-black pb-2">
                  <span className="font-black text-black text-[9px] uppercase opacity-60">Invoice No.</span>
                  <span className="font-black text-black text-sm">{invoice.invoiceNo}</span>
                </div>
                <div className="flex flex-col border-b border-black pb-2">
                  <span className="font-black text-black text-[9px] uppercase opacity-60">Invoice Date</span>
                  <span className="font-black text-black text-sm">{invoice.date}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-black text-[9px] uppercase opacity-60">Place of Supply</span>
                  <span className="font-bold text-black">{invoice.customer.state}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-black text-[9px] uppercase opacity-60">Transport Mode</span>
                  <span className="font-bold text-black">{invoice.transport || 'Internal/Surface'}</span>
                </div>
              </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 flex flex-col overflow-visible">
              <table className="w-full border-2 border-black text-[12px] border-collapse">
                <thead>
                  <tr className="bg-black text-white text-[10px] font-black uppercase tracking-widest">
                    <th className="p-3 border-r border-white w-12 text-center">SR.</th>
                    <th className="p-3 border-r border-white text-left">Description of Goods/Services</th>
                    <th className="p-3 border-r border-white w-24 text-center">HSN/SAC</th>
                    <th className="p-3 border-r border-white w-20 text-center">Qty</th>
                    <th className="p-3 border-r border-white w-32 text-right">Unit Rate</th>
                    <th className="p-3 text-right w-40">Taxable Val</th>
                  </tr>
                </thead>
                <tbody className="text-black">
                  {itemChunk.map((item, i) => (
                    <tr key={i} className="border-b border-black font-bold align-top break-inside-avoid">
                      <td className="p-3 border-r-2 border-black text-center">{(pageIdx * ITEMS_PER_PAGE) + i + 1}</td>
                      <td className="p-3 border-r-2 border-black">
                        <p className="font-black uppercase text-sm mb-1">{item.productName}</p>
                        <p className="text-[9px] uppercase opacity-60">
                          {isInterState ? `IGST @ ${item.gstPercent}%` : `CGST @ ${item.gstPercent / 2}% + SGST @ ${item.gstPercent / 2}%`}
                        </p>
                      </td>
                      <td className="p-3 border-r-2 border-black text-center font-black">{item.hsn || item.sac}</td>
                      <td className="p-3 border-r-2 border-black text-center uppercase">{item.qty} {item.unit}</td>
                      <td className="p-3 border-r-2 border-black text-right">{formatCurrency(item.rate)}</td>
                      <td className="p-3 text-right font-black">{formatCurrency(item.taxableValue)}</td>
                    </tr>
                  ))}
                  {/* Conditional Height fill */}
                  {spacerHeight > 5 && (
                    <tr style={{ height: `${spacerHeight}mm` }}>
                      <td className="border-r-2 border-black"></td>
                      <td className="border-r-2 border-black"></td>
                      <td className="border-r-2 border-black"></td>
                      <td className="border-r-2 border-black"></td>
                      <td className="border-r-2 border-black"></td>
                      <td></td>
                    </tr>
                  )}
                  {!isLastPage && (
                    <tr className="bg-slate-100 font-black text-[10px] border-t-2 border-black">
                      <td colSpan={5} className="p-2 text-right uppercase italic">Totals Carried Forward to Next Page &raquo;&raquo;</td>
                      <td className="p-2 text-right">₹{formatCurrency(itemChunk.reduce((s, it) => s + it.taxableValue, 0))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isLastPage && (
              <>
                {/* Summary Section */}
                <div className="flex border-2 border-black border-t-0 bg-white overflow-visible break-inside-avoid mt-px">
                  <div className="flex-1 p-4 border-r-2 border-black">
                    <p className="text-[10px] font-black text-black uppercase mb-1 opacity-60">Total Amount In Words</p>
                    <p className="text-[11px] font-black uppercase italic text-black leading-tight border-b border-black pb-2 mb-4">
                      {numberToWords(invoice.totalAmount)}
                    </p>

                    <div className="grid grid-cols-2 gap-6 items-end">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-black uppercase opacity-60">Bank Transfer Details</p>
                        <div className="text-[10px] font-black text-black space-y-0.5">
                          <p>BANK: {firm.bankName}</p>
                          <p>AC NO: {firm.accNumber}</p>
                          <p>IFSC: {firm.ifsc}</p>
                          <p>UPI: {firm.upiId}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${firm.upiId}&am=${invoice.totalAmount}&pn=${encodeURIComponent(firm.name)}&tr=${invoice.invoiceNo}`)}`}
                          alt="UPI"
                          className="w-20 h-20 border-2 border-black p-1 bg-white mb-1"
                        />
                        <p className="text-[7px] font-black uppercase tracking-tighter">Scan to Pay via UPI</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-72 bg-slate-50">
                    <div className="grid grid-cols-2 border-b-2 border-black">
                      <span className="p-3 text-[10px] font-black uppercase text-black border-r-2 border-black">Sub Total</span>
                      <span className="p-3 text-[12px] font-black text-right text-black">{formatCurrency(invoice.totalTaxable)}</span>
                    </div>
                    {isInterState ? (
                      <div className="grid grid-cols-2 border-b-2 border-black">
                        <span className="p-3 text-[10px] font-black uppercase text-black border-r-2 border-black">IGST Sum</span>
                        <span className="p-3 text-[12px] font-black text-right text-black">{formatCurrency(invoice.igst || 0)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 border-b border-black">
                          <span className="p-3 text-[10px] font-black uppercase text-black border-r-2 border-black">CGST</span>
                          <span className="p-3 text-[12px] font-black text-right text-black">{formatCurrency(invoice.cgst || 0)}</span>
                        </div>
                        <div className="grid grid-cols-2 border-b-2 border-black">
                          <span className="p-3 text-[10px] font-black uppercase text-black border-r-2 border-black">SGST</span>
                          <span className="p-3 text-[12px] font-black text-right text-black">{formatCurrency(invoice.sgst || 0)}</span>
                        </div>
                      </>
                    )}
                    <div className="grid grid-cols-2 bg-black text-white">
                      <span className="p-4 text-[12px] font-black uppercase tracking-widest border-r-2 border-white">Grand Total</span>
                      <span className="p-4 text-xl font-black text-right">₹{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                    <div className="p-4 flex flex-col justify-end items-center min-h-[40mm]">
                      <p className="text-[10px] font-black uppercase mb-8 opacity-70 text-center">Authorized Signatory for {firm.name}</p>
                      <div className="w-full border-t-2 border-black pt-2 text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest">Seal & Signature</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t-2 border-black break-inside-avoid">
                  <div className="grid grid-cols-1 text-[10px] text-black">
                    <p className="font-black uppercase mb-1 underline">Declaration & Terms:</p>
                    <p className="font-bold mb-3 opacity-90">{firm.declaration}</p>
                    <ul className="list-disc pl-6 grid grid-cols-2 gap-x-10 font-bold opacity-80">
                      {firm.terms.map((t, idx) => <li key={idx} className="mb-0.5">{t}</li>)}
                    </ul>
                  </div>
                  <p className="text-center font-black uppercase tracking-widest text-[9px] mt-4 py-2 border-t border-black">
                    Thank you for your business! Visit {firm.web} for support.
                  </p>
                </div>
              </>
            )}
            {!isLastPage && (
              <div className="mt-auto pt-4 border-t-2 border-black text-right">
                <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Continued on Page {pageIdx + 2}...</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InvoiceView;
