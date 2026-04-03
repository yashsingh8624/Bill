import React, { createContext, useContext } from 'react';
import { useBills } from './BillContext';

const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const billsRes = useBills() || {};
  const ledger = Array.isArray(billsRes.ledger) ? billsRes.ledger : [];

  // Transactions are now unified within the ledger.
  // This context is kept for backward compatibility.
  const transactions = ledger;

  const addTransaction = () => {
    console.warn('addTransaction is deprecated. Use context-specific methods instead.');
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
