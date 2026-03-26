import type { Account, CompanyProfile, InventoryItem, Transaction } from './types';

export const CHART_OF_ACCOUNTS: Account[] = [
  // Aset
  { id: '1010', name: 'Kas', type: 'Assets', category: 'Current Assets' },
  { id: '1020', name: 'Bank', type: 'Assets', category: 'Current Assets' },
  { id: '1030', name: 'Piutang Usaha', type: 'Assets', category: 'Current Assets' },
  { id: '1040', name: 'Piutang Karyawan', type: 'Assets', category: 'Current Assets' },
  { id: '1050', name: 'Persediaan Barang Dagang', type: 'Assets', category: 'Current Assets' },
  { id: '1100', name: 'Peralatan', type: 'Assets', category: 'Fixed Assets' },

  // Kewajiban
  { id: '2010', name: 'Utang Usaha', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2020', name: 'Utang Gaji', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2100', name: 'Utang Bank', type: 'Liabilities', category: 'Long-term Liabilities' },

  // Ekuitas
  { id: '3010', name: 'Modal Pemilik', type: 'Equity', category: 'Owner Equity' },
  { id: '3020', name: 'Laba Ditahan', type: 'Equity', category: 'Owner Equity' },

  // Pendapatan
  { id: '4010', name: 'Pendapatan Penjualan', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4011', name: 'Pendapatan Penjualan (Shopee)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4012', name: 'Pendapatan Penjualan (TikTok)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4013', name: 'Pendapatan Penjualan (Facebook)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4014', name: 'Pendapatan Penjualan (lynk.id)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4015', name: 'Pendapatan Penjualan (WhatsApp)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4016', name: 'Pendapatan Penjualan (Website)', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4020', name: 'Pendapatan Bunga Bank', type: 'Revenue', category: 'Other Revenue' },
  { id: '4030', name: 'Pendapatan Lain-lain', type: 'Revenue', category: 'Other Revenue' },
  { id: '4031', name: 'Pendapatan Produk Lainnya', type: 'Revenue', category: 'Other Revenue' },


  // Beban
  { id: '5010', name: 'Harga Pokok Penjualan', type: 'Expenses', category: 'Cost of Goods Sold' },
  { id: '5110', name: 'Iklan Shopee', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5120', name: 'Iklan TikTok', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5130', name: 'Iklan Instagram', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5140', name: 'Biaya Endorsement', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5210', name: 'Beban Gaji', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5220', name: 'Beban Sewa', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5230', name: 'Beban Bunga Bank', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5990', name: 'Beban Lain-lain', type: 'Expenses', category: 'Operating Expenses' },
];

export const COA_CATEGORIES = CHART_OF_ACCOUNTS.map(account => account.name);

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: 'FinansiaPro Demo Store',
  address: '123 E-Commerce Ave, Online City, 12345',
};

export const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'TRN001', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0], description: 'Sale of Product A', amount: 150.00, type: 'cash-in', accountId: '4010', category: 'Pendapatan Penjualan' },
    { id: 'TRN002', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0], description: 'TikTok Ads Campaign', amount: 50.00, type: 'cash-out', accountId: '5120', category: 'Iklan TikTok' },
    { id: 'TRN003', date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0], description: 'Purchase of Inventory', amount: 300.00, type: 'cash-out', accountId: '1050', category: 'Persediaan Barang Dagang' },
    { id: 'TRN004', date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString().split('T')[0], description: 'Sale of Product B', amount: 200.00, type: 'cash-in', accountId: '4010', category: 'Pendapatan Penjualan' },
    { id: 'TRN005', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0], description: 'Endorsement payment - Influencer X', amount: 100.00, type: 'cash-out', accountId: '5140', category: 'Biaya Endorsement' },
    { id: 'TRN006', date: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0], description: 'Bank Interest', amount: 5.00, type: 'cash-in', accountId: '4020', category: 'Pendapatan Bunga Bank' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'INV001', name: 'Product A', sku: 'PA-001', stock: 50, costPerUnit: 10.00, salePrice: 15.00 },
    { id: 'INV002', name: 'Product B', sku: 'PB-001', stock: 30, costPerUnit: 15.00, salePrice: 25.00 },
    { id: 'INV003', name: 'Product C', sku: 'PC-001', stock: 100, costPerUnit: 5.00, salePrice: 9.50 },
];
