import { Invoice, InvoiceType } from '../types';

export const validateGSTIN = (gstin: string): boolean => {
    const regex = /\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/;
    return regex.test(gstin);
};

export const generateEWayBillJSON = (invoice: Invoice, firmGstin: string) => {
    // Map internal Invoice object to NIC E-Way Bill JSON Schema (Version 1.03)

    const isExport = invoice.type === InvoiceType.EXPORT;

    const data = {
        "Version": "1.0.0519",
        "BillLists": [
            {
                "userGstin": firmGstin,
                "supplyType": isExport ? "O" : "O", // O = Outward
                "subSupplyType": isExport ? "3" : "1", // 1 = Supply, 3 = Export
                "docType": "INV",
                "docNo": invoice.invoiceNo,
                "docDate": formatDateByType(invoice.date),
                "fromGstin": firmGstin,
                "fromTrdName": "MY FIRM", // Should come from settings
                "fromAddr1": "Address Line 1",
                "fromPlace": "City",
                "fromPincode": 100000,
                "fromStateCode": parseInt(firmGstin.substring(0, 2)),
                "actBoundStateCode": parseInt(firmGstin.substring(0, 2)),
                "toGstin": isExport ? "URP" : invoice.customer.gstin,
                "toTrdName": invoice.customer.name,
                "toAddr1": invoice.customer.address,
                "toPlace": invoice.customer.state,
                "toPincode": 100000, // Placeholder
                "toStateCode": parseInt(invoice.customer.stateCode),
                "totalValue": invoice.totalTaxable,
                "cgstValue": invoice.cgst || 0,
                "sgstValue": invoice.sgst || 0,
                "igstValue": invoice.igst || 0,
                "cessValue": 0,
                "totInvValue": invoice.totalAmount,
                "transMode": "1", // 1 = Road
                "transDistance": "0",
                "itemList": invoice.items.map(item => ({
                    "productName": item.productName,
                    "productDesc": item.productName,
                    "hsnCode": parseInt(item.hsn.replace(/\D/g, '')),
                    "quantity": item.qty,
                    "qtyUnit": item.unit,
                    "taxableAmount": item.taxableValue,
                    "sgstRate": (invoice.igst ? 0 : item.gstPercent / 2),
                    "cgstRate": (invoice.igst ? 0 : item.gstPercent / 2),
                    "igstRate": (invoice.igst ? item.gstPercent : 0),
                    "cessRate": 0
                }))
            }
        ]
    };

    return data;
};

// Helper: Convert "12 October 2024" to "12/10/2024"
const formatDateByType = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "01/01/2024";
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};
