'use client';

import React, { createContext, useState, ReactNode } from 'react';
import type { CompanyProfile, Transaction, InventoryItem } from '@/lib/types';
import { MOCK_TRANSACTIONS, MOCK_INVENTORY, INITIAL_COMPANY_PROFILE } from '@/lib/constants';

interface AppContextType {
  companyProfile: CompanyProfile;
  setCompanyProfile: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  resetData: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(INITIAL_COMPANY_PROFILE);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `TRN${String(transactions.length + 1).padStart(3, '0')}`,
    };
    setTransactions(prev => [newTransaction, ...prev]);

    // Update inventory if it's a sale or purchase of goods
    if (newTransaction.itemId && newTransaction.quantity) {
      const quantityChange = newTransaction.quantity;

      if (newTransaction.category === 'Pendapatan Penjualan') {
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

  const resetData = () => {
    setCompanyProfile(INITIAL_COMPANY_PROFILE);
    setTransactions(MOCK_TRANSACTIONS);
    setInventory(MOCK_INVENTORY);
  };

  const value = {
    companyProfile,
    setCompanyProfile,
    transactions,
    addTransaction,
    inventory,
    setInventory,
    resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
