
import { Product, Customer, FirmSettings } from './types';

export const DEFAULT_FIRM_SETTINGS: FirmSettings = {
  name: 'GUJARAT FREIGHT TOOLS',
  tagline: 'Manufacturing & Supply of Precision Press Tool & Room Component',
  address: 'Plot No A 64, Road No 21, Waghle Indl Estate, Mumbai, Maharashtra - 400604',
  pan: '26CORPP3939N1',
  gstin: '27AAACG1234A1Z1',
  phone: '02225820309',
  web: 'www.logobuild.com',
  email: 'info@gft.com',
  bankName: 'ICICI',
  bankBranch: 'Surate',
  accNumber: '2715500356',
  ifsc: 'ICIC045F',
  upiId: 'ifox@icici',
  terms: [
    'Subject to Maharashtra Junction.',
    'Our Responsibility Ceases as soon as goods leaves our Premises.',
    'Goods once sold will not be taken back.',
    'Delivery Ex-Premises.'
  ],
  state: 'Maharashtra',
  stateCode: '27',
  declaration: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.'
};

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Shiv Engineering', address: 'Sumel Business Park 7, Kochi, Kerala - 380023', phone: '9878789878', gstin: '32AABBA7890B1ZB', state: 'Kerala', stateCode: '32' },
  { id: '2', name: 'Reliance Industries', address: 'Nariman Point, Mumbai, MH', phone: '9000010000', gstin: '27AAAAR1000A1Z1', state: 'Maharashtra', stateCode: '27' },
];
