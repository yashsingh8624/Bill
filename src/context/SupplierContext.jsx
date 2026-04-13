import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { getCollectionData, addDocument, updateDocument, softDeleteDocument, subscribeToCollection } from '../utils/firestoreService';
import { generateId } from '../utils/storage';

const SHEET_NAME = 'SUPPLIERS';
const LEDGER_SHEET = 'LEDGER';
const FIRESTORE_COLLECTION = 'suppliers';

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady, useFirebase, firebaseUid } = useAuth();
  const { showToast } = useToast();
  const unsubRef = useRef(null);

  // ===== FIREBASE: Real-time onSnapshot =====
  useEffect(() => {
    if (!isReady || !useFirebase) return;

    console.log('[SupplierContext] 🔴 Setting up real-time listener for suppliers');
    setLoading(true);

    unsubRef.current = subscribeToCollection(FIRESTORE_COLLECTION, (data) => {
      console.log(`[SupplierContext] 🔴 LIVE suppliers update: ${data.length} docs`);
      const processed = data
        .map(s => ({ ...s, type: s.type || 'supplier' }))
        .filter(s => !s.id?.startsWith('DELETED_') && s.type === 'supplier')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setSuppliers(processed);
      setLoading(false);
    }, (err) => {
      console.error('[SupplierContext] Suppliers snapshot error:', err);
      showToast('Error loading suppliers', 'error');
      setLoading(false);
    }, firebaseUid);

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [isReady, useFirebase, firebaseUid, showToast]);

  // ===== SHEETS: one-time fetch =====
  const fetchSuppliersSheets = async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, SHEET_NAME);
      const processed = data
        .map(s => ({ ...s, type: s.type || 'supplier' }))
        .filter(s => !s.id.startsWith('DELETED_') && s.type === 'supplier')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setSuppliers(processed);
    } catch (err) {
      console.error('Error fetching suppliers (Sheets):', err);
      showToast('Error loading suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || useFirebase) return;
    fetchSuppliersSheets();
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
        console.log('[SupplierContext] ✅ Supplier saved to Firestore');
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
          party_id: newSupplier.id,
          party_name: newSupplier.name,
          party_type: 'supplier',
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

      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      }
      showToast('Supplier added successfully', 'success');
      return newSupplier;
    } catch (err) {
      console.error('Error adding supplier:', err);
      showToast('Failed to add supplier: ' + (err.message || 'Unknown error'), 'error');
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

      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setSuppliers(prev => prev.map(s => s.id === id ? updated : s));
      }
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
      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setSuppliers(prev => prev.filter(s => s.id !== id));
      }
      showToast('Supplier removed', 'success');
    } catch (err) {
      console.error('Error deleting supplier:', err);
      showToast('Failed to remove supplier', 'error');
    }
  };

  const addSupplierInvoice = async (supplierId, amount, date, notes, invoiceNo) => {
    try {
      const resolvedName = suppliers.find(s => s.id === supplierId)?.name || 'Unknown';
      const ledgerEntry = {
        id: generateId(),
        date: date || new Date().toISOString(),
        customer_id: '',
        supplier_id: supplierId,
        party_id: supplierId,
        party_name: resolvedName,
        party_type: 'supplier',
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
      showToast('Failed to record invoice: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const addSupplierPayment = async (supplierId, amount, date, notes) => {
    try {
      const resolvedName = suppliers.find(s => s.id === supplierId)?.name || 'Unknown';
      const ledgerEntry = {
        id: generateId(),
        date: date || new Date().toISOString(),
        customer_id: '',
        supplier_id: supplierId,
        party_id: supplierId,
        party_name: resolvedName,
        party_type: 'supplier',
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
      showToast('Failed to record payment: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  return (
    <SupplierContext.Provider value={{
      suppliers, loading, addSupplier, updateSupplier, deleteSupplier,
      addSupplierInvoice, addSupplierPayment, refreshSuppliers: useFirebase ? () => console.log('[SupplierContext] Firebase mode — live') : fetchSuppliersSheets
    }}>
      {children}
    </SupplierContext.Provider>
  );
};

export const useSuppliers = () => useContext(SupplierContext);
