import React from 'react';
import { AuthProvider } from './AuthContext';
import { SettingsProvider, useSettings } from './SettingsContext';
import { InventoryProvider, useInventory } from './InventoryContext';
import { CustomerProvider, useCustomers } from './CustomerContext';
import { SupplierProvider, useSuppliers } from './SupplierContext';
import { TransactionProvider, useTransactions } from './TransactionContext';
import { BillProvider, useBills } from './BillContext';
import { AuditProvider, useAudit } from './AuditContext';

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <AuditProvider>
        <SettingsProvider>
          <CustomerProvider>
            <SupplierProvider>
              <InventoryProvider>
                <BillProvider>
                  <TransactionProvider>
                    {children}
                  </TransactionProvider>
                </BillProvider>
              </InventoryProvider>
            </SupplierProvider>
          </CustomerProvider>
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
   
   return {
      ...settings,
      ...inventory,
      ...customers,
      ...suppliers,
      ...bills,
      ...transactions,
      ...audit
   };
};
