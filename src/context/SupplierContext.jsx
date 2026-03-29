import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { addLedgerEntry } from '../utils/ledger';

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState(() => safeGet('smartbill_suppliers', []));

  useEffect(() => {
    safeSet('smartbill_suppliers', suppliers);
  }, [suppliers]);

  const addSupplier = (supplier) => {
    const id = generateId();
    setSuppliers(prev => [...prev, { ...supplier, id }]);
    
    if (parseFloat(supplier.previousBalance || 0) > 0) {
      addLedgerEntry({
        supplierId: id,
        type: 'SUPPLIER_OPENING',
        amount: parseFloat(supplier.previousBalance),
        desc: 'Opening Balance'
      });
    }
  };
  
  const updateSupplier = (id, data) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  
  const deleteSupplier = (id) => setSuppliers(prev => prev.filter(s => s.id !== id));
  
  const addSupplierInvoice = (supplierId, amount, date, notes, invoiceNo) => {
    addLedgerEntry({
      supplierId,
      type: 'PURCHASE',
      amount: parseFloat(amount),
      date,
      desc: `Inv: ${invoiceNo}${notes ? ' - ' + notes : ''}`,
      invoiceId: invoiceNo
    });
  };

  const addSupplierPayment = (supplierId, amount, date, notes) => {
    addLedgerEntry({
      supplierId,
      type: 'PAYMENT_MADE',
      amount: parseFloat(amount),
      date,
      desc: notes || 'Payment Made'
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
