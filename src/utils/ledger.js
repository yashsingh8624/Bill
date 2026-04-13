/**
 * LEDGER - Central Utility for Balance Calculations
 *
 * All outstanding/balance calculations derive from ledger entries ONLY.
 * Formula: outstanding = totalBilled - totalPaid
 * No field is ever overwritten directly — it's always computed.
 */

// Helper: Check if entry is voided (handles both boolean and string 'TRUE')
const isVoided = (entry) => {
  if (!entry) return true;
  return entry.is_void === true || entry.is_void === 'TRUE';
};

// ========== CUSTOMER BALANCE ==========
// Formula: SUM(SALE + OPENING) - SUM(PAYMENT + ROLLOVER) + openingBalance
export const calculateCustomerBalance = (ledger, customerId, customer = null) => {
  if (!customerId || !Array.isArray(ledger)) return 0;

  let balance = ledger
    .filter(e => e && String(e.customer_id) === String(customerId) && !isVoided(e))
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      const type = String(e.type || '').toLowerCase();
      if (type === 'sale' || type === 'opening') return sum + amt;
      if (type === 'payment_in' || type === 'payment' || type === 'rollover') return sum - amt;
      return sum;
    }, 0);

  if (customer && customer.openingBalance) {
    balance += parseFloat(customer.openingBalance || 0);
  } else if (customer && customer.previous_balance) {
    balance += parseFloat(customer.previous_balance || 0);
  }

  return Math.max(0, balance); // Never return negative for simple UI
};

// Raw balance (can be negative = advance/overpaid)
export const calculateCustomerRawBalance = (ledger, customerId, customer = null) => {
  if (!customerId || !Array.isArray(ledger)) return 0;

  let sum = ledger
    .filter(e => e && String(e.customer_id) === String(customerId) && !isVoided(e))
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      const type = String(e.type || '').toLowerCase();
      if (type === 'sale' || type === 'opening') return sum + amt;
      if (type === 'payment_in' || type === 'payment' || type === 'rollover') return sum - amt;
      return sum;
    }, 0);

  if (customer && customer.openingBalance) {
    sum += parseFloat(customer.openingBalance || 0);
  } else if (customer && customer.previous_balance) {
    sum += parseFloat(customer.previous_balance || 0);
  }

  return sum;
};

// ========== SUPPLIER BALANCE ==========
// Formula: outstanding = SUM(PURCHASE + SUPPLIER_OPENING) - SUM(PAYMENT_MADE + PAYMENT_OUT)
// Positive = you owe the supplier, Negative = supplier overpaid (advance)
export const calculateSupplierBalance = (ledger, supplierId, supplier = null) => {
  if (!supplierId || !Array.isArray(ledger)) return 0;

  let balance = ledger
    .filter(e => e && String(e.supplier_id) === String(supplierId) && !isVoided(e))
    .reduce((sum, e) => {
      const amt = parseFloat(e?.amount || 0);
      const type = String(e.type || '').toLowerCase();
      // Bills/purchases ADD to what you owe
      if (type === 'purchase' || type === 'supplier_opening') return sum + amt;
      // Payments SUBTRACT from what you owe
      if (type === 'payment_out' || type === 'payment_made') return sum - amt;
      return sum;
    }, 0);

  if (supplier && supplier.openingBalance) {
    balance += parseFloat(supplier.openingBalance || 0);
  } else if (supplier && supplier.previous_balance) {
    balance += parseFloat(supplier.previous_balance || 0);
  }

  return balance;
};

// ========== FILTERED LEDGER ENTRIES ==========
// Returns chronological non-voided entries for a specific entity
export const getFilteredLedger = (ledger, entityId, type = 'customer') => {
  if (!entityId || !Array.isArray(ledger)) return [];

  const key = type === 'customer' ? 'customer_id' : 'supplier_id';
  return ledger
    .filter(e => e && String(e[key]) === String(entityId) && !isVoided(e))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};
