import type { Account, CompanyProfile, InventoryItem, NavItem, Transaction } from './types';
import { LayoutDashboard, ReceiptText, Package, LineChart, Settings } from 'lucide-react';

export const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: <ReceiptText size={20} />,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: <LineChart size={20} />,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: <Package size={20} />,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: <Settings size={20} />,
  },
];


export const CHART_OF_ACCOUNTS: Account[] = [
  // Assets
  { id: '1010', name: 'Cash', type: 'Assets', category: 'Current Assets' },
  { id: '1020', name: 'Bank', type: 'Assets', category: 'Current Assets' },
  { id: '1030', name: 'Accounts Receivable', type: 'Assets', category: 'Current Assets' },
  { id: '1040', name: 'Employee Receivables', type: 'Assets', category: 'Current Assets' },
  { id: '1050', name: 'Merchandise Inventory', type: 'Assets', category: 'Current Assets' },
  { id: '1100', name: 'Equipment', type: 'Assets', category: 'Fixed Assets' },

  // Liabilities
  { id: '2010', name: 'Accounts Payable', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2020', name: 'Salaries Payable', type: 'Liabilities', category: 'Current Liabilities' },
  { id: '2100', name: 'Bank Loan', type: 'Liabilities', category: 'Long-term Liabilities' },

  // Equity
  { id: '3010', name: "Owner's Capital", type: 'Equity', category: 'Owner Equity' },
  { id: '3020', name: 'Retained Earnings', type: 'Equity', category: 'Owner Equity' },

  // Revenue
  { id: '4010', name: 'Sales Revenue', type: 'Revenue', category: 'Sales Revenue' },
  { id: '4020', name: 'Bank Interest Income', type: 'Revenue', category: 'Other Revenue' },
  { id: '4030', name: 'Other Income', type: 'Revenue', category: 'Other Revenue' },

  // Expenses
  { id: '5010', name: 'Cost of Goods Sold', type: 'Expenses', category: 'Cost of Goods Sold' },
  { id: '5110', name: 'Shopee Ads', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5120', name: 'TikTok Ads', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5130', name: 'Instagram Ads', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5140', name: 'Endorsement Costs', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5210', name: 'Salaries Expense', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5220', name: 'Rent Expense', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5230', name: 'Bank Interest Expense', type: 'Expenses', category: 'Operating Expenses' },
  { id: '5990', name: 'Other Expenses', type: 'Expenses', category: 'Operating Expenses' },
];

export const COA_CATEGORIES = CHART_OF_ACCOUNTS.map(account => account.name);

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: 'FinansiaPro Demo Store',
  address: '123 E-Commerce Ave, Online City, 12345',
};

export const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'TRN001', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0], description: 'Sale of Product A', amount: 150.00, type: 'cash-in', accountId: '4010', category: 'Sales Revenue' },
    { id: 'TRN002', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0], description: 'TikTok Ads Campaign', amount: 50.00, type: 'cash-out', accountId: '5120', category: 'TikTok Ads' },
    { id: 'TRN003', date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0], description: 'Purchase of Inventory', amount: 300.00, type: 'cash-out', accountId: '1050', category: 'Merchandise Inventory' },
    { id: 'TRN004', date: new Date(new Date().setDate(new Date().getDate() - 4)).toISOString().split('T')[0], description: 'Sale of Product B', amount: 200.00, type: 'cash-in', accountId: '4010', category: 'Sales Revenue' },
    { id: 'TRN005', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0], description: 'Endorsement payment - Influencer X', amount: 100.00, type: 'cash-out', accountId: '5140', category: 'Endorsement Costs' },
    { id: 'TRN006', date: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0], description: 'Bank Interest', amount: 5.00, type: 'cash-in', accountId: '4020', category: 'Bank Interest Income' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
    { id: 'INV001', name: 'Product A', sku: 'PA-001', stock: 50, costPerUnit: 10.00, salePrice: 15.00 },
    { id: 'INV002', name: 'Product B', sku: 'PB-001', stock: 30, costPerUnit: 15.00, salePrice: 25.00 },
    { id: 'INV003', name: 'Product C', sku: 'PC-001', stock: 100, costPerUnit: 5.00, salePrice: 9.50 },
];
