import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useTransactions } from './TransactionContext';

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
      id: generateId(), 
      balance: 0, 
      previousBalance: customer.previousBalance || 0,
      includePrevBalance: customer.includePrevBalance || false 
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

    const amountNum = parseFloat(amount);
    let remainingAmount = amountNum;
    let newPrevBalance = cust.previousBalance || 0;
    let newBalance = cust.balance || 0;

    // First clear previousBalance
    if (newPrevBalance > 0) {
      const deduction = Math.min(newPrevBalance, remainingAmount);
      newPrevBalance -= deduction;
      remainingAmount -= deduction;
      
      if (deduction > 0) {
        addTransaction({
          type: 'previous_balance_adjustment',
          entityId: customerId,
          amount: deduction,
          date,
          notes: `Udhaar Clearance: ${notes}`
        });
      }
    }

    // Then clear current balance
    if (remainingAmount > 0) {
      newBalance -= remainingAmount;
      addTransaction({
        type: 'PAYMENT_RECEIVED',
        entityId: customerId,
        amount: remainingAmount,
        date,
        notes
      });
    }

    updateCustomer(customerId, { 
      previousBalance: newPrevBalance,
      balance: newBalance
    });
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
