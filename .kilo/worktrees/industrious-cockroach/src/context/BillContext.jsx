import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useInventory } from './InventoryContext';
import { useCustomers } from './PartiesContext';
import { useAudit } from './AuditContext';
import { useToast } from './ToastContext';
import { useSettings } from './SettingsContext';
import { getCollectionData, addDocument, updateDocument, queryDocuments, addBillTransaction } from '../utils/firestoreService';
import { generateId, generateReadableId } from '../utils/storage';
import { generateInvoicePDF } from '../utils/pdfGenerator';



const BillContext = createContext();

export const BillProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const { products, setProducts } = useInventory();
  const { customers = [] } = useCustomers() || {};
  const { addLog } = useAudit();
  const { showToast } = useToast();
  const { isReady } = useAuth();
  const { userSettings } = useSettings() || {};

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [billsData, ledgerData] = await Promise.all([
        getCollectionData('bills'),
        getCollectionData('ledger/all_transactions') // All transactions in unified ledger
      ]);

      const filteredBills = billsData
        .filter(b => !b.id?.startsWith('DELETED_'))
        .map(mapBillToApp)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setBills(filteredBills);
      setLedger(ledgerData.map(parseLedgerEntry));
    } catch (err) {
      console.error('Error fetching billing data:', err);
      showToast('Error loading bills/ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [mapBillToApp, showToast]);

  // KEY FIX: Always wait for isReady
  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for ledger updates from other contexts
  useEffect(() => {
    const handleLedgerUpdate = () => {
      if (!isReady) return;
      getCollectionData('ledger/all_transactions')
        .then(data => setLedger(data.map(parseLedgerEntry)))
        .catch(console.error);
    };
    window.addEventListener('ledger-updated', handleLedgerUpdate);
    return () => window.removeEventListener('ledger-updated', handleLedgerUpdate);
  }, [isReady]);

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

      // Generate PDF (no upload to Drive)
      let pdfLink = '';
      try {
        const pdfPayload = { ...bill, invoiceNo, date: billDate };
        if (bill.pdfCustomPrevBalance) {
          pdfPayload.prevBalanceIncluded = bill.pdfCustomPrevBalance;
        }
        const { doc } = generateInvoicePDF(pdfPayload, userSettings);
        // PDF generated but not uploaded - could be downloaded locally if needed
      } catch (pdfErr) {
        console.error('Failed to generate PDF:', pdfErr);
        showToast('Bill saved but PDF generation failed', 'warning');
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

      const resolvedCustomerName = bill.customerName || bill.customer_name || customers.find(c => c.id === newBill.customer_id)?.name || 'Customer';

      // Prepare ledger entries
      const ledgerEntries = [saleLedger];

      if (parseFloat(newBill.amount_paid) > 0) {
        const payLedger = {
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
        ledgerEntries.push(payLedger);
      }

      // Prepare stock updates
      const stockUpdates = [];
      for (const item of (bill.items || [])) {
        if (item.productId) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newQty = Math.max(0, (product.quantity || 0) - item.quantity);
            const historyEntry = { id: generateId(), date: new Date().toISOString(), change: -item.quantity, note: `Bill: ${invoiceNo}`, type: 'OUT' };
            const updatedHistory = [...(product.stockHistory || product.stock_history || []), historyEntry];
            stockUpdates.push({
              productId: item.productId,
              newQuantity: String(newQty),
              newHistory: updatedHistory
            });
          }
        }
      }

      // Execute atomic transaction
      const result = await addBillTransaction(newBill, ledgerEntries, stockUpdates);

      // Add bill items separately (not in transaction for simplicity)
      for (const itemRow of itemRows) {
        await addDocument('bill_items', itemRow);
      }


      const appBill = mapBillToApp(newBill);
      setBills(prev => [appBill, ...prev]);

      // Refresh data immediately after save
      setTimeout(() => {
        fetchData();
      }, 100);

      window.dispatchEvent(new Event('ledger-updated'));
      return appBill;
    } catch (err) {
      console.error('Error adding bill:', err);
      showToast('Failed to save bill', 'error');
      return null;
    }
  };

  const deleteBill = async (id, reason = 'Deleted by user') => {
    try {
      const targetBill = bills.find(b => b.id === id);
      if (!targetBill) return;

      const invoiceNo = targetBill.invoiceNo || targetBill.invoice_no;

      // Mark bill as deleted in Firestore
      await updateDocument('bills', id, { is_deleted: 'TRUE', delete_reason: reason });

      // Void ledger entries
      const ledgerData = await getCollectionData('ledger');
      for (const entry of ledgerData) {
        if (entry.invoice_id === invoiceNo) {
          await updateDocument('ledger', entry.id, { is_void: 'TRUE', amount: '0' });
        }
      }

      setBills(prev => prev.map(b =>
        b.id === id ? { ...b, isDeleted: true, deleteReason: reason } : b
      ));

      setLedger(prev => prev.map(entry =>
        entry.invoice_id === invoiceNo ? { ...entry, is_void: true, amount: 0 } : entry
      ));

      addLog('DELETE', 'BILL', id, { reason, invoiceNo });
      showToast('Bill deleted and ledger updated', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error deleting bill:', err);
      showToast('Failed to delete bill', 'error');
    }
  };

  const contextValue = useMemo(() => ({
    bills, setBills, ledger, setLedger, loading, 
    addBill, deleteBill, refreshBills: fetchData, refreshLedger: fetchData, generateBillNumber
  }), [bills, ledger, loading, addBill, deleteBill, fetchData]);

  return (
    <BillContext.Provider value={contextValue}>
      {children}
    </BillContext.Provider>
  );
};

export const useBills = () => useContext(BillContext);
