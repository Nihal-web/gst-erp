
export enum StateCode {
  GUJARAT = '24',
  MAHARASHTRA = '27',
  KERALA = '32',
  DELHI = '07',
}

export enum InvoiceType {
  GOODS = 'GOODS',
  SERVICES = 'SERVICES',
  EXPORT = 'EXPORT',
  REVERSE_CHARGE = 'REVERSE_CHARGE',
  ISD = 'ISD'
}

export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN', // Super Admin (System Owner)
  ADMIN = 'ADMIN', // Shop Owner
  SALES = 'SALES', // Billing only
  ACCOUNTANT = 'ACCOUNTANT' // Reports only
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shopName: string;
  status?: 'active' | 'suspended';
  plan?: 'free' | 'pro' | 'enterprise';
}

export interface Product {
  id: string;
  warehouseId?: string;
  name: string;
  hsn: string;
  sac?: string;
  rate: number;
  unit: string;
  stock: number;
  gstPercent: number;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capability: string; // 'Storage', 'Distribution', 'Cold Storage'
  manager?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  change: number;
  newStock?: number;
  date: string;
  reason: string;
  user: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  gstin: string;
  state: string;
  stateCode: string;
  country?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  hsn: string;
  sac?: string;
  qty: number;
  rate: number;
  unit: string;
  taxableValue: number;
  gstPercent: number;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  invoiceNo: string;
  date: string;
  challanNo?: string;
  challanDate?: string;
  eWayBillNo?: string;
  shippingBillNo?: string;
  shippingBillDate?: string;
  transport?: string;
  transportId?: string;
  customer: Customer;
  items: InvoiceItem[];
  totalTaxable: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  totalAmount: number;
  isPaid: boolean;
  isReverseCharge?: boolean;
  exportType?: 'WITH_PAYMENT' | 'WITHOUT_PAYMENT';
}

export interface FirmSettings {
  name: string;
  tagline: string;
  address: string;
  pan: string;
  gstin: string;
  phone: string;
  web: string;
  email: string;
  bankName: string;
  bankBranch: string;
  accNumber: string;
  ifsc: string;
  upiId: string;
  terms: string[];
  state: string;
  stateCode: string;
  declaration: string;
}
