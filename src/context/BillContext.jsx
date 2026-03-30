import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';
import { useInventory } from './InventoryContext';
import { useCustomers } from './CustomerContext';
import { useAudit } from './AuditContext';
import { migrateLegacyToLedger, addLedgerEntry, repairLedgerData } from '../utils/ledger';

const BillContext = createContext();

export const BillProvider = ({ children }) => {
  const [bills, setBills] = useState(() => safeGet('smartbill_bills', []));
  const { products, setProducts } = useInventory();
  const { customers, updateCustomer } = useCustomers();
  const { addLog } = useAudit();

  // Run migration & repair ONCE on first mount only
  useEffect(() => {
    migrateLegacyToLedger();
    repairLedgerData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync bills state to localStorage whenever it changes
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
      year: dateObj.getFullYear(),
    };

    // 1. Write to storage and state immediately
    const currentBills = safeGet('smartbill_bills', []);
    const updatedBills = [newBill, ...currentBills];
    safeSet('smartbill_bills', updatedBills);
    setBills(updatedBills);

    // 2. Deduct inventory stock
    setProducts(prev => prev.map(p => {
      const billItem = bill.items?.find(i => i.productId === p.id);
      if (!billItem) return p;
      return {
        ...p,
        quantity: Math.max(0, (p.quantity || 0) - billItem.quantity),
        stockHistory: [...(p.stockHistory || []), {
          id: generateId(),
          date: new Date().toISOString(),
          change: -billItem.quantity,
          note: `Bill: ${newBill.invoiceNo || 'Sale'}`,
          type: 'OUT',
        }],
      };
    }));

    // 3. Write to ledger — LEDGER IS SOLE SOURCE OF TRUTH
    if (bill.customerId) {
      // SALE entry: strictly items subtotal + GST only (never includes previous balance)
      const itemsSubtotal = Array.isArray(bill.items) && bill.items.length > 0
        ? bill.items.reduce((s, i) => s + (parseFloat(i?.amount) || 0), 0)
        : (parseFloat(bill.subTotal) || 0);
      const gst = (parseFloat(bill.cgst) || 0) + (parseFloat(bill.sgst) || 0);
      const saleAmount = itemsSubtotal + gst;

      addLedgerEntry({
        customerId: bill.customerId,
        date: newBill.date,
        type: 'SALE',
        invoiceId: newBill.invoiceNo,
        amount: saleAmount,
        desc: `Bill #${newBill.invoiceNo || 'Unknown'}`,
      });

      // PAYMENT entry: only if customer paid something right now
      const amtPaid = parseFloat(newBill.amountPaid || newBill.paidAmount || 0);
      if (amtPaid > 0) {
        addLedgerEntry({
          customerId: bill.customerId,
          date: new Date(dateObj.getTime() + 1000).toISOString(),
          type: 'PAYMENT',
          invoiceId: newBill.invoiceNo,
          amount: amtPaid,
          desc: `Paid for Bill #${newBill.invoiceNo || 'Unknown'}`,
        });
      }
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

    // Void all ledger entries for this invoice (by invoiceId or description fallback)
    if (targetBill.customerId) {
      const invoiceNo = targetBill.invoiceNo;
      const ledger = safeGet('smartbill_ledger', []);
      const updatedLedger = ledger.map(e => {
        const byId   = e.invoiceId && e.invoiceId === invoiceNo;
        const byDesc = !e.invoiceId && e.desc && (
          e.desc === `Bill #${invoiceNo}` ||
          e.desc === `Paid for Bill #${invoiceNo}`
        );
        if ((byId || byDesc) && ['SALE', 'PAYMENT', 'ROLLOVER'].includes(e.type)) {
          return { ...e, isVoid: true, amount: 0 };
        }
        return e;
      });
      safeSet('smartbill_ledger', updatedLedger);
    }
  };

  return (
    <BillContext.Provider value={{ bills, addBill, deleteBill, generateBillNumber }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBills = () => useContext(BillContext);
