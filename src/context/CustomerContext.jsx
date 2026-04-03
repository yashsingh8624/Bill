import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { safeGet, safeSet, generateId } from '../utils/storage';

const STORAGE_KEY = 'smartbill_customers';
const LEDGER_KEY = 'smartbill_ledger';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = safeGet(STORAGE_KEY, []);
    setCustomers(saved.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setLoading(false);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (!loading) {
      safeSet(STORAGE_KEY, customers);
    }
  }, [customers, loading]);

  const addCustomer = (customerData) => {
    try {
      const newCustomer = {
        ...customerData,
        id: generateId(),
        created_at: new Date().toISOString()
      };
      
      setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
      
      // If there was an opening balance, record it in the ledger
      if (parseFloat(customerData.previousBalance || 0) > 0) {
        const ledger = safeGet(LEDGER_KEY, []);
        ledger.push({
          id: generateId(),
          customer_id: newCustomer.id,
          type: 'OPENING',
          amount: parseFloat(customerData.previousBalance),
          description: 'Opening Balance',
          date: new Date().toISOString()
        });
        safeSet(LEDGER_KEY, ledger);
      }
      
      return newCustomer;
    } catch (err) {
      console.error('Error adding customer:', err.message);
      showToast('Failed to add customer', 'error');
      return null;
    }
  };

  const updateCustomer = (id, data) => {
    try {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (err) {
      console.error('Error updating customer:', err.message);
      showToast('Failed to update customer', 'error');
    }
  };
  
  const deleteCustomer = (id) => {
    try {
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting customer:', err.message);
      showToast('Failed to delete customer', 'error');
    }
  };

  const addCustomerPayment = (customerId, amount, date, notes) => {
    try {
      const ledger = safeGet(LEDGER_KEY, []);
      ledger.push({
        id: generateId(),
        customer_id: customerId,
        type: 'PAYMENT',
        amount: parseFloat(amount),
        date: date || new Date().toISOString(),
        description: notes || 'Direct Payment'
      });
      safeSet(LEDGER_KEY, ledger);
      showToast('Payment recorded successfully', 'success');
      
      // Trigger a storage event so BillContext can pick up the ledger change
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
       console.error('Error recording payment:', err.message);
       showToast('Failed to record payment', 'error');
    }
  };

  return (
    <CustomerContext.Provider value={{ 
      customers, 
      loading,
      addCustomer, 
      updateCustomer, 
      deleteCustomer,
      addCustomerPayment 
    }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => useContext(CustomerContext);
