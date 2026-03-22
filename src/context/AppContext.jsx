import React from 'react';
import { SettingsProvider, useSettings } from './SettingsContext';
import { InventoryProvider, useInventory } from './InventoryContext';
import { CustomerProvider, useCustomers } from './CustomerContext';
import { SupplierProvider, useSuppliers } from './SupplierContext';
import { TransactionProvider, useTransactions } from './TransactionContext';
import { BillProvider, useBills } from './BillContext';
import { AuditProvider, useAudit } from './AuditContext';

export const AppProvider = ({ children }) => {
  return (
    <AuditProvider>
      <SettingsProvider>
        <TransactionProvider>
          <CustomerProvider>
            <SupplierProvider>
              <InventoryProvider>
                <BillProvider>
                  {children}
                </BillProvider>
              </InventoryProvider>
            </SupplierProvider>
          </CustomerProvider>
        </TransactionProvider>
      </SettingsProvider>
    </AuditProvider>
  );
};

// Export a combined custom hook for backwards compatibility while pages are refactored
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
