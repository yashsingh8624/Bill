import { safeGet, safeSet, generateId } from './storage';

/**
 * Single Source of Truth: Ledger Entries
 * Entry Types:
 * - 'SALE': Full invoice total (subtotal + previousDue)
 * - 'PAYMENT': Direct payments from customers
 * - 'ROLLOVER': Virtual payment to "clear" old debt before a new SALE entry includes it.
 * - 'OPENING': Initial balance from customer creation
 */

/**
 * Adds a new entry to the unified ledger.
 */
export const addLedgerEntry = (entry) => {
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) {
    console.error('Ledger is not an array, resetting to empty.');
    safeSet('smartbill_ledger', []);
    return null;
  }
  const newEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    ...entry,
    amount: parseFloat(entry?.amount || 0)
  };
  safeSet('smartbill_ledger', [...ledger, newEntry]);
  return newEntry;
};

/**
 * Calculates current balance for a customer.
 * Logic: balance = SUM(SALE) - SUM(PAYMENT) - SUM(ROLLOVER)
 */
export const getCustomerBalance = (customerId) => {
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return 0;
  
  const entries = ledger.filter(e => e && e.customerId === customerId);
  
  return entries.reduce((sum, e) => {
    const amt = parseFloat(e?.amount || 0);
    if (e.type === 'SALE' || e.type === 'OPENING') return sum + amt;
    if (e.type === 'PAYMENT' || e.type === 'ROLLOVER') return sum - amt;
    return sum;
  }, 0);
};

/**
 * Calculates current balance for a supplier.
 * Logic: balance = SUM(INVOICE) - SUM(PAYMENT)
 */
export const getSupplierBalance = (supplierId) => {
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return 0;
  
  const entries = ledger.filter(e => e && e.supplierId === supplierId);
  
  return entries.reduce((sum, e) => {
    const amt = parseFloat(e?.amount || 0);
    if (e.type === 'PURCHASE' || e.type === 'SUPPLIER_OPENING') return sum + amt;
    if (e.type === 'PAYMENT_MADE') return sum - amt;
    return sum;
  }, 0);
};

/**
 * Fetches all ledger entries for a customer (chronologically).
 */
export const getCustomerLedger = (customerId) => {
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return [];
  
  return ledger
    .filter(e => e && e.customerId === customerId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Fetches all ledger entries for a supplier (chronologically).
 */
export const getSupplierLedger = (supplierId) => {
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return [];
  
  return ledger
    .filter(e => e && e.supplierId === supplierId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Migration helper: Build initial ledger from legacy data.
 */
export const migrateLegacyToLedger = () => {
  const ledger = safeGet('smartbill_ledger', []);
  if (ledger.length > 0) return;

  const customers = safeGet('smartbill_customers', []);
  const suppliers = safeGet('smartbill_suppliers', []);
  const bills = safeGet('smartbill_bills', []);
  const txns = safeGet('smartbill_transactions', []);

  const newLedger = [];

  // --- Customers ---
  customers.forEach(c => {
    if (parseFloat(c.previousBalance || 0) > 0) {
      newLedger.push({
        id: `mig-op-c-${c.id}`,
        customerId: c.id,
        date: c.createdAt || new Date().toISOString(),
        type: 'OPENING',
        amount: parseFloat(c.previousBalance),
        desc: 'Opening Balance'
      });
    }
  });

  const safeDate = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  };

  bills.filter(b => !b?.isDeleted && b?.date).forEach(b => {
    newLedger.push({
      id: `mig-sale-${b.id}`,
      customerId: b.customerId,
      date: safeDate(b.date),
      type: 'SALE',
      invoiceId: b.invoiceNo,
      amount: parseFloat(b.totalAmount || b.total || 0),
      desc: `Bill #${b.invoiceNo || 'Unknown'}`
    });
    
    if (parseFloat(b.amountPaid || 0) > 0) {
      const bDate = new Date(b.date);
      const paidDate = isNaN(bDate.getTime()) 
        ? new Date().toISOString() 
        : new Date(bDate.getTime() + 1000).toISOString();
        
      newLedger.push({
        id: `mig-pay-${b.id}`,
        customerId: b.customerId,
        date: paidDate,
        type: 'PAYMENT',
        amount: parseFloat(b.amountPaid),
        desc: `Paid for Bill #${b.invoiceNo || 'Unknown'}`
      });
    }
  });

  // --- Suppliers ---
  suppliers.forEach(s => {
    if (parseFloat(s.previousBalance || 0) > 0) {
      newLedger.push({
        id: `mig-op-s-${s.id}`,
        supplierId: s.id,
        date: s.createdAt || new Date().toISOString(),
        type: 'SUPPLIER_OPENING',
        amount: parseFloat(s.previousBalance),
        desc: 'Opening Balance'
      });
    }
  });

  // --- Generic Transactions ---
  txns.forEach(t => {
    if (t.type === 'PAYMENT_RECEIVED' || !t.type) {
      newLedger.push({
        id: `mig-txn-c-${t.id}`,
        customerId: t.entityId,
        date: t.date,
        type: 'PAYMENT',
        amount: parseFloat(t.amount),
        desc: t.notes || 'Payment Received'
      });
    } else if (t.type === 'PAYMENT_MADE' || t.type === 'INVOICE_RECEIVED') {
      newLedger.push({
        id: `mig-txn-s-${t.id}`,
        supplierId: t.entityId,
        date: t.date,
        type: t.type === 'INVOICE_RECEIVED' ? 'PURCHASE' : 'PAYMENT_MADE',
        amount: parseFloat(t.amount),
        desc: t.notes || (t.type === 'INVOICE_RECEIVED' ? 'Stock Bill' : 'Payment Made')
      });
    }
  });

  safeSet('smartbill_ledger', newLedger.sort((a, b) => new Date(a.date) - new Date(b.date)));
};
