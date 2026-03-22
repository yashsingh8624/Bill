import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useTransactions } from './TransactionContext';

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState(() => safeGet('smartbill_suppliers', []));
  const { addTransaction } = useTransactions();

  useEffect(() => {
    safeSet('smartbill_suppliers', suppliers);
  }, [suppliers]);

  const addSupplier = (supplier) => setSuppliers(prev => [...prev, { ...supplier, id: generateId(), balance: 0 }]);
  
  const updateSupplier = (id, data) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  
  const deleteSupplier = (id) => setSuppliers(prev => prev.filter(s => s.id !== id));
  
  const addSupplierInvoice = (supplierId, amount, date, notes, invoiceNo) => {
    setSuppliers(prev => prev.map(s => {
      if(s.id === supplierId) {
        return {
          ...s, 
          balance: (s.balance || 0) + parseFloat(amount)
        };
      }
      return s;
    }));

    addTransaction({
       type: 'INVOICE_RECEIVED',
       entityId: supplierId,
       amount: parseFloat(amount),
       date,
       notes: `Inv: ${invoiceNo}${notes ? ' - ' + notes : ''}`
    });
  };

  const addSupplierPayment = (supplierId, amount, date, notes) => {
    setSuppliers(prev => prev.map(s => {
      if(s.id === supplierId) {
        return {
          ...s, 
          balance: (s.balance || 0) - parseFloat(amount)
        };
      }
      return s;
    }));

    addTransaction({
       type: 'PAYMENT_MADE',
       entityId: supplierId,
       amount: parseFloat(amount),
       date,
       notes
    });
  };

  return (
    <SupplierContext.Provider value={{ 
      suppliers, 
      addSupplier, 
      updateSupplier, 
      deleteSupplier,
      addSupplierInvoice, 
      addSupplierPayment 
    }}>
      {children}
    </SupplierContext.Provider>
  );
};

export const useSuppliers = () => useContext(SupplierContext);
