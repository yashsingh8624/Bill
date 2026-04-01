import React, { createContext, useContext } from 'react';
import { useBills } from './BillContext';

const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const billsRes = useBills() || {};
  const ledger = Array.isArray(billsRes.ledger) ? billsRes.ledger : [];

  // Transactions are now unified within the ledger table.
  // We keep this context solely for backward compatibility where needed.
  
  // Note: For historical reasons, entities might rely on 'transactions' directly
  // We bridge 'ledger' entries to look like 'transactions' if needed, or simply return the ledger.
  const transactions = ledger;

  const addTransaction = () => {
    console.warn('addTransaction is deprecated. Use addLedgerEntry from Supabase directly or via contexts.');
  };

  const deleteTransaction = () => {
    console.warn('deleteTransaction is deprecated. Soft-delete via ledger is_void flag instead.');
  }

  const getTransactionsByEntityId = (entityId) => 
    ledger.filter(t => t.customer_id === entityId || t.supplier_id === entityId);
  
  const getTransactionsByBillId = (billId) => 
    ledger.filter(t => t.invoice_id === billId);

  return (
    <TransactionContext.Provider value={{ 
      transactions, 
      addTransaction, 
      deleteTransaction,
      getTransactionsByEntityId, 
      getTransactionsByBillId 
    }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => useContext(TransactionContext);
