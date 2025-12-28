
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
  terms: [],
  state: '',
  stateCode: '',
  declaration: ''
};

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [];
