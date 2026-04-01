/**
 * LEDGER - Central Utility for Balance Calculations
 *
 * This file no longer interacts with localStorage directly.
 * Instead, it provides helper functions to calculate totals from an array of ledger entries.
 * The context providers (Customer/Bill/Supplier Contexts) will be responsible for 
 * fetching the ledger data from Supabase and maintaining it in state.
 */

// Balance formula: SUM(SALE + OPENING) - SUM(PAYMENT + ROLLOVER)
export const calculateCustomerBalance = (ledger, customerId) => {
  if (!customerId || !Array.isArray(ledger)) return 0;

  const balance = ledger
    .filter(e => e && e.customer_id === customerId && !e.is_void)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'SALE' || e.type === 'OPENING') return sum + amt;
      if (e.type === 'PAYMENT' || e.type === 'ROLLOVER') return sum - amt;
      return sum;
    }, 0);

  return Math.max(0, balance); // Never return negative for simple UI
};

// Raw balance (can be negative = advance)
export const calculateCustomerRawBalance = (ledger, customerId) => {
  if (!customerId || !Array.isArray(ledger)) return 0;

  return ledger
    .filter(e => e && e.customer_id === customerId && !e.is_void)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'SALE' || e.type === 'OPENING') return sum + amt;
      if (e.type === 'PAYMENT' || e.type === 'ROLLOVER') return sum - amt;
      return sum;
    }, 0);
};

// Supplier Balance
export const calculateSupplierBalance = (ledger, supplierId) => {
  if (!supplierId || !Array.isArray(ledger)) return 0;

  return ledger
    .filter(e => e && e.supplier_id === supplierId && !e.is_void)
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      if (e.type === 'PURCHASE' || e.type === 'SUPPLIER_OPENING') return sum + amt;
      if (e.type === 'PAYMENT_MADE') return sum - amt;
      return sum;
    }, 0);
};

// Filtered Ledger Entries (Chronological)
export const getFilteredLedger = (ledger, entityId, type = 'customer') => {
  if (!entityId || !Array.isArray(ledger)) return [];

  const key = type === 'customer' ? 'customer_id' : 'supplier_id';
  return ledger
    .filter(e => e && e[key] === entityId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};
