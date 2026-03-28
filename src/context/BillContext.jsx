import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useInventory } from './InventoryContext';
import { useCustomers } from './CustomerContext';
import { useAudit } from './AuditContext';
import { migrateLegacyToLedger, getCustomerBalance, addLedgerEntry } from '../utils/ledger';

const BillContext = createContext();

export const BillProvider = ({ children }) => {
  const [bills, setBills] = useState(() => safeGet('smartbill_bills', []));
  const { products, setProducts } = useInventory();
  const { customers, updateCustomer } = useCustomers();
  const { addLog } = useAudit();

  useEffect(() => {
    migrateLegacyToLedger();
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
    
    // 2. Deduct stock (kept as secondary logic, but not source of balance)
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

    // 3. LEDGER IS NOW SINGLE SOURCE OF TRUTH
    // Logic for Rollover and Sale Entry is handled in NewBill.jsx before submit
    // But we trigger a balance check here if needed for UI sync.
    if (bill.customerId) {
      // In this new architecture, we don't 'sync' back to customer object.
      // Pages will read directly from getCustomerBalance().
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
       // On delete, we should ideally VOID the ledger entry.
       const ledger = safeGet('smartbill_ledger', []);
       const updatedLedger = ledger.map(e => {
          if ((e.type === 'SALE' || e.type === 'PAYMENT' || e.type === 'ROLLOVER') && e.invoiceId === targetBill.invoiceNo) {
             return { ...e, isVoid: true, amount: 0 }; 
          }
          return e;
       });
       safeSet('smartbill_ledger', updatedLedger);
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
