export type CompanyProfile = {
  name: string;
  address: string;
  logoUrl?: string;
  contact?: string;
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
  type: 'cash-in' | 'cash-out';
  accountId: string;
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
