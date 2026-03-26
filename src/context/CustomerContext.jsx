import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useTransactions } from './TransactionContext';
import { syncCustomerTotals } from '../utils/ledger';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState(() => safeGet('smartbill_customers', []));
  const { addTransaction } = useTransactions();

  useEffect(() => {
    safeSet('smartbill_customers', customers);
  }, [customers]);

  const addCustomer = (customer) => {
    setCustomers(prev => [...prev, { 
      ...customer, 
      id: customer.id || generateId(), 
      totalPurchases: 0, 
      totalPaid: 0,
      outstandingBalance: customer.previousBalance || 0
    }]);
  };

  const updateCustomer = (id, data) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };
  
  const deleteCustomer = (id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addCustomerPayment = (customerId, amount, date, notes) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;

    addTransaction({
      type: 'PAYMENT_RECEIVED',
      entityId: customerId,
      amount: parseFloat(amount),
      date,
      notes
    });

    // We must manually refresh the customer lists in React state since storage updated
    const newTotals = syncCustomerTotals(customerId);
    updateCustomer(customerId, newTotals);
  };

  return (
    <CustomerContext.Provider value={{ 
      customers, 
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
