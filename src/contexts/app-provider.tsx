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

    // Simplified inventory update
    if (transaction.category === 'Sales Revenue') {
      // Assuming a sale reduces stock of a random item for demo purposes
      const soldItemIndex = Math.floor(Math.random() * inventory.length);
      setInventory(prev => prev.map((item, index) => 
        index === soldItemIndex ? { ...item, stock: item.stock - 1 } : item
      ));
    } else if (transaction.category === 'Merchandise Inventory') {
      // Assuming a purchase increases stock of a random item
      const purchasedItemIndex = Math.floor(Math.random() * inventory.length);
       setInventory(prev => prev.map((item, index) => 
        index === purchasedItemIndex ? { ...item, stock: item.stock + 5 } : item
      ));
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
