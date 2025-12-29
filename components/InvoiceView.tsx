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

  const ITEMS_PER_PAGE = 14; // Increased items per page for efficiency

  // Chunk items into pages
  const pages = [];
  for (let i = 0; i < invoice.items.length; i += ITEMS_PER_PAGE) {
    pages.push(invoice.items.slice(i, i + ITEMS_PER_PAGE));
  }

  // If no items, show at least one blank page
  if (pages.length === 0) pages.push([]);

  return (
    <div className="flex flex-col gap-8 print:block print:gap-0">
      {/* Print-specific style overrides and RGB Color enforcement for html2canvas */}
      <style>{`
        @media print {
          .print-break-after { break-after: page; }
        }
        /* Override Tailwind v4 OKLCH colors with standard HEX for html2canvas compatibility */
        .bg-black { background-color: #000000 !important; }
        .text-black { color: #000000 !important; }
        .bg-white { background-color: #ffffff !important; }
        .text-white { color: #ffffff !important; }
        .border-black { border-color: #000000 !important; }
        .border-white { border-color: #ffffff !important; }
        .border-gray-300 { border-color: #d1d5db !important; }
        .border-gray-400 { border-color: #9ca3af !important; }
        
        .invoice-table th, .invoice-table td {
          border-right: 1.5px solid #000;
          padding: 4px 6px;
        }
        .invoice-table th:last-child, .invoice-table td:last-child {
          border-right: none;
        }
        .invoice-table tr {
          border-bottom: 1.5px solid #000;
        }
        .invoice-table {
          border: 1.5px solid #000;
          border-collapse: collapse;
          width: 100%;
          font-size: 11px;
        }
      `}</style>

      {pages.map((itemChunk, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;

        return (
          <div
            key={pageIdx}
            className="bg-white text-black font-sans box-border mx-auto print-break-after"
            style={{
              width: '210mm',
              height: '297mm',
              padding: '10mm',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {/* Top Content Wrapper */}
            <div className="flex-grow flex flex-col">

              {/* --- HEADER (Grid) --- */}
              <div className="grid grid-cols-2 gap-4 mb-4 border-b-[1.5px] border-black pb-4">
                <div className="pr-4">
                  <h1 className="text-3xl font-black uppercase mb-1 tracking-tight">{firm.name}</h1>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-3 opacity-75">{firm.tagline}</p>
                  <div className="text-[10px] leading-snug font-medium">
                    <p>{firm.address}</p>
                    <p className="mt-1">
                      GSTIN: <span className="font-bold">{firm.gstin}</span> &nbsp;|&nbsp;
                      PAN: <span className="font-bold">{firm.pan}</span>
                    </p>
                    <p>Ph: {firm.phone} | {firm.email}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <div className="bg-black text-white px-6 py-2 font-black text-sm uppercase tracking-widest mb-3">
                    {getInvoiceTitle()}
                  </div>
                  <div className="w-full">
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 text-[10px] text-right justify-end items-center">
                      <span className="font-bold opacity-60 uppercase tracking-wide">Invoice No:</span>
                      <span className="font-black text-sm">{invoice.invoiceNo}</span>

                      <span className="font-bold opacity-60 uppercase tracking-wide">Date:</span>
                      <span className="font-bold text-sm">{invoice.date}</span>

                      <span className="font-bold opacity-60 uppercase tracking-wide">Place of Supply:</span>
                      <span className="font-bold">{invoice.customer.state}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- BILL TO (Grid) --- */}
              <div className="grid grid-cols-2 border-[1.5px] border-black mb-4">
                <div className="p-3 border-r-[1.5px] border-black">
                  <p className="text-[9px] font-black uppercase opacity-50 mb-1 tracking-wider">Billed To</p>
                  <h2 className="text-sm font-black uppercase mb-1">{invoice.customer.name}</h2>
                  <div className="text-[10px] leading-tight font-medium opacity-90">
                    <p>{invoice.customer.address}</p>
                    <p className="mt-1">GSTIN: <span className="font-bold">{invoice.customer.gstin}</span></p>
                    <p>State: {invoice.customer.state} ({invoice.customer.stateCode})</p>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[9px] font-black uppercase opacity-50 mb-2 tracking-wider">Details</p>
                  <div className="flex flex-col gap-1 text-[10px]">
                    <div className="flex justify-between border-b border-dashed border-gray-400 pb-1">
                      <span className="opacity-70 uppercase text-[9px] font-bold">Reverse Charge</span>
                      <span className="font-bold">{invoice.isReverseCharge ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-gray-400 pb-1">
                      <span className="opacity-70 uppercase text-[9px] font-bold">Vehicle/Transport</span>
                      <span className="font-bold">{invoice.transport || 'NA'}</span>
                    </div>
                    {invoice.poNo && (
                      <div className="flex justify-between border-b border-dashed border-gray-400 pb-1">
                        <span className="opacity-70 uppercase text-[9px] font-bold">PO No</span>
                        <span className="font-bold">{invoice.poNo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- ITEMS TABLE --- */}
              <div className="flex-grow">
                <table className="invoice-table">
                  <thead>
                    <tr className="bg-black text-white uppercase text-[9px] font-bold tracking-wider">
                      <th className="w-10 text-center py-2">Sr</th>
                      <th className="text-left py-2 pl-2">Description</th>
                      <th className="w-20 text-center py-2">HSN/SAC</th>
                      <th className="w-14 text-center py-2">Qty</th>
                      <th className="w-14 text-right py-2">Unit</th>
                      <th className="w-24 text-right py-2">Rate</th>
                      <th className="w-28 text-right py-2 pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemChunk.map((item, idx) => (
                      <tr key={idx}>
                        <td className="text-center font-bold">{(pageIdx * ITEMS_PER_PAGE) + idx + 1}</td>
                        <td className="py-2 pl-2">
                          <p className="font-bold text-[10px]">{item.productName}</p>
                          <p className="text-[8px] opacity-60 mt-0.5 tracking-wide">
                            {isInterState ? `IGST: ${item.gstPercent}%` : `CGST:${item.gstPercent / 2}% | SGST:${item.gstPercent / 2}%`}
                          </p>
                        </td>
                        <td className="text-center font-bold">{item.hsn || item.sac}</td>
                        <td className="text-center font-bold">{item.qty}</td>
                        <td className="text-right text-[9px] uppercase">{item.unit}</td>
                        <td className="text-right">{formatCurrency(item.rate)}</td>
                        <td className="text-right font-black pr-2">{formatCurrency(item.taxableValue)}</td>
                      </tr>
                    ))}
                    {/* Fill empty rows if needed to maintain structure */}
                    {Array.from({ length: Math.max(0, 5 - itemChunk.length) }).map((_, i) => (
                      <tr key={`empty-${i}`} style={{ height: '24px' }}>
                        <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- FOOTER SECTION --- */}
            <div>
              {isLastPage ? (
                <div className="mt-4 border-[1.5px] border-black text-[10px]">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-[2fr_1fr] border-b-[1.5px] border-black">
                    {/* Bottom Left: Words & Bank */}
                    <div className="p-3 border-r-[1.5px] border-black flex flex-col justify-between">
                      <div>
                        <p className="uppercase opacity-50 text-[8px] font-bold tracking-wider">Amount in Words</p>
                        <p className="font-black italic text-sm mt-1">{numberToWords(invoice.totalAmount)}</p>
                      </div>

                      <div className="mt-6 flex gap-8">
                        <div className="flex-1">
                          <p className="font-black uppercase mb-2 border-b border-black inline-block text-[9px]">Bank Details</p>
                          <div className="grid grid-cols-[auto_1fr] gap-x-2 text-[10px]">
                            <span className="opacity-70 font-bold">Bank:</span> <span className="font-bold">{firm.bankName}</span>
                            <span className="opacity-70 font-bold">A/c No:</span> <span className="font-bold">{firm.accNumber}</span>
                            <span className="opacity-70 font-bold">IFSC:</span> <span className="font-bold">{firm.ifsc}</span>
                          </div>
                        </div>
                        <div className="flex-1 border-l border-gray-300 pl-4">
                          <p className="font-black uppercase mb-2 border-b border-black inline-block text-[9px]">Terms & Conditions</p>
                          <ul className="list-disc pl-3 leading-tight opacity-80 text-[9px]">
                            {firm.terms.slice(0, 2).map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Right: Totals */}
                    <div>
                      <div className="flex justify-between p-2 border-b border-gray-300">
                        <span className="font-bold opacity-80">Taxable Amount</span>
                        <span className="font-bold">{formatCurrency(invoice.totalTaxable)}</span>
                      </div>
                      <div className="flex justify-between p-2 border-b border-gray-300">
                        <span className="font-bold opacity-80">Total Tax</span>
                        <span className="font-bold">{formatCurrency(invoice.items.reduce((acc, item) => acc + (item.taxableValue * item.gstPercent / 100), 0))}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-black text-white items-center mt-[-1px]">
                        <span className="font-black text-xl tracking-widest">TOTAL</span>
                        <span className="font-black text-xl">₹{formatCurrency(invoice.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="flex justify-between items-end p-4 h-28">
                    <div className="w-1/2 text-[9px] opacity-70 leading-relaxed">
                      <p className="font-bold underline mb-1">Declaration:</p>
                      <p>{firm.declaration}</p>
                    </div>
                    <div className="w-1/3 flex flex-col items-center justify-end h-full">
                      <p className="font-bold uppercase text-[9px] mb-8 text-center">For {firm.name}</p>
                      <div className="border-t border-black w-full pt-1 font-bold uppercase text-[9px] text-center tracking-wider"> Authorized Signatory </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-center text-[10px] font-bold italic opacity-60">
                  Continued on next page...
                </div>
              )}

              {/* Static Page Count */}
              <div className="text-right text-[9px] font-bold opacity-40 mt-2">
                Page {pageIdx + 1} of {pages.length}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default InvoiceView;
