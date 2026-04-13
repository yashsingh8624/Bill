import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

import { getCollectionData, addDocument, updateDocument, softDeleteDocument, addPaymentTransaction, addInvoiceTransaction } from '../utils/firestoreService';
import { generateReadableId } from '../utils/storage';



const PartiesContext = createContext();

export const PartiesProvider = ({ children }) => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isReady } = useAuth();
  const { showToast } = useToast();

  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);

      // Read from Firestore
      console.log('[Parties] Reading from Firestore...');

      // Try 'parties' collection first, then fall back to customers+suppliers
      let data = await getCollectionData('parties');

      if (data.length === 0) {
        // Check if data is in separate collections (from earlier writes)
        const [custData, suppData] = await Promise.all([
          getCollectionData('customers'),
          getCollectionData('suppliers')
        ]);
        data = [
          ...custData.map(c => ({ ...c, type: c.type || 'customer' })),
          ...suppData.map(s => ({ ...s, type: s.type || 'supplier' }))
        ];
        console.log(`[Parties] Found ${custData.length} customers + ${suppData.length} suppliers from separate collections`);
      }

      const processed = data
        .map(p => ({
          ...p,
          type: p.type || 'customer',
          businessName: p.business_name || p.businessName || ''
        }))
        .filter(p => !p.id?.startsWith('DELETED_'))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setParties(processed);
      console.log(`[Parties] Loaded ${processed.length} parties from Firestore`);
    } catch (err) {
      console.error('Error fetching parties:', err);
      showToast('Error loading parties', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Wait for isReady
  useEffect(() => {
    if (!isReady) return;
    fetchParties();
  }, [isReady, fetchParties]);

  const addParty = useCallback(async (partyData) => {
    try {
      const type = partyData.type || 'customer';
      const newParty = {
        id: partyData.id || generateReadableId(type === 'customer' ? 'C' : 'S', parties),
        name: partyData.name || '',
        phone: partyData.phone || '',
        business_name: partyData.business_name || partyData.businessName || '',
        address: partyData.address || '',
        gstin: partyData.gstin || '',
        type: type,
        previous_balance: String(partyData.previous_balance || partyData.openingBalance || 0),
        openingBalance: String(partyData.openingBalance || partyData.previous_balance || 0),
        created_at: new Date().toISOString()
      };

      const partyForUI = { ...newParty, businessName: newParty.business_name };
      setParties(prev => [...prev, partyForUI].sort((a, b) => (a.name || '').localeCompare(b.name || '')));

      // Write to the collection matching the type (customers or suppliers)
      const collName = type === 'customer' ? 'customers' : 'suppliers';
      await addDocument(collName, newParty);

      // Opening balance for suppliers
      if (type === 'supplier' && parseFloat(newParty.previous_balance) > 0) {
        const ledgerEntry = {
          id: generateReadableId('L', []),
          date: new Date().toISOString(),
          customer_id: '', supplier_id: newParty.id,
          type: 'SUPPLIER_OPENING', invoice_id: '',
          amount: String(newParty.previous_balance),
          description: 'Opening Balance', is_void: 'FALSE',
          created_at: new Date().toISOString()
        };
        await addPaymentTransaction({}, ledgerEntry);
        window.dispatchEvent(new Event('ledger-updated'));
      }

      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`, 'success');
      return newParty;
    } catch (err) {
      console.error('Error adding party:', err);
      showToast('Failed to add party', 'error');
      return null;
    }
   }, [parties, showToast]);

  const updateParty = useCallback(async (id, data) => {
    try {
      const existing = parties.find(p => p.id === id);
      if (!existing) return;
      const updated = { ...existing, ...data };
      if (data.businessName) updated.business_name = data.businessName;
      
      setParties(prev => prev.map(p => p.id === id ? updated : p));

      const collName = existing.type === 'supplier' ? 'suppliers' : 'customers';
      await updateDocument(collName, id, data);
      showToast('Party updated', 'success');
    } catch (err) {
      console.error('Error updating party:', err);
      showToast('Update failed', 'warning');
    }
   }, [parties, showToast]);

  const deleteParty = useCallback(async (id) => {
    try {
      const existing = parties.find(p => p.id === id);
      setParties(prev => prev.filter(p => p.id !== id));

      const collName = existing?.type === 'supplier' ? 'suppliers' : 'customers';
      await softDeleteDocument(collName, id);
      showToast('Party deleted', 'success');
    } catch (err) {
      console.error('Error deleting party:', err);
      showToast('Delete failed', 'warning');
    }
   }, [parties, showToast]);

  // Customer payment
  const addCustomerPayment = useCallback(async (customerId, amount, date, notes, paymentMethod = 'Cash', receiptNo = '', explicitCustomerName = '') => {
    try {
      const resolvedName = explicitCustomerName || parties.find(p => p.id === customerId)?.name || 'Unknown';
      const finalDescription = `[${paymentMethod}] ${notes || 'Direct Payment'}`;
      const ledgerEntry = {
        id: receiptNo || Math.random().toString(36).substring(2, 10).toUpperCase(),
        date: date || new Date().toISOString(),
        customer_id: customerId, supplier_id: '',
        party_id: customerId,
        party_name: resolvedName,
        party_type: 'customer',
        type: 'PAYMENT', invoice_id: '',
        amount: String(parseFloat(amount)),
        description: finalDescription, is_void: 'FALSE',
        created_at: new Date().toISOString()
      };

      await addPaymentTransaction({}, ledgerEntry);

      showToast('Payment recorded ✓', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('Payment failed', 'error');
    }
   }, [parties, showToast]);

  // Supplier payment
  const addSupplierPayment = useCallback(async (supplierId, amount, date, notes) => {
    try {
      const resolvedName = parties.find(p => p.id === supplierId)?.name || 'Supplier';
      const ledgerEntry = {
        id: generateReadableId('L', []),
        date: date || new Date().toISOString(),
        customer_id: '', supplier_id: supplierId,
        party_id: supplierId,
        party_name: resolvedName,
        party_type: 'supplier',
        type: 'PAYMENT_MADE', invoice_id: '',
        amount: String(parseFloat(amount)),
        description: notes || 'Payment Made', is_void: 'FALSE',
        created_at: new Date().toISOString()
      };

      await addPaymentTransaction({}, ledgerEntry);

      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Payment recorded ✓', 'success');

      // Refresh data immediately
      setTimeout(() => {
        fetchParties();
      }, 100);
    } catch (err) {
      console.error('Error recording supplier payment:', err);
      showToast('Failed to record payment', 'error');
    }
   }, [parties, showToast]);

  // Supplier invoice
  const addSupplierInvoice = useCallback(async (supplierId, amount, date, notes, invoiceNo) => {
    try {
      const resolvedName = parties.find(p => p.id === supplierId)?.name || 'Supplier';
      const ledgerEntry = {
        id: generateReadableId('L', []),
        date: date || new Date().toISOString(),
        customer_id: '', supplier_id: supplierId,
        party_id: supplierId,
        party_name: resolvedName,
        party_type: 'supplier',
        type: 'PURCHASE', invoice_id: invoiceNo || '',
        amount: String(parseFloat(amount)),
        description: `Inv: ${invoiceNo}${notes ? ' - ' + notes : ''}`,
        is_void: 'FALSE', created_at: new Date().toISOString()
      };

      await addPaymentTransaction({}, ledgerEntry);

      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Invoice recorded ✓', 'success');

      // Refresh data immediately
      setTimeout(() => {
        fetchParties();
      }, 100);
    } catch (err) {
      console.error('Error recording supplier invoice:', err);
      showToast('Failed to record invoice', 'error');
    }
   }, [parties, showToast]);

  const customers = useMemo(() => parties.filter(p => p.type === 'customer'), [parties]);
  const suppliers = useMemo(() => parties.filter(p => p.type === 'supplier'), [parties]);

  const contextValue = useMemo(() => ({
    parties, customers, suppliers, loading,
    addParty, updateParty, deleteParty,
    addCustomer: (data) => addParty({ ...data, type: 'customer' }),
    updateCustomer: updateParty, deleteCustomer: deleteParty,
    addSupplier: (data) => addParty({ ...data, type: 'supplier' }),
    updateSupplier: updateParty, deleteSupplier: deleteParty,
    addCustomerPayment, addSupplierPayment, addSupplierInvoice,
    refreshParties: fetchParties, refreshCustomers: fetchParties, refreshSuppliers: fetchParties
  }), [parties, customers, suppliers, loading, addParty, updateParty, deleteParty, addCustomerPayment, addSupplierPayment, addSupplierInvoice, fetchParties]);

  return (
    <PartiesContext.Provider value={contextValue}>
      {children}
    </PartiesContext.Provider>
  );
};

export const useParties = () => useContext(PartiesContext);
export const useCustomers = () => {
    const context = useContext(PartiesContext);
    if (!context) return { customers: [], loading: false };
    return {
        customers: context.customers, loading: context.loading,
        addCustomer: context.addCustomer, updateCustomer: context.updateCustomer,
        deleteCustomer: context.deleteCustomer, addCustomerPayment: context.addCustomerPayment,
        refreshCustomers: context.refreshCustomers
    };
};
export const useSuppliers = () => {
    const context = useContext(PartiesContext);
    if (!context) return { suppliers: [], loading: false };
    return {
        suppliers: context.suppliers, loading: context.loading,
        addSupplier: context.addSupplier, updateSupplier: context.updateSupplier,
        deleteSupplier: context.deleteSupplier, addSupplierPayment: context.addSupplierPayment,
        addSupplierInvoice: context.addSupplierInvoice, refreshSuppliers: context.refreshSuppliers
    };
};
