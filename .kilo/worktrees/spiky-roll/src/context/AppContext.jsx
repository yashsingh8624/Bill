import React from 'react';
import { AuthProvider } from './AuthContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { InventoryProvider, useInventory } from './InventoryContext';
import { PartiesProvider, useCustomers, useSuppliers } from './PartiesContext';
import { TransactionProvider, useTransactions } from './TransactionContext';
import { BillProvider, useBills } from './BillContext';
import { AuditProvider, useAudit } from './AuditContext';
import { ExpenseProvider, useExpenses } from './ExpenseContext';

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <AuditProvider>
        <SettingsProvider>
          <PartiesProvider>
            <InventoryProvider>
              <BillProvider>
                <ExpenseProvider>
                  <TransactionProvider>
                    {children}
                  </TransactionProvider>
                </ExpenseProvider>
              </BillProvider>
            </InventoryProvider>
          </PartiesProvider>
        </SettingsProvider>
      </AuditProvider>
    </AuthProvider>
  );
};

// Export a combined custom hook for backwards compatibility
export const useAppContext = () => {
   const settings = useSettings();
   const inventory = useInventory();
   const customers = useCustomers();
   const suppliers = useSuppliers();
   const bills = useBills();
   const transactions = useTransactions();
   const audit = useAudit();
   const expenses = useExpenses();
   
   return {
      ...settings,
      ...inventory,
      ...customers,
      ...suppliers,
      ...bills,
      ...transactions,
      ...audit,
      ...expenses
   };
};
