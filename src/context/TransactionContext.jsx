import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';

const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  // transactions: [{ id, type, entityId, billId, amount, date, notes }]
  const [transactions, setTransactions] = useState(() => safeGet('smartbill_transactions', []));

  useEffect(() => {
    safeSet('smartbill_transactions', transactions);
  }, [transactions]);

  const addTransaction = (t) => {
    const newTx = { ...t, id: generateId() };
    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  const getTransactionsByEntityId = (entityId) => transactions.filter(t => t.entityId === entityId);
  const getTransactionsByBillId = (billId) => transactions.filter(t => t.billId === billId);

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
