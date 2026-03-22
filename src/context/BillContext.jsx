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
    return `${settings.invoicePrefix}-${new Date().getFullYear()}-${String(bills.length + 1).padStart(4, '0')}`;
  };

  const addBill = (bill) => {
    const newBill = { ...bill, id: generateId(), date: bill.date || new Date().toISOString() };
    setBills(prev => [newBill, ...prev]);
    
    // Deduct stock
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

    // Add to customer balance if any outstanding
    if (bill.customerId && bill.outstanding > 0) {
      const cust = customers.find(c => c.id === bill.customerId);
      if(cust) {
        updateCustomer(bill.customerId, { balance: (cust.balance || 0) + bill.outstanding });
      }
    }
    return newBill;
  };
  
  const deleteBill = (id, reason = 'Deleted by user') => {
    setBills(prev => prev.map(b => {
      if (b.id === id && !b.isDeleted) {
        // Reverse customer balance if outstanding
        if (b.customerId && b.outstanding > 0) {
           const cust = customers.find(c => c.id === b.customerId);
           if (cust) {
              updateCustomer(b.customerId, { balance: Math.max(0, (cust.balance || 0) - b.outstanding) });
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
