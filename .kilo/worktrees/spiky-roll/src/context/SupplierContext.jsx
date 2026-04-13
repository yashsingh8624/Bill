import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { getCollectionData, addDocument, updateDocument, softDeleteDocument } from '../utils/firestoreService';
import { generateId } from '../utils/storage';

const SHEET_NAME = 'SUPPLIERS';
const LEDGER_SHEET = 'LEDGER';
const FIRESTORE_COLLECTION = 'suppliers';

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady, useFirebase } = useAuth();
  const { showToast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      if (useFirebase) {
        const data = await getCollectionData(FIRESTORE_COLLECTION);
        const processed = data
          .map(s => ({ ...s, type: s.type || 'supplier' }))
          .filter(s => !s.id?.startsWith('DELETED_') && s.type === 'supplier')
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setSuppliers(processed);
      } else {
        if (!spreadsheetId) return;
        const data = await getSheetData(spreadsheetId, SHEET_NAME);
        const processed = data
          .map(s => ({ ...s, type: s.type || 'supplier' }))
          .filter(s => !s.id.startsWith('DELETED_') && s.type === 'supplier')
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setSuppliers(processed);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      showToast('Error loading suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // KEY FIX: Always wait for isReady
  useEffect(() => {
    if (!isReady) return;
    fetchSuppliers();
  }, [isReady, spreadsheetId, useFirebase]); // eslint-disable-line react-hooks/exhaustive-deps

  const addSupplier = async (supplier) => {
    try {
      const newSupplier = {
        id: generateId(),
        name: supplier.name || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        gstin: supplier.gstin || '',
        previous_balance: String(supplier.previousBalance || 0),
        type: 'supplier',
        created_at: new Date().toISOString()
      };

      if (useFirebase) {
        await addDocument(FIRESTORE_COLLECTION, newSupplier);
      } else {
        await appendRow(spreadsheetId, SHEET_NAME, objectToRow(SHEET_NAME, newSupplier));
      }

      // Opening balance ledger entry
      if (parseFloat(supplier.previousBalance || 0) > 0) {
        const ledgerEntry = {
          id: generateId(),
          date: new Date().toISOString(),
          customer_id: '',
          supplier_id: newSupplier.id,
          type: 'SUPPLIER_OPENING',
          invoice_id: '',
          amount: String(supplier.previousBalance),
          description: 'Opening Balance',
          is_void: 'FALSE',
          created_at: new Date().toISOString()
        };
        if (useFirebase) {
          await addDocument('ledger', ledgerEntry);
        } else {
          await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
        }
        window.dispatchEvent(new Event('ledger-updated'));
      }

      setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Supplier added successfully', 'success');
      return newSupplier;
    } catch (err) {
      console.error('Error adding supplier:', err);
      showToast('Failed to add supplier', 'error');
      return null;
    }
  };

  const updateSupplier = async (id, data) => {
    try {
      const existing = suppliers.find(s => s.id === id);
      const updated = { ...existing, ...data };

      if (useFirebase) {
        await updateDocument(FIRESTORE_COLLECTION, id, data);
      } else {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
        if (rowIdx === -1) throw new Error('Supplier not found');
        await updateRow(spreadsheetId, SHEET_NAME, rowIdx, objectToRow(SHEET_NAME, updated));
      }

      setSuppliers(prev => prev.map(s => s.id === id ? updated : s));
      showToast('Supplier updated', 'success');
    } catch (err) {
      console.error('Error updating supplier:', err);
      showToast('Failed to update supplier', 'error');
    }
  };

  const deleteSupplier = async (id) => {
    try {
      if (useFirebase) {
        await softDeleteDocument(FIRESTORE_COLLECTION, id);
      } else {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
        if (rowIdx !== -1) {
          const emptyRow = objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', phone: '', address: '', gstin: '', previous_balance: '0', created_at: '' });
          await updateRow(spreadsheetId, SHEET_NAME, rowIdx, emptyRow);
        }
      }
      setSuppliers(prev => prev.filter(s => s.id !== id));
      showToast('Supplier removed', 'success');
    } catch (err) {
      console.error('Error deleting supplier:', err);
      showToast('Failed to remove supplier', 'error');
    }
  };

  const addSupplierInvoice = async (supplierId, amount, date, notes, invoiceNo) => {
    try {
      const ledgerEntry = {
        id: generateId(),
        date: date || new Date().toISOString(),
        customer_id: '',
        supplier_id: supplierId,
        type: 'PURCHASE',
        invoice_id: invoiceNo || '',
        amount: String(parseFloat(amount)),
        description: `Inv: ${invoiceNo}${notes ? ' - ' + notes : ''}`,
        is_void: 'FALSE',
        created_at: new Date().toISOString()
      };

      if (useFirebase) {
        await addDocument('ledger', ledgerEntry);
      } else {
        await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
      }

      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Invoice recorded in ledger', 'success');
    } catch (err) {
      console.error('Error recording supplier invoice:', err);
      showToast('Failed to record invoice', 'error');
    }
  };

  const addSupplierPayment = async (supplierId, amount, date, notes) => {
    try {
      const ledgerEntry = {
        id: generateId(),
        date: date || new Date().toISOString(),
        customer_id: '',
        supplier_id: supplierId,
        type: 'PAYMENT_MADE',
        invoice_id: '',
        amount: String(parseFloat(amount)),
        description: notes || 'Payment Made',
        is_void: 'FALSE',
        created_at: new Date().toISOString()
      };

      if (useFirebase) {
        await addDocument('ledger', ledgerEntry);
      } else {
        await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, ledgerEntry));
      }

      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Payment recorded in ledger', 'success');
    } catch (err) {
      console.error('Error recording supplier payment:', err);
      showToast('Failed to record payment', 'error');
    }
  };

  return (
    <SupplierContext.Provider value={{
      suppliers, loading, addSupplier, updateSupplier, deleteSupplier,
      addSupplierInvoice, addSupplierPayment, refreshSuppliers: fetchSuppliers
    }}>
      {children}
    </SupplierContext.Provider>
  );
};

export const useSuppliers = () => useContext(SupplierContext);
