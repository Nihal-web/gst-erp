
import { Product, Customer, FirmSettings } from './types';

export const DEFAULT_FIRM_SETTINGS: FirmSettings = {
  name: '',
  tagline: '',
  address: '',
  pan: '',
  gstin: '',
  phone: '',
  web: '',
  email: '',
  bankName: '',
  bankBranch: '',
  accNumber: '',
  ifsc: '',
  upiId: '',
  terms: [
    "E & O.E.",
    "Subject to Uttar Pradesh Jurisdiction.",
    "Our Responsibility Ceases as soon as goods leave our Premises.",
    "Goods once sold will not be taken back."
  ],
  state: '',
  stateCode: '',
  declaration: ''
};

export const INITIAL_PRODUCTS: Product[] = [];


export const INITIAL_CUSTOMERS: Customer[] = [];

export const GST_STATES = [
  { name: "ANDAMAN AND NICOBAR ISLANDS", code: "35" },
  { name: "ANDHRA PRADESH", code: "28" },
  { name: "ANDHRA PRADESH (NEW)", code: "37" },
  { name: "ARUNACHAL PRADESH", code: "12" },
  { name: "ASSAM", code: "18" },
  { name: "BIHAR", code: "10" },
  { name: "CHANDIGARH", code: "04" },
  { name: "CHATTISGARH", code: "22" },
  { name: "DADRA AND NAGAR HAVELI", code: "26" },
  { name: "DAMAN AND DIU", "code": "25" },
  { name: "DELHI", code: "07" },
  { name: "GOA", code: "30" },
  { name: "GUJARAT", code: "24" },
  { name: "HARYANA", code: "06" },
  { name: "HIMACHAL PRADESH", code: "02" },
  { name: "JAMMU AND KASHMIR", code: "01" },
  { name: "JHARKHAND", code: "20" },
  { name: "KARNATAKA", code: "29" },
  { name: "KERALA", code: "32" },
  { name: "LAKSHADWEEP ISLANDS", code: "31" },
  { name: "MADHYA PRADESH", code: "23" },
  { name: "MAHARASHTRA", code: "27" },
  { name: "MANIPUR", code: "14" },
  { name: "MEGHALAYA", code: "17" },
  { name: "MIZORAM", code: "15" },
  { name: "NAGALAND", code: "13" },
  { name: "ODISHA", code: "21" },
  { name: "PONDICHERRY", code: "34" },
  { name: "PUNJAB", code: "03" },
  { name: "RAJASTHAN", code: "08" },
  { name: "SIKKIM", code: "11" },
  { name: "TAMIL NADU", code: "33" },
  { name: "TELANGANA", code: "36" },
  { name: "TRIPURA", code: "16" },
  { name: "UTTAR PRADESH", code: "09" },
  { name: "UTTARAKHAND", code: "05" },
  { name: "WEST BENGAL", code: "19" }
];
