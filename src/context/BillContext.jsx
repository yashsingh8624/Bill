import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useInventory } from './InventoryContext';
import { useCustomers } from './PartiesContext';
import { useAudit } from './AuditContext';
import { useToast } from './ToastContext';
import { useSettings } from './SettingsContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { getCollectionData, addDocument, updateDocument, queryDocuments, subscribeToCollection } from '../utils/firestoreService';
import { generateId, generateReadableId } from '../utils/storage';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { uploadPdfToDrive } from '../utils/driveService';

const BILLS_SHEET = 'BILLS';
const LEDGER_SHEET = 'LEDGER';
const ITEMS_SHEET = 'ITEMS';

const BillContext = createContext();

export const BillProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const { products, setProducts } = useInventory();
  const { customers = [] } = useCustomers() || {};
  const { addLog } = useAudit();
  const { showToast } = useToast();
  const { spreadsheetId, folderId, isReady, useFirebase, firebaseUid } = useAuth();
  const { userSettings } = useSettings() || {};
  const unsubBillsRef = useRef(null);
  const unsubLedgerRef = useRef(null);

  const mapBillToApp = useCallback((b) => {
    const cust = customers.find(c => c.id === (b.customer_id || b.customerId)) || {};
    
    let parsedItems = [];
    let meta = {};
    if (typeof b.items_json === 'string') {
      try {
        const parsed = JSON.parse(b.items_json);
        if (!Array.isArray(parsed) && parsed && parsed.items) {
           parsedItems = parsed.items;
           meta = parsed;
        } else {
           parsedItems = parsed || [];
        }
      } catch (e) {
         console.error("Error parsing items_json:", e);
      }
    } else {
      parsedItems = b.items || [];
    }

    return {
      ...b,
      customerId: b.customer_id || b.customerId,
      customerName: cust.name || meta.customerName || b.customerName || 'Customer',
      customerPhone: cust.phone || meta.customerPhone || b.customerPhone || '',
      invoiceNo: b.invoice_no || b.invoiceNo,
      subTotal: parseFloat(b.sub_total || b.subTotal || 0),
      cgst: parseFloat(b.cgst || 0),
      sgst: parseFloat(b.sgst || 0),
      total: parseFloat(b.total || 0),
      amountPaid: parseFloat(b.amount_paid || b.amountPaid || 0),
      isDeleted: b.is_deleted === 'TRUE' || b.is_deleted === true,
      deleteReason: b.delete_reason || b.deleteReason || '',
      items: parsedItems,
      grandTotal: meta.grandTotal !== undefined ? meta.grandTotal : parseFloat(b.total || 0),
      previousBalance: meta.previousBalance || parseFloat(b.previous_balance || 0),
      prevBalanceIncluded: meta.prevBalanceIncluded || 0,
      paymentMode: meta.paymentMode || b.paymentMode || 'Cash',
      paymentStatus: meta.paymentStatus || 'Pending',
      outstanding: meta.outstanding !== undefined ? meta.outstanding : Math.max(0, parseFloat(b.total || 0) - parseFloat(b.amount_paid || b.amountPaid || 0)),
      pdf_link: b.pdf_link || '',
      readableDate: new Date(b.date).toLocaleDateString()
    };
  }, [customers]);

  const parseLedgerEntry = (entry) => ({
    ...entry,
    amount: parseFloat(entry.amount || 0),
    is_void: entry.is_void === 'TRUE' || entry.is_void === true
  });

  // ===== SHEETS FALLBACK: one-time fetch =====
  const fetchDataSheets = useCallback(async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const [billsData, ledgerData] = await Promise.all([
        getSheetData(spreadsheetId, BILLS_SHEET),
        getSheetData(spreadsheetId, LEDGER_SHEET)
      ]);

      const filteredBills = billsData
        .filter(b => !b.id.startsWith('DELETED_'))
        .map(mapBillToApp)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setBills(filteredBills);
      setLedger(ledgerData.map(parseLedgerEntry));
    } catch (err) {
      console.error('Error fetching billing data (Sheets):', err);
      showToast('Error loading bills/ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, mapBillToApp, showToast]);

  // ===== FIREBASE: Real-time onSnapshot =====
  useEffect(() => {
    if (!isReady || !useFirebase) return;

    console.log('[BillContext] 🔴 Setting up real-time listeners for bills & ledger');
    setLoading(true);
    let initialBillsLoaded = false;
    let initialLedgerLoaded = false;

    const checkInitialLoad = () => {
      if (initialBillsLoaded && initialLedgerLoaded) {
        setLoading(false);
      }
    };

    // Subscribe to bills collection — FIX: correct path 'bills'
    unsubBillsRef.current = subscribeToCollection('bills', (data) => {
      console.log(`[BillContext] 🔴 LIVE bills update: ${data.length} docs`);
      const filteredBills = data
        .filter(b => !b.id?.startsWith('DELETED_'))
        .map(mapBillToApp)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setBills(filteredBills);
      initialBillsLoaded = true;
      checkInitialLoad();
    }, (err) => {
      console.error('[BillContext] Bills snapshot error:', err);
      showToast('Error loading bills', 'error');
      initialBillsLoaded = true;
      checkInitialLoad();
    }, firebaseUid);

    // Subscribe to ledger collection — FIX: correct path 'transactions'
    unsubLedgerRef.current = subscribeToCollection('transactions', (data) => {
      console.log(`[BillContext] 🔴 LIVE ledger update: ${data.length} docs`);
      setLedger(data.map(parseLedgerEntry));
      initialLedgerLoaded = true;
      checkInitialLoad();
    }, (err) => {
      console.error('[BillContext] Ledger snapshot error:', err);
      initialLedgerLoaded = true;
      checkInitialLoad();
    }, firebaseUid);

    // Cleanup on unmount
    return () => {
      console.log('[BillContext] 🛑 Unsubscribing from real-time listeners');
      if (unsubBillsRef.current) unsubBillsRef.current();
      if (unsubLedgerRef.current) unsubLedgerRef.current();
    };
  }, [isReady, useFirebase, firebaseUid, mapBillToApp, showToast]);

  // ===== SHEETS: one-time fetch =====
  useEffect(() => {
    if (!isReady || useFirebase) return;
    fetchDataSheets();
  }, [isReady, useFirebase, fetchDataSheets]);

  // Listen for ledger updates from other contexts (Sheets mode)
  useEffect(() => {
    if (useFirebase) return; // Firebase uses real-time listeners
    const handleLedgerUpdate = () => {
      if (!isReady || !spreadsheetId) return;
      getSheetData(spreadsheetId, LEDGER_SHEET)
        .then(data => setLedger(data.map(parseLedgerEntry)))
        .catch(console.error);
    };
    window.addEventListener('ledger-updated', handleLedgerUpdate);
    return () => window.removeEventListener('ledger-updated', handleLedgerUpdate);
  }, [isReady, spreadsheetId, useFirebase]);

  // Re-map bills when customers change
  useEffect(() => {
    if (!loading && bills.length > 0) {
      setBills(prev => prev.map(mapBillToApp));
    }
  }, [customers]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateBillNumber = () => {
    return generateReadableId('INV', bills.map(b => ({ id: b.invoiceNo })));
  };

  const addBill = async (bill) => {
    try {
      const billDate = bill.date || new Date().toISOString();
      const billId = generateId();
      const invoiceNo = bill.invoiceNo || bill.invoice_no || generateBillNumber();

      // 1. Generate PDF and upload to Drive
      let pdfLink = '';
      if (folderId) {
        try {
          const pdfPayload = { ...bill, invoiceNo, date: billDate };
          if (bill.pdfCustomPrevBalance) {
            pdfPayload.prevBalanceIncluded = bill.pdfCustomPrevBalance;
          }
          const { doc, fileName } = generateInvoicePDF(pdfPayload, userSettings);
          const pdfBlob = doc.output('blob');
          const uploadRes = await uploadPdfToDrive(folderId, fileName, pdfBlob);
          pdfLink = uploadRes.webViewLink || '';
        } catch (pdfErr) {
          console.error('Failed to generate/upload PDF:', pdfErr);
          showToast('Bill saved but PDF upload failed', 'warning');
        }
      }

      const newBill = {
        id: billId,
        customer_id: bill.customerId || bill.customer_id,
        invoice_no: invoiceNo,
        date: billDate,
        items_json: JSON.stringify({
          items: bill.items || [],
          grandTotal: bill.grandTotal,
          previousBalance: bill.previousBalance,
          prevBalanceIncluded: bill.prevBalanceIncluded,
          outstanding: bill.outstanding,
          paymentMode: bill.paymentMode,
          paymentStatus: bill.paymentStatus,
          customerName: bill.customerName || '',
          customerPhone: bill.customerPhone || ''
        }),
        sub_total: String(parseFloat(bill.subTotal || 0)),
        cgst: String(parseFloat(bill.cgst || 0)),
        sgst: String(parseFloat(bill.sgst || 0)),
        total: String(parseFloat(bill.total || 0)),
        amount_paid: String(parseFloat(bill.amountPaid || bill.paidAmount || 0)),
        is_deleted: 'FALSE',
        delete_reason: '',
        pdf_link: pdfLink,
        created_at: new Date().toISOString()
      };

      // FIX: Resolve customer name BEFORE using it in ledger entries
      const resolvedCustomerName = bill.customerName || bill.customer_name || customers.find(c => c.id === newBill.customer_id)?.name || 'Unknown';

      const saleLedger = {
        id: generateId(),
        date: billDate,
        customer_id: newBill.customer_id,
        supplier_id: '',
        party_id: newBill.customer_id,
        party_name: resolvedCustomerName,
        party_type: 'customer',
        type: 'SALE',
        invoice_id: invoiceNo,
        amount: newBill.total,
        description: `Bill #${invoiceNo}`,
        is_void: 'FALSE',
        created_at: new Date().toISOString()
      };

      const itemRows = (bill.items || []).map(item => ({
        id: generateId(),
        bill_id: billId,
        invoice_no: invoiceNo,
        product_id: item.productId || '',
        name: item.name || '',
        hsn: item.hsn || '',
        quantity: String(item.quantity || 0),
        price: String(item.price || 0),
        gst_rate: String(item.gstRate || 0),
        discount: String(item.discount || 0),
        total: String(item.total || 0),
        created_at: new Date().toISOString()
      }));

      let payLedger = null;

      if (useFirebase) {
        // === FIRESTORE ONLY ===
        console.log('[BillContext] 💾 Saving bill to Firestore...');
        console.log('[BillContext] user.uid:', firebaseUid);

        try {
          await addDocument('bills', newBill);
          console.log('[BillContext] ✅ Bill saved');
        } catch (billErr) {
          console.error('[BillContext] ❌ Bill save failed:', billErr);
          throw billErr;
        }

        try {
          for (const itemRow of itemRows) {
            await addDocument('bill_items', itemRow);
          }
          console.log('[BillContext] ✅ Bill items saved');
        } catch (itemErr) {
          console.error('[BillContext] ❌ Bill items save failed:', itemErr);
          // Non-critical, continue
        }

        try {
          await addDocument('transactions', saleLedger);
          console.log('[BillContext] ✅ Sale ledger entry saved');
        } catch (ledgerErr) {
          console.error('[BillContext] ❌ Sale ledger save failed:', ledgerErr);
          // Non-critical for bill, continue
        }

        if (parseFloat(newBill.amount_paid) > 0) {
          payLedger = {
            id: generateId(),
            date: new Date(new Date(billDate).getTime() + 1000).toISOString(),
            customer_id: newBill.customer_id,
            supplier_id: '',
            party_id: newBill.customer_id,
            party_name: resolvedCustomerName,
            party_type: 'customer',
            type: 'PAYMENT',
            invoice_id: invoiceNo,
            amount: newBill.amount_paid,
            description: `Paid for Bill #${invoiceNo}`,
            is_void: 'FALSE',
            created_at: new Date().toISOString()
          };
          try {
            await addDocument('transactions', payLedger);
            console.log('[BillContext] ✅ Payment ledger entry saved');
          } catch (payErr) {
            console.error('[BillContext] ❌ Payment ledger save failed:', payErr);
          }
        }

        // Update product stock in Firestore
        for (const item of (bill.items || [])) {
          if (item.productId) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const newQty = Math.max(0, (product.quantity || 0) - item.quantity);
              const historyEntry = { id: generateId(), date: new Date().toISOString(), change: -item.quantity, note: `Bill: ${invoiceNo}`, type: 'OUT' };
              const updatedHistory = [...(product.stockHistory || product.stock_history || []), historyEntry];
              try {
                await updateDocument('products', item.productId, {
                  quantity: String(newQty),
                  stock_history_json: JSON.stringify(updatedHistory)
                });
              } catch (e) { console.warn('[Firestore] Stock update failed:', e.message); }
            }
          }
        }

        // NOTE: With onSnapshot, UI will auto-update from the real-time listener.
        // No need for manual setBills/setLedger — but we do it for immediate optimistic update.
      } else {
        // === SHEETS ONLY ===
        await appendRow(spreadsheetId, BILLS_SHEET, objectToRow(BILLS_SHEET, newBill));
        for (const itemRow of itemRows) {
          await appendRow(spreadsheetId, ITEMS_SHEET, objectToRow(ITEMS_SHEET, itemRow));
        }
        await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, saleLedger));

        const allTxnSale = { id: saleLedger.id, date: saleLedger.date, customer_name: resolvedCustomerName, type: 'Sale', amount: saleLedger.amount };
        await appendRow(spreadsheetId, 'ALL_TRANSACTIONS', objectToRow('ALL_TRANSACTIONS', allTxnSale));

        if (parseFloat(newBill.amount_paid) > 0) {
          payLedger = {
            id: generateId(),
            date: new Date(new Date(billDate).getTime() + 1000).toISOString(),
            customer_id: newBill.customer_id,
            supplier_id: '',
            type: 'PAYMENT',
            invoice_id: invoiceNo,
            amount: newBill.amount_paid,
            description: `Paid for Bill #${invoiceNo}`,
            is_void: 'FALSE',
            created_at: new Date().toISOString()
          };
          await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, payLedger));
          const allTxnPay = { id: payLedger.id, date: payLedger.date, customer_name: resolvedCustomerName, type: 'Payment In', amount: payLedger.amount };
          await appendRow(spreadsheetId, 'ALL_TRANSACTIONS', objectToRow('ALL_TRANSACTIONS', allTxnPay));
        }

        // Update product stock in Sheets
        for (const item of (bill.items || [])) {
          if (item.productId) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const newQty = Math.max(0, (product.quantity || 0) - item.quantity);
              const historyEntry = { id: generateId(), date: new Date().toISOString(), change: -item.quantity, note: `Bill: ${invoiceNo}`, type: 'OUT' };
              const rowIdx = await findRowIndex(spreadsheetId, 'PRODUCTS', 'id', item.productId);
              if (rowIdx !== -1) {
                const updatedHistory = [...(product.stock_history || []), historyEntry];
                const sheetRow = objectToRow('PRODUCTS', {
                  ...product, quantity: String(newQty), selling_price: String(product.selling_price),
                  purchase_price: String(product.purchase_price), low_stock_threshold: String(product.low_stock_threshold),
                  stock_history_json: JSON.stringify(updatedHistory)
                });
                await updateRow(spreadsheetId, 'PRODUCTS', rowIdx, sheetRow);
              }
            }
          }
        }
      }

      // Optimistic UI update (onSnapshot will also fire for Firebase)
      const appBill = mapBillToApp(newBill);
      if (!useFirebase) {
        setBills(prev => [appBill, ...prev]);
        setLedger(prev => {
          const newLedger = [...prev, parseLedgerEntry(saleLedger)];
          if (payLedger) newLedger.push(parseLedgerEntry(payLedger));
          return newLedger;
        });
      }
      
      window.dispatchEvent(new Event('ledger-updated'));
      showToast('Bill saved successfully ✓', 'success');
      return appBill;
    } catch (err) {
      console.error('[BillContext] ❌ Error adding bill:', err);
      showToast('Failed to save bill: ' + (err.message || 'Unknown error'), 'error');
      return null;
    }
  };

  const deleteBill = async (id, reason = 'Deleted by user') => {
    try {
      const targetBill = bills.find(b => b.id === id);
      if (!targetBill) return;

      const invoiceNo = targetBill.invoiceNo || targetBill.invoice_no;

      if (useFirebase) {
        // Mark bill as deleted in Firestore
        await updateDocument('bills', id, { is_deleted: 'TRUE', delete_reason: reason });

        // Void ledger entries — FIX: use 'transactions'
        const ledgerData = await getCollectionData('transactions');
        for (const entry of ledgerData) {
          if (entry.invoice_id === invoiceNo) {
            await updateDocument('transactions', entry.id || entry._docId, { is_void: 'TRUE', amount: '0' });
          }
        }
      } else {
        // Sheets path
        const billRowIdx = await findRowIndex(spreadsheetId, BILLS_SHEET, 'id', id);
        if (billRowIdx !== -1) {
          const updatedBill = {
            ...targetBill, customer_id: targetBill.customerId, invoice_no: invoiceNo,
            items_json: JSON.stringify({
               items: targetBill.items || [], grandTotal: targetBill.grandTotal,
               previousBalance: targetBill.previousBalance, prevBalanceIncluded: targetBill.prevBalanceIncluded,
               outstanding: targetBill.outstanding, paymentMode: targetBill.paymentMode,
               paymentStatus: targetBill.paymentStatus, customerName: targetBill.customerName,
               customerPhone: targetBill.customerPhone
            }),
            sub_total: String(targetBill.subTotal), cgst: String(targetBill.cgst),
            sgst: String(targetBill.sgst), total: String(targetBill.total),
            amount_paid: String(targetBill.amountPaid), is_deleted: 'TRUE',
            delete_reason: reason, pdf_link: targetBill.pdf_link || '',
            created_at: targetBill.created_at || ''
          };
          await updateRow(spreadsheetId, BILLS_SHEET, billRowIdx, objectToRow(BILLS_SHEET, updatedBill));
        }

        const ledgerData = await getSheetData(spreadsheetId, LEDGER_SHEET);
        for (let i = 0; i < ledgerData.length; i++) {
          if (ledgerData[i].invoice_id === invoiceNo) {
            const rowIdx = i + 2;
            const voided = { ...ledgerData[i], is_void: 'TRUE', amount: '0' };
            await updateRow(spreadsheetId, LEDGER_SHEET, rowIdx, objectToRow(LEDGER_SHEET, voided));
          }
        }
      }

      // Optimistic update (onSnapshot will also fire for Firebase)
      if (!useFirebase) {
        setBills(prev => prev.map(b =>
          b.id === id ? { ...b, isDeleted: true, deleteReason: reason } : b
        ));
        setLedger(prev => prev.map(entry => 
          entry.invoice_id === invoiceNo ? { ...entry, is_void: true, amount: 0 } : entry
        ));
      }

      addLog('DELETE', 'BILL', id, { reason, invoiceNo });
      showToast('Bill deleted and ledger updated', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error deleting bill:', err);
      showToast('Failed to delete bill', 'error');
    }
  };

  // Manual refresh for Sheets mode (Firebase auto-refreshes via onSnapshot)
  const refreshBills = useCallback(async () => {
    if (useFirebase) {
      // onSnapshot handles this automatically; just log
      console.log('[BillContext] Firebase mode — data is live, no manual refresh needed');
      return;
    }
    await fetchDataSheets();
  }, [useFirebase, fetchDataSheets]);

  const contextValue = useMemo(() => ({
    bills, setBills, ledger, setLedger, loading, 
    addBill, deleteBill, refreshBills, refreshLedger: refreshBills, generateBillNumber
  }), [bills, ledger, loading, addBill, deleteBill, refreshBills]);

  return (
    <BillContext.Provider value={contextValue}>
      {children}
    </BillContext.Provider>
  );
};

export const useBills = () => useContext(BillContext);
