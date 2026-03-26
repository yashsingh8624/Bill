import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useInventory } from './InventoryContext';
import { useCustomers } from './CustomerContext';
import { useAudit } from './AuditContext';
import { syncCustomerTotals } from '../utils/ledger';

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
    const billDate = bill.date || new Date().toISOString();
    const dateObj = new Date(billDate);
    const newBill = { 
      ...bill, 
      id: generateId(), 
      date: billDate,
      readableDate: dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      month: dateObj.getMonth() + 1,
      year: dateObj.getFullYear()
    };
    
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

    // 3. Recalculate and update the customer ledger sync
    if (bill.customerId) {
      const newTotals = syncCustomerTotals(bill.customerId);
      updateCustomer(bill.customerId, newTotals);
    }
    
    return newBill;
  };
  
  const deleteBill = (id, reason = 'Deleted by user') => {
    const currentBills = safeGet('smartbill_bills', []);
    const targetBill = currentBills.find(b => b.id === id);
    if (!targetBill || targetBill.isDeleted) return;

    const newBills = currentBills.map(b => {
       if (b.id === id) {
          addLog('DELETE', 'BILL', id, { reason, invoiceNo: b.invoiceNo, amount: b.total });
          return { ...b, isDeleted: true, deletedAt: new Date().toISOString(), deleteReason: reason };
       }
       return b;
    });

    safeSet('smartbill_bills', newBills);
    setBills(newBills);

    if (targetBill.customerId) {
      const newTotals = syncCustomerTotals(targetBill.customerId);
      updateCustomer(targetBill.customerId, newTotals);
    }
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
