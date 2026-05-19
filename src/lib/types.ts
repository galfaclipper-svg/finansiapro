export type ReportRecipient = {
  id: string;
  name: string;
  whatsapp?: string;
  email?: string;
};

export type CompanyProfile = {
  name: string;
  address: string;
  logoUrl?: string;
  contact?: string;
  reportRecipients?: ReportRecipient[];
};

export type Account = {
  id: string;
  name: string;
  type: 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Expenses';
  category: 'Current Assets' | 'Fixed Assets' | 'Intangible Assets' | 'Current Liabilities' | 'Long-term Liabilities' | 'Owner Equity' | 'Sales Revenue' | 'Other Revenue' | 'Cost of Goods Sold' | 'Operating Expenses';
};

export type TransactionItem = {
  itemId: string;
  quantity: number;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'cash-in' | 'cash-out' | 'transfer';
  accountId: string;
  toAccountId?: string;
  category: string;
  itemId?: string;
  quantity?: number;
  items?: TransactionItem[];
  usefulLifeInMonths?: number;
  salvageValue?: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  costPerUnit: number;
};

export type BusinessType = 'jasa' | 'retail' | 'manufaktur';

export type PlannerProduct = {
  id: string;
  name: string;
  hargaBeli: number;
  qty: number;
  kemasan: number;
  hpp: number;
  recommendedPrice: number;
};

export interface PlannerState {
  businessType: BusinessType;
  totalHpp: number;
  recommendedPrice: number;
  
  // HPP Data
  isMultiProduct: boolean;
  globalOngkir: number;
  multiProducts: PlannerProduct[];
  
  jasaData: { jamKerja: number, tarifPerJam: number, material: number };
  retailData: { hargaBeli: number, totalOngkir: number, jumlahItemOngkir: number, kemasan: number };
  manufakturData: { bahanBaku: number, tenagaKerja: number, overhead: number };
  
  // Pricing Data
  pricingMethod: 'markup' | 'margin';
  pricingPercentage: number;
  
  // Analysis Data
  fixedCosts: number;
  investment: number;
  targetUnits: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number; // percentage
  taxAmount: number;
  discount: number; // nominal
  total: number;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
};
