import React, { useState } from 'react';
import Papa from 'papaparse';
import { Product } from '../types';
import { useApp } from '../AppContext';

interface BulkImportProps {
    onClose: () => void;
}

const BulkImport: React.FC<BulkImportProps> = ({ onClose }) => {
    const { addProduct, showAlert, products } = useApp();
    const [csvData, setCsvData] = useState<any[]>([]);
    const [error, setError] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                if (result.errors.length > 0) {
                    setError(`Error parsing CSV: ${result.errors[0].message}`);
                    return;
                }
                // Basic validation of columns
                const firstRow = result.data[0] as any;
                if (!firstRow || !firstRow.productName || !firstRow.rate) {
                    setError("Invalid CSV Format. Required columns: productName, rate, hsn, stock");
                    return;
                }
                setCsvData(result.data);
                setError('');
            },
            error: (err) => setError(err.message)
        });
    };

    const processImport = () => {
        if (csvData.length === 0) return;

        let successCount = 0;
        csvData.forEach((row: any) => {
            // Map CSV columns to Product type
            // Fallbacks included
            const newProduct: Product = {
                id: Math.random().toString(36).substr(2, 9),
                name: row.name || row.productName, // Full description
                productName: row.productName, // Short name
                description: row.description || '',
                type: (row.type?.toUpperCase() === 'SERVICES') ? 'SERVICES' : 'GOODS',
                hsn: row.hsn || '9999',
                rate: parseFloat(row.rate) || 0,
                unit: row.unit || 'NOS',
                stock: parseFloat(row.stock) || 0,
                gstPercent: parseFloat(row.gstPercent) || 18,
                alertThreshold: parseFloat(row.alertThreshold) || 10,
                warehouseId: row.warehouseId || '', // Optional
                packagingUnits: []
            };

            // Simple duplicate check by name (optional)
            const exists = products.find(p => p.productName.toLowerCase() === newProduct.productName.toLowerCase());
            if (!exists) {
                addProduct(newProduct);
                successCount++;
            }
        });

        showAlert(`Successfully imported ${successCount} products!`, "success");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-800">Bulk Import Inventory</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 font-bold">Close</button>
                </div>

                <div className="mb-6 p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center hover:bg-slate-100 transition-colors">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    <p className="mt-2 text-xs text-slate-400 font-bold">Supported Columns: productName, name, hsn, rate, stock, gstPercent, unit</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-black mb-4">
                        {error}
                    </div>
                )}

                {csvData.length > 0 && (
                    <div className="flex-1 overflow-auto border border-slate-200 rounded-xl mb-6">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 sticky top-0">
                                <tr>
                                    <th className="p-3">Product Name</th>
                                    <th className="p-3">HSN</th>
                                    <th className="p-3 text-right">Rate</th>
                                    <th className="p-3 text-right">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                {csvData.slice(0, 50).map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="p-3">{row.productName}</td>
                                        <td className="p-3">{row.hsn}</td>
                                        <td className="p-3 text-right">{row.rate}</td>
                                        <td className="p-3 text-right">{row.stock}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {csvData.length > 50 && <p className="p-2 text-center text-xs text-slate-400 italic">...and {csvData.length - 50} more items</p>}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-xs uppercase">Cancel</button>
                    <button
                        onClick={processImport}
                        disabled={csvData.length === 0}
                        className="px-8 py-3 rounded-xl font-black bg-blue-600 text-white shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all text-xs uppercase tracking-widest"
                    >
                        Import {csvData.length} Items
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkImport;
