import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { safeGet, safeSet, generateId } from '../utils/storage';

const STORAGE_KEY = 'smartbill_suppliers';
const LEDGER_KEY = 'smartbill_ledger';

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = safeGet(STORAGE_KEY, []);
    setSuppliers(saved.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setLoading(false);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (!loading) {
      safeSet(STORAGE_KEY, suppliers);
    }
  }, [suppliers, loading]);

  const addSupplier = (supplier) => {
    try {
      const newSupplier = {
        id: generateId(),
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        gstin: supplier.gstin,
        created_at: new Date().toISOString()
      };
      
      setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Handle opening balance
      if (parseFloat(supplier.previousBalance || 0) > 0) {
        const ledger = safeGet(LEDGER_KEY, []);
        ledger.push({
          id: generateId(),
          supplier_id: newSupplier.id,
          type: 'SUPPLIER_OPENING',
          amount: parseFloat(supplier.previousBalance),
          description: 'Opening Balance',
          date: new Date().toISOString()
        });
        safeSet(LEDGER_KEY, ledger);
        window.dispatchEvent(new Event('ledger-updated'));
      }
      
      showToast('Supplier added successfully', 'success');
      return newSupplier;
    } catch (err) {
      console.error('Error adding supplier:', err.message);
      showToast('Failed to add supplier', 'error');
      return null;
    }
  };
  
  const updateSupplier = (id, data) => {
    try {
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      showToast('Supplier updated', 'success');
    } catch (err) {
      console.error('Error updating supplier:', err.message);
      showToast('Failed to update supplier', 'error');
    }
  };
  
  const deleteSupplier = (id) => {
    try {
      setSuppliers(prev => prev.filter(s => s.id !== id));
      showToast('Supplier removed', 'success');
    } catch (err) {
      console.error('Error deleting supplier:', err.message);
      showToast('Failed to remove supplier', 'error');
    }
  };
  
  const addSupplierInvoice = (supplierId, amount, date, notes, invoiceNo) => {
    try {
      const ledger = safeGet(LEDGER_KEY, []);
      ledger.push({
        id: generateId(),
        supplier_id: supplierId,
        type: 'PURCHASE',
        amount: parseFloat(amount),
        date: date || new Date().toISOString(),
        description: `Inv: ${invoiceNo}${notes ? ' - ' + notes : ''}`,
        invoice_id: invoiceNo
      });
      safeSet(LEDGER_KEY, ledger);
      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Invoice recorded in ledger', 'success');
    } catch (err) {
      console.error('Error recording supplier invoice:', err.message);
      showToast('Failed to record invoice', 'error');
    }
  };

  const addSupplierPayment = (supplierId, amount, date, notes) => {
    try {
      const ledger = safeGet(LEDGER_KEY, []);
      ledger.push({
        id: generateId(),
        supplier_id: supplierId,
        type: 'PAYMENT_MADE',
        amount: parseFloat(amount),
        date: date || new Date().toISOString(),
        description: notes || 'Payment Made'
      });
      safeSet(LEDGER_KEY, ledger);
      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Payment recorded in ledger', 'success');
    } catch (err) {
      console.error('Error recording supplier payment:', err.message);
      showToast('Failed to record payment', 'error');
    }
  };

  return (
    <SupplierContext.Provider value={{ 
      suppliers, 
      loading,
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
