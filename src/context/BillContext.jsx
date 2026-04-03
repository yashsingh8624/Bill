import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useInventory } from './InventoryContext';
import { useCustomers } from './CustomerContext';
import { useAudit } from './AuditContext';
import { useToast } from './ToastContext';
import { safeGet, safeSet, generateId } from '../utils/storage';

const BILLS_KEY = 'smartbill_bills';
const LEDGER_KEY = 'smartbill_ledger';

const BillContext = createContext();

export const BillProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setProducts, products } = useInventory();
  const { customers = [] } = useCustomers() || {};
  const { addLog } = useAudit();
  const { showToast } = useToast();

  const mapBillToApp = useCallback((b) => {
    const cust = customers.find(c => c.id === (b.customer_id || b.customerId)) || {};
    return {
      ...b,
      customerId: b.customer_id || b.customerId,
      customerName: cust.name || b.customerName || 'Unknown',
      customerPhone: cust.phone || b.customerPhone || '',
      invoiceNo: b.invoice_no || b.invoiceNo,
      subTotal: parseFloat(b.sub_total || b.subTotal || 0),
      cgst: parseFloat(b.cgst || 0),
      sgst: parseFloat(b.sgst || 0),
      total: parseFloat(b.total || 0),
      amountPaid: parseFloat(b.amount_paid || b.amountPaid || 0),
      isDeleted: b.is_deleted || b.isDeleted,
      deleteReason: b.delete_reason || b.deleteReason,
      outstanding: Math.max(0, parseFloat(b.total || 0) - parseFloat(b.amount_paid || b.amountPaid || 0)),
      readableDate: new Date(b.date).toLocaleDateString()
    };
  }, [customers]);

  // Load data from localStorage
  const loadData = useCallback(() => {
    const savedBills = safeGet(BILLS_KEY, []);
    const savedLedger = safeGet(LEDGER_KEY, []);
    setBills(savedBills.map(mapBillToApp));
    setLedger(savedLedger);
    setLoading(false);
  }, [mapBillToApp]);

  useEffect(() => {
    loadData();

    // Listen for ledger updates from other contexts (e.g. CustomerContext payments)
    const handleLedgerUpdate = () => {
      setLedger(safeGet(LEDGER_KEY, []));
    };
    window.addEventListener('ledger-updated', handleLedgerUpdate);
    return () => window.removeEventListener('ledger-updated', handleLedgerUpdate);
  }, [loadData]);

  // Re-map bills when customers change (so names resolve correctly)
  useEffect(() => {
    if (!loading) {
      setBills(prev => prev.map(mapBillToApp));
    }
  }, [customers, loading, mapBillToApp]);

  // Persist bills to localStorage on change
  useEffect(() => {
    if (!loading) {
      safeSet(BILLS_KEY, bills);
    }
  }, [bills, loading]);

  const generateBillNumber = () => {
    const prefix = 'INV';
    return `${prefix}-${new Date().getFullYear()}-${String(bills.length + 1).padStart(4, '0')}`;
  };

  const addBill = (bill) => {
    try {
      const billDate = bill.date || new Date().toISOString();
      const billId = generateId();
      const invoiceNo = bill.invoiceNo || bill.invoice_no || generateBillNumber();

      const newBill = {
        id: billId,
        customer_id: bill.customerId || bill.customer_id,
        invoice_no: invoiceNo,
        date: billDate,
        items: bill.items,
        sub_total: parseFloat(bill.subTotal || 0),
        cgst: parseFloat(bill.cgst || 0),
        sgst: parseFloat(bill.sgst || 0),
        total: parseFloat(bill.total || 0),
        amount_paid: parseFloat(bill.amountPaid || bill.paidAmount || 0),
        is_deleted: false,
        created_at: new Date().toISOString()
      };

      // Update bills state
      setBills(prev => [mapBillToApp(newBill), ...prev]);

      // Add ledger entries
      const currentLedger = safeGet(LEDGER_KEY, []);
      
      // SALE entry
      currentLedger.push({
        id: generateId(),
        customer_id: newBill.customer_id,
        date: billDate,
        type: 'SALE',
        invoice_id: invoiceNo,
        amount: newBill.total,
        description: `Bill #${invoiceNo}`
      });

      // PAYMENT entry (if paid something)
      if (newBill.amount_paid > 0) {
        currentLedger.push({
          id: generateId(),
          customer_id: newBill.customer_id,
          date: new Date(new Date(billDate).getTime() + 1000).toISOString(),
          type: 'PAYMENT',
          invoice_id: invoiceNo,
          amount: newBill.amount_paid,
          description: `Paid for Bill #${invoiceNo}`
        });
      }

      safeSet(LEDGER_KEY, currentLedger);
      setLedger(currentLedger);

      // Update Inventory Stock locally
      const updatedProducts = [...products];
      for (const item of bill.items) {
        if (item.productId) {
          const idx = updatedProducts.findIndex(p => p.id === item.productId);
          if (idx !== -1) {
            const product = updatedProducts[idx];
            const newQty = Math.max(0, (product.quantity || 0) - item.quantity);
            updatedProducts[idx] = {
              ...product,
              quantity: newQty,
              stock_history: [...(product.stock_history || []), {
                id: generateId(),
                date: new Date().toISOString(),
                change: -item.quantity,
                note: `Bill: ${invoiceNo}`,
                type: 'OUT'
              }]
            };
          }
        }
      }
      setProducts(updatedProducts);

      // Dispatch event so other contexts know ledger changed
      window.dispatchEvent(new Event('ledger-updated'));

      return mapBillToApp(newBill);
    } catch (err) {
      console.error('Error adding bill:', err.message);
      showToast('Failed to save bill', 'error');
      return null;
    }
  };

  const deleteBill = (id, reason = 'Deleted by user') => {
    try {
      const targetBill = bills.find(b => b.id === id);
      if (!targetBill) return;

      // Mark bill as deleted
      setBills(prev => prev.map(b => 
        b.id === id ? { ...b, is_deleted: true, isDeleted: true, delete_reason: reason, deleteReason: reason } : b
      ));

      // Void ledger entries
      const currentLedger = safeGet(LEDGER_KEY, []);
      const invoiceNo = targetBill.invoiceNo || targetBill.invoice_no;
      const updatedLedger = currentLedger.map(entry => 
        entry.invoice_id === invoiceNo ? { ...entry, is_void: true, amount: 0 } : entry
      );
      safeSet(LEDGER_KEY, updatedLedger);
      setLedger(updatedLedger);

      addLog('DELETE', 'BILL', id, { reason, invoiceNo });
      showToast('Bill deleted and ledger updated', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
       console.error('Error deleting bill:', err.message);
       showToast('Failed to delete bill', 'error');
    }
  };

  return (
    <BillContext.Provider value={{ bills, ledger, loading, addBill, deleteBill, generateBillNumber }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBills = () => useContext(BillContext);
