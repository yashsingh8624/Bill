import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useInventory } from './InventoryContext';
import { useCustomers } from './CustomerContext';
import { useAudit } from './AuditContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { generateId } from '../utils/storage';
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
  const { spreadsheetId, folderId, isReady } = useAuth();
  const { userSettings } = useSettings() || {};

  const mapBillToApp = useCallback((b) => {
    const cust = customers.find(c => c.id === (b.customer_id || b.customerId)) || {};
    return {
      ...b,
      customerId: b.customer_id || b.customerId,
      customerName: cust.name || b.customerName || 'Unknown',
      customerPhone: cust.phone || b.customerPhone || '',
      invoiceNo: b.invoice_no || b.invoiceNo,
      subTotal: parseFloat(b.sub_total || b.subTotal || 0),
      cgst: parseFloat(b.cgst || 0),
      sgst: parseFloat(b.sgst || 0),
      total: parseFloat(b.total || 0),
      amountPaid: parseFloat(b.amount_paid || b.amountPaid || 0),
      isDeleted: b.is_deleted === 'TRUE' || b.is_deleted === true,
      deleteReason: b.delete_reason || b.deleteReason || '',
      items: typeof b.items_json === 'string' ? JSON.parse(b.items_json || '[]') : (b.items || []),
      outstanding: Math.max(0, parseFloat(b.total || 0) - parseFloat(b.amount_paid || b.amountPaid || 0)),
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
      console.error('Error fetching billing data:', err);
      showToast('Error loading bills/ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, mapBillToApp, showToast]);

  useEffect(() => {
    if (isReady && spreadsheetId) {
      fetchData();
    }
  }, [isReady, spreadsheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for ledger updates from other contexts
  useEffect(() => {
    const handleLedgerUpdate = () => {
      if (isReady && spreadsheetId) {
        getSheetData(spreadsheetId, LEDGER_SHEET)
          .then(data => setLedger(data.map(parseLedgerEntry)))
          .catch(console.error);
      }
    };
    window.addEventListener('ledger-updated', handleLedgerUpdate);
    return () => window.removeEventListener('ledger-updated', handleLedgerUpdate);
  }, [isReady, spreadsheetId]);

  // Re-map bills when customers change
  useEffect(() => {
    if (!loading && bills.length > 0) {
      setBills(prev => prev.map(mapBillToApp));
    }
  }, [customers]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateBillNumber = () => {
    const prefix = 'INV';
    return `${prefix}-${new Date().getFullYear()}-${String(bills.length + 1).padStart(4, '0')}`;
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
          const { doc, fileName } = generateInvoicePDF({ ...bill, invoiceNo, date: billDate }, userSettings);
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
        items_json: JSON.stringify(bill.items || []),
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

      // 2. Insert Bill
      await appendRow(spreadsheetId, BILLS_SHEET, objectToRow(BILLS_SHEET, newBill));

      // 3. Insert Items
      for (const item of (bill.items || [])) {
        const itemRow = {
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
        };
        await appendRow(spreadsheetId, ITEMS_SHEET, objectToRow(ITEMS_SHEET, itemRow));
      }

      // 4. Add SALE ledger entry
      const saleLedger = {
        id: generateId(),
        date: billDate,
        customer_id: newBill.customer_id,
        supplier_id: '',
        type: 'SALE',
        invoice_id: invoiceNo,
        amount: newBill.total,
        description: `Bill #${invoiceNo}`,
        is_void: 'FALSE',
        created_at: new Date().toISOString()
      };
      await appendRow(spreadsheetId, LEDGER_SHEET, objectToRow(LEDGER_SHEET, saleLedger));

      // 5. Add PAYMENT ledger entry if paid
      if (parseFloat(newBill.amount_paid) > 0) {
        const payLedger = {
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
      }

      // 6. Update product stock locally + in sheets
      for (const item of (bill.items || [])) {
        if (item.productId) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newQty = Math.max(0, (product.quantity || 0) - item.quantity);
            const historyEntry = {
              id: generateId(),
              date: new Date().toISOString(),
              change: -item.quantity,
              note: `Bill: ${invoiceNo}`,
              type: 'OUT'
            };
            // Update in sheets
            const rowIdx = await findRowIndex(spreadsheetId, 'PRODUCTS', 'id', item.productId);
            if (rowIdx !== -1) {
              const updatedHistory = [...(product.stock_history || []), historyEntry];
              const sheetRow = objectToRow('PRODUCTS', {
                ...product,
                quantity: String(newQty),
                selling_price: String(product.selling_price),
                purchase_price: String(product.purchase_price),
                low_stock_threshold: String(product.low_stock_threshold),
                stock_history_json: JSON.stringify(updatedHistory)
              });
              await updateRow(spreadsheetId, 'PRODUCTS', rowIdx, sheetRow);
            }
          }
        }
      }

      const appBill = mapBillToApp(newBill);
      setBills(prev => [appBill, ...prev]);
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

      // 1. Mark bill as deleted in sheet
      const billRowIdx = await findRowIndex(spreadsheetId, BILLS_SHEET, 'id', id);
      if (billRowIdx !== -1) {
        const updatedBill = {
          ...targetBill,
          customer_id: targetBill.customerId,
          invoice_no: invoiceNo,
          items_json: JSON.stringify(targetBill.items || []),
          sub_total: String(targetBill.subTotal),
          cgst: String(targetBill.cgst),
          sgst: String(targetBill.sgst),
          total: String(targetBill.total),
          amount_paid: String(targetBill.amountPaid),
          is_deleted: 'TRUE',
          delete_reason: reason,
          pdf_link: targetBill.pdf_link || '',
          created_at: targetBill.created_at || ''
        };
        await updateRow(spreadsheetId, BILLS_SHEET, billRowIdx, objectToRow(BILLS_SHEET, updatedBill));
      }

      // 2. Void ledger entries for this invoice
      const ledgerData = await getSheetData(spreadsheetId, LEDGER_SHEET);
      for (let i = 0; i < ledgerData.length; i++) {
        if (ledgerData[i].invoice_id === invoiceNo) {
          const rowIdx = i + 2; // header + 0-indexed
          const voided = { ...ledgerData[i], is_void: 'TRUE', amount: '0' };
          await updateRow(spreadsheetId, LEDGER_SHEET, rowIdx, objectToRow(LEDGER_SHEET, voided));
        }
      }

      setBills(prev => prev.map(b =>
        b.id === id ? { ...b, isDeleted: true, deleteReason: reason } : b
      ));

      addLog('DELETE', 'BILL', id, { reason, invoiceNo });
      showToast('Bill deleted and ledger updated', 'success');
      window.dispatchEvent(new Event('ledger-updated'));
    } catch (err) {
      console.error('Error deleting bill:', err);
      showToast('Failed to delete bill', 'error');
    }
  };

  return (
    <BillContext.Provider value={{ bills, ledger, loading, addBill, deleteBill, generateBillNumber, refreshBills: fetchData }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBills = () => useContext(BillContext);
