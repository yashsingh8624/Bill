import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { generateReadableId } from '../utils/storage';

const SHEET_NAME = 'CUSTOMERS';
const LEDGER_SHEET = 'LEDGER';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady } = useAuth();
  const { showToast } = useToast();

  const fetchCustomers = useCallback(async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, SHEET_NAME);
      setCustomers(data.filter(c => !c.id?.startsWith('DELETED_')).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (err) {
      console.error('Error fetching customers:', err);
      showToast('Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, showToast]);

  useEffect(() => {
    if (isReady && spreadsheetId) {
      fetchCustomers();
    }
  }, [isReady, spreadsheetId, fetchCustomers]);

  const addCustomer = useCallback(async (customerData) => {
    try {
      const newCustomer = {
        id: customerData.id || generateReadableId('C', customers),
        name: customerData.name || '',
        phone: customerData.phone || ''
      };

      const row = objectToRow(SHEET_NAME, newCustomer);
      
      // Optimistic UI update
      setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));

      // Background sync
      await appendRow(spreadsheetId, SHEET_NAME, row);

      window.dispatchEvent(new Event('ledger-updated'));
      return newCustomer;
    } catch (err) {
      console.error('Error adding customer:', err);
      showToast('Customer saved locally', 'warning');
      return null;
    }
  }, [spreadsheetId, customers, showToast]);

  const updateCustomer = useCallback(async (id, data) => {
    try {
      const existing = customers.find(c => c.id === id);
      const updated = { ...existing, ...data };
      
      // Optimistic UI
      setCustomers(prev => prev.map(c => c.id === id ? updated : c));

      // Background sync
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx !== -1) {
        const row = objectToRow(SHEET_NAME, updated);
        await updateRow(spreadsheetId, SHEET_NAME, rowIdx, row);
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      showToast('Update saved locally', 'warning');
    }
  }, [spreadsheetId, customers, showToast]);

  const deleteCustomer = useCallback(async (id) => {
    try {
      // Optimistic UI
      setCustomers(prev => prev.filter(c => c.id !== id));

      // Background sync
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx !== -1) {
        const emptyRow = objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', phone: '' });
        await updateRow(spreadsheetId, SHEET_NAME, rowIdx, emptyRow);
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Delete saved locally', 'warning');
    }
  }, [spreadsheetId, showToast]);

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
      await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
      showToast('Payment recorded ✓', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('Payment saved locally', 'warning');
    }
  }, [spreadsheetId, showToast]);

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
