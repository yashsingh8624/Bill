import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { getCollectionData, addDocument, updateDocument, softDeleteDocument } from '../utils/firestoreService';
import { generateReadableId } from '../utils/storage';

const SHEET_NAME = 'CUSTOMERS';
const LEDGER_SHEET = 'LEDGER';
const FIRESTORE_COLLECTION = 'customers';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady, useFirebase } = useAuth();
  const { showToast } = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      if (useFirebase) {
        const data = await getCollectionData(FIRESTORE_COLLECTION);
        setCustomers(
          data.filter(c => !c.id?.startsWith('DELETED_'))
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        );
      } else {
        if (!spreadsheetId) return;
        const data = await getSheetData(spreadsheetId, SHEET_NAME);
        setCustomers(data.filter(c => !c.id?.startsWith('DELETED_')).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      showToast('Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, showToast, useFirebase]);

  // KEY FIX: Always wait for isReady before fetching
  useEffect(() => {
    if (!isReady) return;
    fetchCustomers();
  }, [isReady, fetchCustomers]);

  const addCustomer = useCallback(async (customerData) => {
    try {
      const newCustomer = {
        id: customerData.id || generateReadableId('C', customers),
        name: customerData.name || '',
        phone: customerData.phone || ''
      };

      setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));

      if (useFirebase) {
        await addDocument(FIRESTORE_COLLECTION, newCustomer);
      } else {
        const row = objectToRow(SHEET_NAME, newCustomer);
        await appendRow(spreadsheetId, SHEET_NAME, row);
      }

      window.dispatchEvent(new Event('ledger-updated'));
      return newCustomer;
    } catch (err) {
      console.error('Error adding customer:', err);
      showToast('Failed to add customer', 'error');
      return null;
    }
  }, [spreadsheetId, customers, showToast, useFirebase]);

  const updateCustomer = useCallback(async (id, data) => {
    try {
      const existing = customers.find(c => c.id === id);
      const updated = { ...existing, ...data };
      setCustomers(prev => prev.map(c => c.id === id ? updated : c));

      if (useFirebase) {
        await updateDocument(FIRESTORE_COLLECTION, id, data);
      } else {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
        if (rowIdx !== -1) {
          await updateRow(spreadsheetId, SHEET_NAME, rowIdx, objectToRow(SHEET_NAME, updated));
        }
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      showToast('Failed to update customer', 'error');
    }
  }, [spreadsheetId, customers, showToast, useFirebase]);

  const deleteCustomer = useCallback(async (id) => {
    try {
      setCustomers(prev => prev.filter(c => c.id !== id));

      if (useFirebase) {
        await softDeleteDocument(FIRESTORE_COLLECTION, id);
      } else {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
        if (rowIdx !== -1) {
          const emptyRow = objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', phone: '' });
          await updateRow(spreadsheetId, SHEET_NAME, rowIdx, emptyRow);
        }
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Failed to delete customer', 'error');
    }
  }, [spreadsheetId, showToast, useFirebase]);

  const addCustomerPayment = useCallback(async (customerId, amount, date, notes) => {
    try {
      const ledgerEntry = {
        id: Math.random().toString(36).substring(2, 10).toUpperCase(),
        date: date || new Date().toISOString(),
        customer_id: customerId,
        supplier_id: '',
        type: 'PAYMENT',
        invoice_id: '',
        amount: String(parseFloat(amount)),
        description: notes || 'Direct Payment',
        is_void: 'FALSE',
        created_at: new Date().toISOString()
      };

      if (useFirebase) {
        await addDocument('ledger', ledgerEntry);
      } else {
        await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
      }

      showToast('Payment recorded ✓', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('Failed to record payment', 'error');
    }
  }, [spreadsheetId, showToast, useFirebase]);

  const contextValue = useMemo(() => ({
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addCustomerPayment,
    refreshCustomers: fetchCustomers
  }), [customers, loading, addCustomer, updateCustomer, deleteCustomer, addCustomerPayment, fetchCustomers]);

  return (
    <CustomerContext.Provider value={contextValue}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => useContext(CustomerContext);
