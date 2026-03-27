'use client';

import React, { createContext, useState, ReactNode } from 'react';
import type { CompanyProfile, Transaction, InventoryItem } from '@/lib/types';
import { INITIAL_COMPANY_PROFILE, CHART_OF_ACCOUNTS } from '@/lib/constants';
import type { DateRange } from 'react-day-picker';

interface AppContextType {
  companyProfile: CompanyProfile;
  setCompanyProfile: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  resetData: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(INITIAL_COMPANY_PROFILE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    // Initialize date range on client to avoid hydration mismatch
    setDateRange({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });
  }, []);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `TRN${Date.now()}`,
    };
    setTransactions(prev => [newTransaction, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    // Update inventory if it's a sale or purchase of goods
    if (newTransaction.itemId && newTransaction.quantity) {
      const quantityChange = newTransaction.quantity;
      const isSale = CHART_OF_ACCOUNTS.find(a => a.name === newTransaction.category)?.type === 'Revenue';

      if (isSale) {
        setInventory(prev => prev.map(item =>
          item.id === newTransaction.itemId
            ? { ...item, stock: item.stock - quantityChange }
            : item
        ));
      } else if (newTransaction.category === 'Persediaan Barang Dagang') {
        setInventory(prev => prev.map(item =>
          item.id === newTransaction.itemId
            ? { ...item, stock: item.stock + quantityChange }
            : item
        ));
      }
    }
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: `INV${String(inventory.length + 100).padStart(3, '0')}-${Date.now()}`, // More robust ID
    };
    setInventory(prev => [newItem, ...prev]);
  };

  const updateInventoryItem = (updatedItem: InventoryItem) => {
    setInventory(prev =>
      prev.map(item => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const deleteInventoryItem = (itemId: string) => {
    setInventory(prev => prev.filter(item => item.id !== itemId));
  };


  const resetData = () => {
    setCompanyProfile(INITIAL_COMPANY_PROFILE);
    setTransactions([]);
    setInventory([]);
     setDateRange({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });
  };

  const value = {
    companyProfile,
    setCompanyProfile,
    transactions,
    addTransaction,
    setTransactions,
    inventory,
    setInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    dateRange,
    setDateRange,
    resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
