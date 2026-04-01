import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useInventory } from './InventoryContext';
import { useCustomers } from './CustomerContext';
import { useAudit } from './AuditContext';
import { useToast } from './ToastContext';

const BillContext = createContext();

export const BillProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setProducts, products } = useInventory();
  const { customers = [] } = useCustomers() || {};
  const { addLog } = useAudit();
  const { showToast } = useToast();

  const mapDbBillToApp = (b) => {
      const cust = customers.find(c => c.id === b.customer_id) || {};
      return {
          ...b,
          customerId: b.customer_id,
          customerName: cust.name || 'Unknown',
          customerPhone: cust.phone || '',
          invoiceNo: b.invoice_no,
          subTotal: parseFloat(b.sub_total || 0),
          cgst: parseFloat(b.cgst || 0),
          sgst: parseFloat(b.sgst || 0),
          total: parseFloat(b.total || 0),
          amountPaid: parseFloat(b.amount_paid || 0),
          isDeleted: b.is_deleted,
          deleteReason: b.delete_reason,
          outstanding: Math.max(0, parseFloat(b.total || 0) - parseFloat(b.amount_paid || 0)),
          readableDate: new Date(b.date).toLocaleDateString()
      };
  };

  const fetchData = async () => {
    try {
      // Fetch Bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .order('date', { ascending: false });
      
      if (billsError) throw billsError;
      setBills((billsData || []).map(mapDbBillToApp));

      // Fetch Ledger
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('ledger')
        .select('*')
        .order('date', { ascending: true });
      
      if (ledgerError) throw ledgerError;
      setLedger(ledgerData || []);

    } catch (err) {
      console.error('Error fetching billing data:', err.message);
      showToast('Error loading bills/ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Realtime for Bills
    const billsChannel = supabase
      .channel('bills-changes')
      .on('postgres_changes', { event: '*', table: 'bills', schema: 'public' }, (payload) => {
        if (payload.eventType === 'INSERT') setBills(prev => [mapDbBillToApp(payload.new), ...prev]);
        if (payload.eventType === 'UPDATE') setBills(prev => prev.map(b => b.id === payload.new.id ? mapDbBillToApp(payload.new) : b));
        if (payload.eventType === 'DELETE') setBills(prev => prev.filter(b => b.id !== payload.old.id));
      })
      .subscribe();

    // Realtime for Ledger
    const ledgerChannel = supabase
      .channel('ledger-changes')
      .on('postgres_changes', { event: '*', table: 'ledger', schema: 'public' }, (payload) => {
        if (payload.eventType === 'INSERT') setLedger(prev => [...prev, payload.new]);
        if (payload.eventType === 'UPDATE') setLedger(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
        if (payload.eventType === 'DELETE') setLedger(prev => prev.filter(l => l.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(billsChannel);
      supabase.removeChannel(ledgerChannel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateBillNumber = () => {
    // Note: In a true multi-user app, this should be handled by a DB sequence or trigger
    // For now, we derive from local count + prefix
    const prefix = 'INV'; // Should ideally come from settings context or fetch settings here
    return `${prefix}-${new Date().getFullYear()}-${String(bills.length + 1).padStart(4, '0')}`;
  };

  const addBill = async (bill) => {
    try {
      const billDate = bill.date || new Date().toISOString();
      
      // 1. Insert Bill
      const { data: newBillData, error: billError } = await supabase
        .from('bills')
        .insert([{
          customer_id: bill.customerId || bill.customer_id,
          invoice_no: bill.invoiceNo || bill.invoice_no,
          date: billDate,
          items: bill.items,
          sub_total: parseFloat(bill.subTotal || 0),
          cgst: parseFloat(bill.cgst || 0),
          sgst: parseFloat(bill.sgst || 0),
          total: parseFloat(bill.total || 0),
          amount_paid: parseFloat(bill.amountPaid || bill.paidAmount || 0),
          is_deleted: false
        }])
        .select();

      if (billError) throw billError;
      const newBill = newBillData[0];

      // 2. Add Ledger Entries
      const ledgerEntries = [];
      
      // SALE entry
      ledgerEntries.push({
        customer_id: newBill.customer_id,
        date: billDate,
        type: 'SALE',
        invoice_id: newBill.invoice_no,
        amount: newBill.total,
        description: `Bill #${newBill.invoice_no}`
      });

      // PAYMENT entry (if paid something)
      if (newBill.amount_paid > 0) {
        ledgerEntries.push({
          customer_id: newBill.customer_id,
          date: new Date(new Date(billDate).getTime() + 1000).toISOString(), // Slight offset
          type: 'PAYMENT',
          invoice_id: newBill.invoice_no,
          amount: newBill.amount_paid,
          description: `Paid for Bill #${newBill.invoice_no}`
        });
      }

      await supabase.from('ledger').insert(ledgerEntries);

      // 3. Update Inventory Stock (Local update followed by DB update in InventoryContext is handled there, 
      // but here we trigger the stock deduct via the hook if needed, or better, do it here directly for atomicity)
      for (const item of bill.items) {
        if (item.productId) {
           const product = products.find(p => p.id === item.productId);
           if (product) {
              const newQty = Math.max(0, (product.quantity || 0) - item.quantity);
              await supabase.from('products').update({ 
                quantity: newQty,
                stock_history: [...(product.stock_history || []), {
                   id: Date.now().toString(),
                   date: new Date().toISOString(),
                   change: -item.quantity,
                   note: `Bill: ${newBill.invoice_no}`,
                   type: 'OUT'
                }]
              }).eq('id', item.productId);
           }
        }
      }

      return mapDbBillToApp(newBill);
    } catch (err) {
      console.error('Error adding bill:', err.message);
      showToast('Failed to save bill', 'error');
      return null;
    }
  };

  const deleteBill = async (id, reason = 'Deleted by user') => {
    try {
      const targetBill = bills.find(b => b.id === id);
      if (!targetBill) return;

      // 1. Mark bill as deleted
      const { error: billError } = await supabase
        .from('bills')
        .update({ is_deleted: true, delete_reason: reason })
        .eq('id', id);
      
      if (billError) throw billError;

      // 2. Void ledger entries
      const { error: ledgerError } = await supabase
        .from('ledger')
        .update({ is_void: true, amount: 0 })
        .eq('invoice_id', targetBill.invoice_no);
      
      if (ledgerError) throw ledgerError;

      addLog('DELETE', 'BILL', id, { reason, invoiceNo: targetBill.invoice_no });
      showToast('Bill deleted and ledger updated', 'success');
    } catch (err) {
       console.error('Error deleting bill:', err.message);
       showToast('Failed to delete bill', 'error');
    }
  };

  return (
    <BillContext.Provider value={{ bills, ledger, loading, addBill, deleteBill, generateBillNumber }}>
      {children}
    </BillContext.Provider>
  );
};

export const useBills = () => useContext(BillContext);
