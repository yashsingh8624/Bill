/**
 * LEDGER - Central Utility for Balance Calculations
 *
 * Provides helper functions to calculate totals from an array of ledger entries.
 * The context providers (Customer/Bill/Supplier Contexts) are responsible for 
 * loading and persisting ledger data via localStorage.
 * Ready for future Google Sheets integration.
 */

// Balance formula: SUM(SALE + OPENING) - SUM(PAYMENT + ROLLOVER)
export const calculateCustomerBalance = (ledger, customerId, customer = null) => {
  if (!customerId || !Array.isArray(ledger)) return 0;

  let balance = ledger
    .filter(e => e && String(e.customer_id) === String(customerId) && !e.is_void)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'SALE' || e.type === 'OPENING') return sum + amt;
      if (e.type === 'PAYMENT' || e.type === 'ROLLOVER') return sum - amt;
      return sum;
    }, 0);

  if (customer && customer.openingBalance) {
    balance += parseFloat(customer.openingBalance || 0);
  } else if (customer && customer.previous_balance) {
    balance += parseFloat(customer.previous_balance || 0);
  }

  return Math.max(0, balance); // Never return negative for simple UI
};

// Raw balance (can be negative = advance)
export const calculateCustomerRawBalance = (ledger, customerId, customer = null) => {
  if (!customerId || !Array.isArray(ledger)) return 0;

  let sum = ledger
    .filter(e => e && String(e.customer_id) === String(customerId) && !e.is_void)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'SALE' || e.type === 'OPENING') return sum + amt;
      if (e.type === 'PAYMENT' || e.type === 'ROLLOVER') return sum - amt;
      return sum;
    }, 0);

  if (customer && customer.openingBalance) {
    sum += parseFloat(customer.openingBalance || 0);
  } else if (customer && customer.previous_balance) {
    sum += parseFloat(customer.previous_balance || 0);
  }

  return sum;
};

// Supplier Balance
export const calculateSupplierBalance = (ledger, supplierId) => {
  if (!supplierId || !Array.isArray(ledger)) return 0;

  return ledger
    .filter(e => e && String(e.supplier_id) === String(supplierId) && !e.is_void)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'PURCHASE' || e.type === 'SUPPLIER_OPENING') return sum + amt;
      if (e.type === 'PAYMENT_MADE' || e.type === 'PAYMENT_OUT') return sum - amt;
      return sum;
    }, 0);
};

// Filtered Ledger Entries (Chronological)
export const getFilteredLedger = (ledger, entityId, type = 'customer') => {
  if (!entityId || !Array.isArray(ledger)) return [];

  const key = type === 'customer' ? 'customer_id' : 'supplier_id';
  return ledger
    .filter(e => e && String(e[key]) === String(entityId))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

