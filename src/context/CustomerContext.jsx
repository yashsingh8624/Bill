import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useTransactions } from './TransactionContext';
import { addLedgerEntry } from '../utils/ledger';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState(() => safeGet('smartbill_customers', []));
  const { addTransaction } = useTransactions();

  useEffect(() => {
    safeSet('smartbill_customers', customers);
  }, [customers]);

  const addCustomer = (customer) => {
    const newCustId = customer.id || generateId();
    setCustomers(prev => [...prev, { 
      ...customer, 
      id: newCustId,
      createdAt: customer.createdAt || new Date().toISOString()
    }]);

    if (customer.previousBalance > 0) {
      addLedgerEntry({
        customerId: newCustId,
        type: 'OPENING',
        amount: parseFloat(customer.previousBalance),
        desc: 'Opening Balance'
      });
    }
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

    addLedgerEntry({
      customerId,
      type: 'PAYMENT',
      amount: parseFloat(amount),
      date,
      desc: notes || 'Direct Payment'
    });

    // In the new architecture, we don't 'updateCustomer' with totals.
    // UI will calculate live balance using getCustomerBalance().
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
