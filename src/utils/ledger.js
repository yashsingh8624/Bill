import { safeGet, safeSet } from './storage';

/**
 * Recalculates exact totals for a specific customer based on ALL bills and transactions.
 * Returns { totalPurchases, totalPaid, outstandingBalance }
 * Updates the 'smartbill_customers' in localStorage directly to prevent stale state.
 */
export const syncCustomerTotals = (customerId) => {
  const bills = safeGet('smartbill_bills', []);
  const transactions = safeGet('smartbill_transactions', []);
  const customers = safeGet('smartbill_customers', []);

  const cBills = bills.filter(b => b.customerId === customerId && !b.isDeleted);
  const cTxns = transactions.filter(t => t.entityId === customerId);

  // Total Billed for all items in the bills (ignoring previous balance to prevent infinite duplication)
  const totalPurchases = cBills.reduce((sum, b) => {
    // Rely on totalAmount which evaluates just the base item + GST cost
    const itemsTotal = typeof b.totalAmount === 'number' ? b.totalAmount 
      : ((b.total || b.grandTotal || 0) - (b.prevBalanceIncluded || 0));
    return sum + Math.max(0, itemsTotal);
  }, 0);

  // Total Paid includes direct payments in Bill and standalone Transactions
  const totalPaid = cBills.reduce((sum, b) => sum + (b.amountPaid || 0), 0) + 
                    cTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
                    
  const outstandingBalance = Math.max(0, totalPurchases - totalPaid);

  const newTotals = { 
    totalPurchases, 
    totalPaid, 
    outstandingBalance 
  };

  const updatedCustomers = customers.map(c => 
    c.id === customerId ? { ...c, ...newTotals } : c
  );
  
  safeSet('smartbill_customers', updatedCustomers);
  return newTotals;
};
