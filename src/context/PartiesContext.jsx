import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, appendRows, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { getCollectionData, addDocument, updateDocument, softDeleteDocument, subscribeToCollection } from '../utils/firestoreService';
import { generateReadableId, generateId } from '../utils/storage';

const SHEET_NAME = 'PARTIES';
const LEDGER_SHEET = 'LEDGER';
const CUSTOMERS_OLD = 'CUSTOMERS';
const SUPPLIERS_OLD = 'SUPPLIERS';

const PartiesContext = createContext();

export const PartiesProvider = ({ children }) => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady, useFirebase, firebaseUid } = useAuth();
  const { showToast } = useToast();
  const unsubCustomersRef = useRef(null);
  const unsubSuppliersRef = useRef(null);

  // Process raw Firestore data into party objects
  const processParties = useCallback((data) => {
    return data
      .map(p => ({
        ...p,
        type: p.type || 'customer',
        businessName: p.business_name || p.businessName || ''
      }))
      .filter(p => !p.id?.startsWith('DELETED_'))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, []);

  // ===== FIREBASE: Real-time onSnapshot =====
  useEffect(() => {
    if (!isReady || !useFirebase) return;

    console.log('[PartiesContext] 🔴 Setting up real-time listeners for customers & suppliers');
    setLoading(true);
    let custData = [];
    let suppData = [];
    let custLoaded = false;
    let suppLoaded = false;

    const mergeAndSet = () => {
      if (custLoaded && suppLoaded) {
        const merged = [
          ...custData.map(c => ({ ...c, type: c.type || 'customer' })),
          ...suppData.map(s => ({ ...s, type: s.type || 'supplier' }))
        ];
        setParties(processParties(merged));
        setLoading(false);
        console.log(`[PartiesContext] 🔴 LIVE: ${custData.length} customers + ${suppData.length} suppliers`);
      }
    };

    // Subscribe to customers
    unsubCustomersRef.current = subscribeToCollection('customers', (data) => {
      custData = data;
      custLoaded = true;
      mergeAndSet();
    }, (err) => {
      console.error('[PartiesContext] Customers snapshot error:', err);
      custLoaded = true;
      mergeAndSet();
    }, firebaseUid);

    // Subscribe to suppliers
    unsubSuppliersRef.current = subscribeToCollection('suppliers', (data) => {
      suppData = data;
      suppLoaded = true;
      mergeAndSet();
    }, (err) => {
      console.error('[PartiesContext] Suppliers snapshot error:', err);
      suppLoaded = true;
      mergeAndSet();
    }, firebaseUid);

    return () => {
      if (unsubCustomersRef.current) unsubCustomersRef.current();
      if (unsubSuppliersRef.current) unsubSuppliersRef.current();
    };
  }, [isReady, useFirebase, firebaseUid, processParties]);

  // ===== SHEETS: one-time fetch =====
  const fetchPartiesSheets = useCallback(async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      let data = await getSheetData(spreadsheetId, SHEET_NAME);
      
      // ONE-TIME MIGRATION LOGIC
      if (data.length === 0) {
        console.log('[Migration] PARTIES sheet is empty. Checking legacy data...');
        const oldCustomers = await getSheetData(spreadsheetId, CUSTOMERS_OLD);
        const oldSuppliers = await getSheetData(spreadsheetId, SUPPLIERS_OLD);
        
        if (oldCustomers.length > 0 || oldSuppliers.length > 0) {
          const migratedData = [
            ...oldCustomers.map(c => ({ ...c, type: 'customer', business_name: c.business_name || c.businessName || '', address: c.address || '', gstin: c.gstin || '', previous_balance: c.previous_balance || '0' })),
            ...oldSuppliers.map(s => ({ ...s, type: 'supplier', business_name: s.business_name || s.businessName || '', address: s.address || '', gstin: s.gstin || '', previous_balance: s.previous_balance || '0' }))
          ];
          
          if (migratedData.length > 0) {
            const rows = migratedData.map(p => objectToRow(SHEET_NAME, p));
            await appendRows(spreadsheetId, SHEET_NAME, rows);
            data = migratedData;
            showToast('Data migrated to unified Parties system', 'success');
          }
        }
      }

      setParties(processParties(data));
    } catch (err) {
      console.error('Error fetching parties (Sheets):', err);
      showToast('Error loading parties', 'error');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, showToast, processParties]);

  useEffect(() => {
    if (!isReady || useFirebase) return;
    fetchPartiesSheets();
  }, [isReady, useFirebase, fetchPartiesSheets]);

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

      // Optimistic update for Sheets mode (Firebase auto-updates via onSnapshot)
      if (!useFirebase) {
        const partyForUI = { ...newParty, businessName: newParty.business_name };
        setParties(prev => [...prev, partyForUI].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }

      if (useFirebase) {
        // Write to the collection matching the type (customers or suppliers)
        const collName = type === 'customer' ? 'customers' : 'suppliers';
        await addDocument(collName, newParty);
        console.log(`[PartiesContext] ✅ Added ${type} to Firestore`);
        
        // Opening balance for suppliers
        if (type === 'supplier' && parseFloat(newParty.previous_balance) > 0) {
          const ledgerEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            customer_id: '', supplier_id: newParty.id,
            party_id: newParty.id,
            party_name: newParty.name,
            party_type: 'supplier',
            type: 'SUPPLIER_OPENING', invoice_id: '',
            amount: String(newParty.previous_balance),
            description: 'Opening Balance', is_void: 'FALSE',
            created_at: new Date().toISOString()
          };
          await addDocument('transactions', ledgerEntry);
          window.dispatchEvent(new Event('ledger-updated'));
        }
      } else {
        const row = objectToRow(SHEET_NAME, newParty);
        await appendRow(spreadsheetId, SHEET_NAME, row);
        
        if (type === 'supplier' && parseFloat(newParty.previous_balance) > 0) {
          const ledgerEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            customer_id: '', supplier_id: newParty.id,
            type: 'SUPPLIER_OPENING', invoice_id: '',
            amount: String(newParty.previous_balance),
            description: 'Opening Balance', is_void: 'FALSE',
            created_at: new Date().toISOString()
          };
          await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
          window.dispatchEvent(new Event('ledger-updated'));
        }
      }

      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} added successfully`, 'success');
      return newParty;
    } catch (err) {
      console.error('Error adding party:', err);
      showToast('Failed to add party: ' + (err.message || 'Unknown error'), 'error');
      return null;
    }
  }, [spreadsheetId, parties, showToast, useFirebase]);

  const updateParty = useCallback(async (id, data) => {
    try {
      const existing = parties.find(p => p.id === id);
      if (!existing) return;
      const updated = { ...existing, ...data };
      if (data.businessName) updated.business_name = data.businessName;
      
      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setParties(prev => prev.map(p => p.id === id ? updated : p));
      }

      if (useFirebase) {
        const collName = existing.type === 'supplier' ? 'suppliers' : 'customers';
        await updateDocument(collName, id, data);
      } else {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
        if (rowIdx !== -1) {
          await updateRow(spreadsheetId, SHEET_NAME, rowIdx, objectToRow(SHEET_NAME, updated));
        }
      }
      showToast('Party updated', 'success');
    } catch (err) {
      console.error('Error updating party:', err);
      showToast('Update failed', 'warning');
    }
  }, [spreadsheetId, parties, showToast, useFirebase]);

  const deleteParty = useCallback(async (id) => {
    try {
      const existing = parties.find(p => p.id === id);
      
      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setParties(prev => prev.filter(p => p.id !== id));
      }

      if (useFirebase) {
        const collName = existing?.type === 'supplier' ? 'suppliers' : 'customers';
        await softDeleteDocument(collName, id);
      } else {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
        if (rowIdx !== -1) {
          await updateRow(spreadsheetId, SHEET_NAME, rowIdx, objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', type: 'DELETED' }));
        }
      }
      showToast('Party deleted', 'success');
    } catch (err) {
      console.error('Error deleting party:', err);
      showToast('Delete failed', 'warning');
    }
  }, [spreadsheetId, parties, showToast, useFirebase]);

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

      if (useFirebase) {
        await addDocument('transactions', ledgerEntry);
      } else {
        await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
        // Also write to ALL_TRANSACTIONS sheet
        const allTxnEntry = { id: ledgerEntry.id, date: ledgerEntry.date, customer_id: customerId, party_id: customerId, customer_name: resolvedName, type: 'Payment In', amount: ledgerEntry.amount };
        await appendRow(spreadsheetId, 'ALL_TRANSACTIONS', objectToRow('ALL_TRANSACTIONS', allTxnEntry));
      }

      showToast('Payment recorded ✓', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('Payment failed: ' + (err.message || 'Unknown error'), 'error');
    }
  }, [spreadsheetId, parties, showToast, useFirebase]);

  // Supplier payment
  const addSupplierPayment = useCallback(async (supplierId, amount, date, notes) => {
    try {
      const resolvedName = parties.find(p => p.id === supplierId)?.name || 'Unknown';
      const ledgerEntry = {
        id: generateId(),
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

      if (useFirebase) {
        await addDocument('transactions', ledgerEntry);
      } else {
        await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
        const allTxnPay = { id: ledgerEntry.id, date: ledgerEntry.date, supplier_id: supplierId, party_id: supplierId, customer_name: resolvedName, type: 'Payment Out', amount: ledgerEntry.amount };
        await appendRow(spreadsheetId, 'ALL_TRANSACTIONS', objectToRow('ALL_TRANSACTIONS', allTxnPay));
      }

      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Payment recorded ✓', 'success');
    } catch (err) {
      console.error('Error recording supplier payment:', err);
      showToast('Failed to record payment: ' + (err.message || 'Unknown error'), 'error');
    }
  }, [spreadsheetId, parties, showToast, useFirebase]);

  // Supplier invoice
  const addSupplierInvoice = useCallback(async (supplierId, amount, date, notes, invoiceNo) => {
    try {
      const resolvedName = parties.find(p => p.id === supplierId)?.name || 'Unknown';
      const ledgerEntry = {
        id: generateId(),
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

      if (useFirebase) {
        await addDocument('transactions', ledgerEntry);
      } else {
        await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
        const allTxnInv = { id: ledgerEntry.id, date: ledgerEntry.date, supplier_id: supplierId, party_id: supplierId, customer_name: resolvedName, type: 'Purchase', amount: ledgerEntry.amount };
        await appendRow(spreadsheetId, 'ALL_TRANSACTIONS', objectToRow('ALL_TRANSACTIONS', allTxnInv));
      }

      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Invoice recorded ✓', 'success');
    } catch (err) {
      console.error('Error recording supplier invoice:', err);
      showToast('Failed to record invoice: ' + (err.message || 'Unknown error'), 'error');
    }
  }, [spreadsheetId, parties, showToast, useFirebase]);

  const customers = useMemo(() => parties.filter(p => p.type === 'customer'), [parties]);
  const suppliers = useMemo(() => parties.filter(p => p.type === 'supplier'), [parties]);

  const refreshParties = useCallback(async () => {
    if (useFirebase) {
      console.log('[PartiesContext] Firebase mode — data is live, no manual refresh needed');
      return;
    }
    await fetchPartiesSheets();
  }, [useFirebase, fetchPartiesSheets]);

  const contextValue = useMemo(() => ({
    parties, customers, suppliers, loading,
    addParty, updateParty, deleteParty,
    addCustomer: (data) => addParty({ ...data, type: 'customer' }),
    updateCustomer: updateParty, deleteCustomer: deleteParty,
    addSupplier: (data) => addParty({ ...data, type: 'supplier' }),
    updateSupplier: updateParty, deleteSupplier: deleteParty,
    addCustomerPayment, addSupplierPayment, addSupplierInvoice,
    refreshParties, refreshCustomers: refreshParties, refreshSuppliers: refreshParties
  }), [parties, customers, suppliers, loading, addParty, updateParty, deleteParty, addCustomerPayment, addSupplierPayment, addSupplierInvoice, refreshParties]);

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
