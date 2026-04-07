'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { collection as fsCollection, doc as fsDoc, setDoc as fsSetDoc, onSnapshot as fsOnSnapshot, query as fsQuery, deleteDoc as fsDeleteDoc, orderBy as fsOrderBy } from 'firebase/firestore';
import type { CompanyProfile, Transaction, InventoryItem } from '@/lib/types';
import { INITIAL_COMPANY_PROFILE, CHART_OF_ACCOUNTS } from '@/lib/constants';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/auth-provider';
import { db } from '@/lib/firebase';

interface AppContextType {
  companyProfile: CompanyProfile;
  setCompanyProfile: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (txId: string, transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (txId: string) => Promise<void>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  resetData: () => Promise<void>;
  restoreBackupData: (data: any) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(INITIAL_COMPANY_PROFILE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Initialize date range
  useEffect(() => {
    setDateRange({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });
  }, []);

  // Sync with Firestore when user is authenticated
  useEffect(() => {
    if (!user) {
      setCompanyProfile(INITIAL_COMPANY_PROFILE);
      setTransactions([]);
      setInventory([]);
      return;
    }

    // Company Profile subscription
    const companyRef = fsDoc(db, `users/${user.uid}/companyProfile`, 'data');
    const unsubCompany = fsOnSnapshot(companyRef, (docSnap) => {
      if (docSnap.exists()) {
        setCompanyProfile(docSnap.data() as CompanyProfile);
      } else {
        setCompanyProfile(INITIAL_COMPANY_PROFILE);
      }
    });

    // Transactions subscription
    const txQuery = fsQuery(fsCollection(db, `users/${user.uid}/transactions`), fsOrderBy('date', 'desc'));
    const unsubTx = fsOnSnapshot(txQuery, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Transaction));
      setTransactions(txs);
    });

    // Inventory subscription
    const invRef = fsCollection(db, `users/${user.uid}/inventory`);
    const unsubInv = fsOnSnapshot(invRef, (snapshot) => {
      const invs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem));
      setInventory(invs);
    });

    return () => {
      unsubCompany();
      unsubTx();
      unsubInv();
    };
  }, [user]);

  // Intercept setCompanyProfile to also save to Firestore
  const updateCompanyProfileAndSave: React.Dispatch<React.SetStateAction<CompanyProfile>> = (action) => {
    setCompanyProfile((prev) => {
      const nextProfile = typeof action === 'function' ? action(prev) : action;
      if (user) {
        fsSetDoc(fsDoc(db, `users/${user.uid}/companyProfile`, 'data'), nextProfile)
          .catch(err => console.error('Error saving company profile', err));
      }
      return nextProfile;
    });
  };

  const applyStockChange = async (itemId: string, quantity: number, category: string, isReversal: boolean = false) => {
    if (!user) return;
    const account = CHART_OF_ACCOUNTS.find(a => a.name === category);
    const isStockReduction = account?.type === 'Revenue' || ['Beban Barang Rusak/Hilang', 'Beban Sampel/Promosi'].includes(category);
    
    // Fetch latest directly from Firestore to avoid race conditions when updating and reversing sequentially
    const { getDoc } = await import('firebase/firestore');
    const itemSnap = await getDoc(fsDoc(db, `users/${user.uid}/inventory`, itemId));
    if (itemSnap.exists()) {
      const itemData = itemSnap.data() as InventoryItem;
      let newStock = itemData.stock;
      
      let delta = quantity;
      
      if (category !== 'Persediaan Barang Dagang' && !isStockReduction) return; // Note: We only track stock for specific categories
      
      if (isStockReduction) delta = -delta;
      if (isReversal) delta = -delta;
      
      newStock += delta;
      await fsSetDoc(fsDoc(db, `users/${user.uid}/inventory`, itemId), { ...itemData, stock: newStock }, { merge: true });
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    
    const newTxId = `TRN${Date.now()}`;
    const newTransaction = { ...transaction, id: newTxId } as Transaction;
    
    // Sanitize undefined fields for Firestore
    const cleanTransaction = Object.fromEntries(
      Object.entries(newTransaction).filter(([_, v]) => v !== undefined)
    );
    
    try {
      await fsSetDoc(fsDoc(db, `users/${user.uid}/transactions`, newTxId), cleanTransaction);
      
      if (newTransaction.items && newTransaction.items.length > 0) {
        for (const item of newTransaction.items) {
          await applyStockChange(item.itemId, item.quantity, newTransaction.category);
        }
      } else if (newTransaction.itemId && newTransaction.quantity) {
         await applyStockChange(newTransaction.itemId, newTransaction.quantity, newTransaction.category);
      }
    } catch (err) {
      console.error('Error adding transaction', err);
    }
  };

  const updateTransaction = async (txId: string, updatedTransaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    
    const cleanTransaction = Object.fromEntries(
      Object.entries({ ...updatedTransaction, id: txId }).filter(([_, v]) => v !== undefined)
    );

    try {
      const oldTx = transactions.find(t => t.id === txId);
      
      // Reverse old transaction stock
      if (oldTx && oldTx.items && oldTx.items.length > 0) {
        for (const item of oldTx.items) {
          await applyStockChange(item.itemId, item.quantity, oldTx.category, true);
        }
      } else if (oldTx && oldTx.itemId && oldTx.quantity) {
        await applyStockChange(oldTx.itemId, oldTx.quantity, oldTx.category, true);
      }
      
      // Update transaction doc
      await fsSetDoc(fsDoc(db, `users/${user.uid}/transactions`, txId), cleanTransaction);
      
      // Apply new transaction stock
      if (updatedTransaction.items && updatedTransaction.items.length > 0) {
        for (const item of updatedTransaction.items) {
          await applyStockChange(item.itemId, item.quantity, updatedTransaction.category);
        }
      } else if (updatedTransaction.itemId && updatedTransaction.quantity) {
        await applyStockChange(updatedTransaction.itemId, updatedTransaction.quantity, updatedTransaction.category);
      }
    } catch (err) {
      console.error('Error updating transaction', err);
    }
  };

  const deleteTransaction = async (txId: string) => {
    if (!user) return;
    try {
      const oldTx = transactions.find(t => t.id === txId);
      // Reverse old transaction stock before deleting
      if (oldTx && oldTx.items && oldTx.items.length > 0) {
        for (const item of oldTx.items) {
          await applyStockChange(item.itemId, item.quantity, oldTx.category, true);
        }
      } else if (oldTx && oldTx.itemId && oldTx.quantity) {
        await applyStockChange(oldTx.itemId, oldTx.quantity, oldTx.category, true);
      }
      await fsDeleteDoc(fsDoc(db, `users/${user.uid}/transactions`, txId));
    } catch (err) {
      console.error('Error deleting transaction', err);
    }
  };


  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    if (!user) return;
    const newId = `INV${String(inventory.length + 100).padStart(3, '0')}-${Date.now()}`;
    const cleanItem = Object.fromEntries(
      Object.entries({ ...item, id: newId }).filter(([_, v]) => v !== undefined)
    );
    try {
      await fsSetDoc(fsDoc(db, `users/${user.uid}/inventory`, newId), cleanItem);
    } catch (err) {
      console.error('Error adding inventory item', err);
    }
  };

  const updateInventoryItem = async (updatedItem: InventoryItem) => {
    if (!user) return;
    const cleanItem = Object.fromEntries(
      Object.entries(updatedItem).filter(([_, v]) => v !== undefined)
    );
    try {
      await fsSetDoc(fsDoc(db, `users/${user.uid}/inventory`, updatedItem.id), cleanItem);
    } catch (err) {
      console.error('Error updating inventory item', err);
    }
  };

  const deleteInventoryItem = async (itemId: string) => {
    if (!user) return;
    try {
      await fsDeleteDoc(fsDoc(db, `users/${user.uid}/inventory`, itemId));
    } catch (err) {
      console.error('Error deleting inventory item', err);
    }
  };

  const resetData = async () => {
    if (!user) return;
    try {
      // 1. Reset Company Profile
      await fsSetDoc(fsDoc(db, `users/${user.uid}/companyProfile`, 'data'), INITIAL_COMPANY_PROFILE);
      
      // 2. Clear all transactions
      const txSnapshot = await import('firebase/firestore').then(m => m.getDocs(fsQuery(fsCollection(db, `users/${user.uid}/transactions`))));
      const txDeletes = txSnapshot.docs.map(doc => fsDeleteDoc(doc.ref));
      await Promise.all(txDeletes);
      
      // 3. Clear all inventory
      const invSnapshot = await import('firebase/firestore').then(m => m.getDocs(fsQuery(fsCollection(db, `users/${user.uid}/inventory`))));
      const invDeletes = invSnapshot.docs.map(doc => fsDeleteDoc(doc.ref));
      await Promise.all(invDeletes);

    } catch (err) {
       console.error('Error resetting data', err);
    }
  };

  const restoreBackupData = async (data: any) => {
    if (!user) return;
    try {
      // 1. Restore Company Profile
      if (data.companyProfile) {
        await fsSetDoc(fsDoc(db, `users/${user.uid}/companyProfile`, 'data'), data.companyProfile);
      }

      // 2. Restore Transactions
      if (data.transactions && Array.isArray(data.transactions)) {
        const txPromises = data.transactions.map((tx: any) => {
           const cleanTx = Object.fromEntries(Object.entries(tx).filter(([_, v]) => v !== undefined));
           return fsSetDoc(fsDoc(db, `users/${user.uid}/transactions`, tx.id), cleanTx);
        });
        await Promise.all(txPromises);
      }

      // 3. Restore Inventory
      if (data.inventory && Array.isArray(data.inventory)) {
        const invPromises = data.inventory.map((inv: any) => {
           const cleanInv = Object.fromEntries(Object.entries(inv).filter(([_, v]) => v !== undefined));
           return fsSetDoc(fsDoc(db, `users/${user.uid}/inventory`, inv.id), cleanInv);
        });
        await Promise.all(invPromises);
      }
    } catch (err) {
      console.error('Error restoring backup data', err);
      throw err;
    }
  };

  const value = {
    companyProfile,
    setCompanyProfile: updateCompanyProfileAndSave,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    setTransactions, // Local override allowed but not synced automatically. Used by certain views or we can just ignore.
    inventory,
    setInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    dateRange,
    setDateRange,
    resetData,
    restoreBackupData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
