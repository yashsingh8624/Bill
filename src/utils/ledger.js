import { safeGet, safeSet, generateId } from './storage';

/**
 * LEDGER - Single Source of Truth
 *
 * Entry types:
 *   SALE     → amount = items subtotal + GST only (NO previous balance)
 *   PAYMENT  → amount = cash received from customer
 *   OPENING  → amount = opening balance when customer was created
 *   ROLLOVER → legacy clearing entries (handled for backwards compat)
 *
 * Balance formula: SUM(SALE + OPENING) - SUM(PAYMENT + ROLLOVER)
 */

// ─────────────────────────────────────────────
// ADD ENTRY
// ─────────────────────────────────────────────
export const addLedgerEntry = (entry) => {
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) {
    safeSet('smartbill_ledger', []);
    return null;
  }
  const newEntry = {
    id: generateId(),
    date: new Date().toISOString(),
    ...entry,
    amount: Math.max(0, parseFloat(entry?.amount || 0)),
  };
  safeSet('smartbill_ledger', [...ledger, newEntry]);
  return newEntry;
};

// ─────────────────────────────────────────────
// GET CUSTOMER BALANCE  (clamped to 0 minimum)
// ─────────────────────────────────────────────
export const getCustomerBalance = (customerId) => {
  if (!customerId) return 0;
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return 0;

  const balance = ledger
    .filter(e => e && e.customerId === customerId)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'SALE' || e.type === 'OPENING') return sum + amt;
      if (e.type === 'PAYMENT' || e.type === 'ROLLOVER') return sum - amt;
      return sum;
    }, 0);

  return Math.max(0, balance); // Never return negative — that's an advance
};

// ─────────────────────────────────────────────
// GET CUSTOMER RAW BALANCE  (can be negative = advance)
// ─────────────────────────────────────────────
export const getCustomerRawBalance = (customerId) => {
  if (!customerId) return 0;
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return 0;

  return ledger
    .filter(e => e && e.customerId === customerId)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'SALE' || e.type === 'OPENING') return sum + amt;
      if (e.type === 'PAYMENT' || e.type === 'ROLLOVER') return sum - amt;
      return sum;
    }, 0);
};

// ─────────────────────────────────────────────
// GET SUPPLIER BALANCE
// ─────────────────────────────────────────────
export const getSupplierBalance = (supplierId) => {
  if (!supplierId) return 0;
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return 0;

  return ledger
    .filter(e => e && e.supplierId === supplierId)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'PURCHASE' || e.type === 'SUPPLIER_OPENING') return sum + amt;
      if (e.type === 'PAYMENT_MADE') return sum - amt;
      return sum;
    }, 0);
};

// ─────────────────────────────────────────────
// GET CUSTOMER LEDGER ENTRIES (chronological)
// ─────────────────────────────────────────────
export const getCustomerLedger = (customerId) => {
  if (!customerId) return [];
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return [];

  return ledger
    .filter(e => e && e.customerId === customerId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

// ─────────────────────────────────────────────
// GET SUPPLIER LEDGER ENTRIES (chronological)
// ─────────────────────────────────────────────
export const getSupplierLedger = (supplierId) => {
  if (!supplierId) return [];
  const ledger = safeGet('smartbill_ledger', []);
  if (!Array.isArray(ledger)) return [];

  return ledger
    .filter(e => e && e.supplierId === supplierId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

// ─────────────────────────────────────────────
// MIGRATE legacy data → ledger (runs once)
// ─────────────────────────────────────────────
export const migrateLegacyToLedger = () => {
  const ledger = safeGet('smartbill_ledger', []);
  if (ledger.length > 0) return; // Already migrated

  const customers = safeGet('smartbill_customers', []);
  const suppliers  = safeGet('smartbill_suppliers', []);
  const bills      = safeGet('smartbill_bills', []);
  const txns       = safeGet('smartbill_transactions', []);
  const newLedger  = [];

  const safeDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
  };

  // Opening balances for customers
  customers.forEach(c => {
    if (parseFloat(c.previousBalance || 0) > 0) {
      newLedger.push({
        id: `mig-op-c-${c.id}`,
        customerId: c.id,
        date: safeDate(c.createdAt),
        type: 'OPENING',
        amount: parseFloat(c.previousBalance),
        desc: 'Opening Balance',
      });
    }
  });

  // Bills → SALE + optional PAYMENT
  bills.filter(b => !b?.isDeleted && b?.date).forEach(b => {
    // Derive the true items subtotal to avoid including prev balance in SALE amount
    const itemsSubtotal = Array.isArray(b.items) && b.items.length > 0
      ? b.items.reduce((s, i) => s + (parseFloat(i?.amount) || 0), 0)
      : (parseFloat(b.subTotal) || parseFloat(b.totalAmount) || parseFloat(b.total) || 0);
    const gst = (parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0);
    const saleAmount = itemsSubtotal + gst;

    newLedger.push({
      id: `mig-sale-${b.id}`,
      customerId: b.customerId,
      date: safeDate(b.date),
      type: 'SALE',
      invoiceId: b.invoiceNo,
      amount: saleAmount,
      desc: `Bill #${b.invoiceNo || 'Unknown'}`,
    });

    const paid = parseFloat(b.amountPaid || b.paidAmount || 0);
    if (paid > 0) {
      const bDate = new Date(b.date);
      newLedger.push({
        id: `mig-pay-${b.id}`,
        customerId: b.customerId,
        date: isNaN(bDate.getTime())
          ? new Date().toISOString()
          : new Date(bDate.getTime() + 1000).toISOString(),
        type: 'PAYMENT',
        invoiceId: b.invoiceNo,
        amount: paid,
        desc: `Paid for Bill #${b.invoiceNo || 'Unknown'}`,
      });
    }
  });

  // Opening balances for suppliers
  suppliers.forEach(s => {
    if (parseFloat(s.previousBalance || 0) > 0) {
      newLedger.push({
        id: `mig-op-s-${s.id}`,
        supplierId: s.id,
        date: safeDate(s.createdAt),
        type: 'SUPPLIER_OPENING',
        amount: parseFloat(s.previousBalance),
        desc: 'Opening Balance',
      });
    }
  });

  // Generic legacy transactions
  txns.forEach(t => {
    if (t.type === 'PAYMENT_RECEIVED' || !t.type) {
      newLedger.push({
        id: `mig-txn-c-${t.id}`,
        customerId: t.entityId,
        date: safeDate(t.date),
        type: 'PAYMENT',
        amount: parseFloat(t.amount),
        desc: t.notes || 'Payment Received',
      });
    } else if (t.type === 'PAYMENT_MADE' || t.type === 'INVOICE_RECEIVED') {
      newLedger.push({
        id: `mig-txn-s-${t.id}`,
        supplierId: t.entityId,
        date: safeDate(t.date),
        type: t.type === 'INVOICE_RECEIVED' ? 'PURCHASE' : 'PAYMENT_MADE',
        amount: parseFloat(t.amount),
        desc: t.notes || (t.type === 'INVOICE_RECEIVED' ? 'Stock Bill' : 'Payment Made'),
      });
    }
  });

  safeSet('smartbill_ledger',
    newLedger.sort((a, b) => new Date(a.date) - new Date(b.date))
  );
};

// ─────────────────────────────────────────────
// REPAIR corrupt ledger data
// Fixes: SALE amounts that wrongly include previous balance,
//        orphaned PAYMENT entries missing invoiceId.
// ─────────────────────────────────────────────
export const repairLedgerData = () => {
  const ledger = safeGet('smartbill_ledger', []);
  const bills  = safeGet('smartbill_bills', []);
  if (!Array.isArray(ledger) || !Array.isArray(bills) || ledger.length === 0) return;

  let modified = false;

  const repaired = ledger.map(entry => {
    // Fix SALE amounts: must equal items subtotal + GST only
    if (entry.type === 'SALE' && entry.invoiceId) {
      const bill = bills.find(b => b.invoiceNo === entry.invoiceId && !b.isDeleted);
      if (bill && Array.isArray(bill.items) && bill.items.length > 0) {
        const itemsSubtotal = bill.items.reduce((s, i) => s + (parseFloat(i?.amount) || 0), 0);
        const gst = (parseFloat(bill.cgst) || 0) + (parseFloat(bill.sgst) || 0);
        const trueAmount = itemsSubtotal + gst;
        if (Math.abs(entry.amount - trueAmount) > 0.01) {
          modified = true;
          return { ...entry, amount: trueAmount };
        }
      }
    }

    // Fix orphan PAYMENT entries: link to invoice via desc
    if (entry.type === 'PAYMENT' && !entry.invoiceId && entry.desc) {
      const match = entry.desc.match(/^Paid for Bill #(.+)$/);
      if (match && match[1] && match[1] !== 'Unknown') {
        modified = true;
        return { ...entry, invoiceId: match[1] };
      }
    }

    return entry;
  });

  if (modified) {
    safeSet('smartbill_ledger', repaired);
  }
};
