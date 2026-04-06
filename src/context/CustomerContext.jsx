import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { generateId, generateReadableId } from '../utils/storage';

const SHEET_NAME = 'CUSTOMERS';
const LEDGER_SHEET = 'LEDGER';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady } = useAuth();
  const { showToast } = useToast();

  // Fetch customers from Google Sheets
  const fetchCustomers = async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, SHEET_NAME);
      setCustomers(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (err) {
      console.error('Error fetching customers:', err);
      showToast('Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && spreadsheetId) {
      fetchCustomers();
    }
  }, [isReady, spreadsheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addCustomer = async (customerData) => {
    try {
      const newCustomer = {
        id: customerData.id || generateReadableId('C', customers),
        name: customerData.name || '',
        phone: customerData.phone || ''
      };

      const row = objectToRow(SHEET_NAME, newCustomer);
      await appendRow(spreadsheetId, SHEET_NAME, row);

      setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
      window.dispatchEvent(new Event('ledger-updated'));
      return newCustomer;
    } catch (err) {
      console.error('Error adding customer:', err);
      showToast('Failed to add customer', 'error');
      return null;
    }
  };

  const updateCustomer = async (id, data) => {
    try {
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx === -1) throw new Error('Customer not found');

      const existing = customers.find(c => c.id === id);
      const updated = { ...existing, ...data };
      const row = objectToRow(SHEET_NAME, updated);
      await updateRow(spreadsheetId, SHEET_NAME, rowIdx, row);

      setCustomers(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      console.error('Error updating customer:', err);
      showToast('Failed to update customer', 'error');
    }
  };

  const deleteCustomer = async (id) => {
    try {
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx === -1) throw new Error('Customer not found');

      // Clear the row (mark as deleted by blanking it)
      const emptyRow = objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', phone: '' });
      await updateRow(spreadsheetId, SHEET_NAME, rowIdx, emptyRow);

      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting customer:', err);
      showToast('Failed to delete customer', 'error');
    }
  };

  const addCustomerPayment = async (customerId, amount, date, notes) => {
    try {
      const ledgerEntry = {
        id: generateId(),
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
      showToast('Payment recorded successfully', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('Failed to record payment', 'error');
    }
  };

  return (
    <CustomerContext.Provider value={{
      customers,
      loading,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addCustomerPayment,
      refreshCustomers: fetchCustomers
    }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => useContext(CustomerContext);
