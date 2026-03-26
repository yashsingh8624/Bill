import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useInventory } from './InventoryContext';
import { useCustomers } from './CustomerContext';
import { useAudit } from './AuditContext';

const BillContext = createContext();

export const BillProvider = ({ children }) => {
  const [bills, setBills] = useState(() => safeGet('smartbill_bills', []));
  const { products, setProducts } = useInventory();
  const { customers, updateCustomer } = useCustomers();
  const { addLog } = useAudit();

  useEffect(() => {
    safeSet('smartbill_bills', bills);
  }, [bills]);

  const generateBillNumber = () => {
    const settings = safeGet('smartbill_settings', { invoicePrefix: 'INV' });
    const currentBills = safeGet('smartbill_bills', []);
    return `${settings.invoicePrefix}-${new Date().getFullYear()}-${String(currentBills.length + 1).padStart(4, '0')}`;
  };

  const addBill = (bill) => {
    const newBill = { ...bill, id: generateId(), date: bill.date || new Date().toISOString() };
    
    // 1. Save bill to state AND localStorage immediately
    const currentBills = safeGet('smartbill_bills', []);
    const updatedBills = [newBill, ...currentBills];
    safeSet('smartbill_bills', updatedBills);
    setBills(updatedBills);
    
    // 2. Deduct stock
    setProducts(prevProducts => prevProducts.map(p => {
      const itemInBill = bill.items?.find(i => i.productId === p.id);
      if (itemInBill) {
        return { 
          ...p, 
          quantity: Math.max(0, (p.quantity || 0) - itemInBill.quantity),
          stockHistory: [...(p.stockHistory || []), {
             id: generateId(),
             date: new Date().toISOString(),
             change: -itemInBill.quantity,
             note: `Bill: ${newBill.invoiceNo || 'Sale'}`,
             type: 'OUT'
          }]
        };
      }
      return p;
    }));

    // 3. Update customer balance — read FRESH from localStorage to avoid stale state
    if (bill.customerId) {
      const freshCustomers = safeGet('smartbill_customers', []);
      const cust = freshCustomers.find(c => c.id === bill.customerId);
      
      if (cust) {
        const currentBalance = cust.balance || 0;
        const billOutstanding = bill.outstanding || 0;
        
        // If previous balance was included in this bill, reset it and add the new outstanding
        let newBalance = currentBalance;
        let newPreviousBalance = cust.previousBalance || 0;
        
        if (bill.prevBalanceIncluded > 0) {
          // Previous balance is now accounted for in this bill's outstanding
          newPreviousBalance = 0;
          newBalance = 0; // Reset current balance since it's folded into the bill
          newBalance += billOutstanding; // Add the new outstanding (which includes prev balance)
        } else {
          newBalance = currentBalance + billOutstanding;
        }
        
        // Update in fresh array and persist immediately
        const updatedCustomers = freshCustomers.map(c => 
          c.id === bill.customerId 
            ? { ...c, balance: newBalance, previousBalance: newPreviousBalance }
            : c
        );
        safeSet('smartbill_customers', updatedCustomers);
        
        // Also update React state so UI re-renders
        updateCustomer(bill.customerId, { 
          balance: newBalance, 
          previousBalance: newPreviousBalance 
        });
      }
    }
    
    return newBill;
  };
  
  const deleteBill = (id, reason = 'Deleted by user') => {
    setBills(prev => prev.map(b => {
      if (b.id === id && !b.isDeleted) {
        // Reverse customer balance if outstanding
        if (b.customerId && b.outstanding > 0) {
           const freshCustomers = safeGet('smartbill_customers', []);
           const cust = freshCustomers.find(c => c.id === b.customerId);
           if (cust) {
              const newBalance = Math.max(0, (cust.balance || 0) - b.outstanding);
              const updatedCustomers = freshCustomers.map(c =>
                c.id === b.customerId ? { ...c, balance: newBalance } : c
              );
              safeSet('smartbill_customers', updatedCustomers);
              updateCustomer(b.customerId, { balance: newBalance });
           }
        }
        
        // Audit Log
        addLog('DELETE', 'BILL', id, { reason, invoiceNo: b.invoiceNo, amount: b.total });

        return { 
          ...b, 
          isDeleted: true, 
          deletedAt: new Date().toISOString(),
          deleteReason: reason 
        };
      }
      return b;
    }));
  };

  return (
    <BillContext.Provider value={{ 
      bills, 
      addBill, 
      deleteBill,
      generateBillNumber 
    }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBills = () => useContext(BillContext);
