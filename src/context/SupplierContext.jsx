import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from './ToastContext';

const SupplierContext = createContext();

export const SupplierProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err.message);
      showToast('Error loading suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();

    // Realtime listener
    const channel = supabase
      .channel('suppliers-changes')
      .on('postgres_changes', 
        { event: '*', table: 'suppliers', schema: 'public' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSuppliers(prev => [...prev, payload.new].sort((a,b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setSuppliers(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
          } else if (payload.eventType === 'DELETE') {
            setSuppliers(prev => prev.filter(s => s.id !== payload.old.id));
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addSupplier = async (supplier) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          name: supplier.name,
          phone: supplier.phone,
          address: supplier.address,
          gstin: supplier.gstin
        }])
        .select();
      
      if (error) throw error;
      
      // Handle opening balance
      if (parseFloat(supplier.previousBalance || 0) > 0) {
        await supabase.from('ledger').insert([{
           supplier_id: data[0].id,
           type: 'SUPPLIER_OPENING',
           amount: parseFloat(supplier.previousBalance),
           description: 'Opening Balance',
           date: new Date().toISOString()
        }]);
      }
      
      showToast('Supplier added successfully', 'success');
      return data[0];
    } catch (err) {
      console.error('Error adding supplier:', err.message);
      showToast('Failed to add supplier', 'error');
      return null;
    }
  };
  
  const updateSupplier = async (id, data) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
      showToast('Supplier updated', 'success');
    } catch (err) {
      console.error('Error updating supplier:', err.message);
      showToast('Failed to update supplier', 'error');
    }
  };
  
  const deleteSupplier = async (id) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast('Supplier removed', 'success');
    } catch (err) {
      console.error('Error deleting supplier:', err.message);
      showToast('Failed to remove supplier', 'error');
    }
  };
  
  const addSupplierInvoice = async (supplierId, amount, date, notes, invoiceNo) => {
    try {
      const { error } = await supabase
        .from('ledger')
        .insert([{
          supplier_id: supplierId,
          type: 'PURCHASE',
          amount: parseFloat(amount),
          date: date || new Date().toISOString(),
          description: `Inv: ${invoiceNo}${notes ? ' - ' + notes : ''}`,
          invoice_id: invoiceNo
        }]);
      
      if (error) throw error;
      showToast('Invoice recorded in ledger', 'success');
    } catch (err) {
      console.error('Error recording supplier invoice:', err.message);
      showToast('Failed to record invoice', 'error');
    }
  };

  const addSupplierPayment = async (supplierId, amount, date, notes) => {
    try {
      const { error } = await supabase
        .from('ledger')
        .insert([{
          supplier_id: supplierId,
          type: 'PAYMENT_MADE',
          amount: parseFloat(amount),
          date: date || new Date().toISOString(),
          description: notes || 'Payment Made'
        }]);
      
      if (error) throw error;
      showToast('Payment recorded in ledger', 'success');
    } catch (err) {
      console.error('Error recording supplier payment:', err.message);
      showToast('Failed to record payment', 'error');
    }
  };

  return (
    <SupplierContext.Provider value={{ 
      suppliers, 
      loading,
      addSupplier, 
      updateSupplier, 
      deleteSupplier,
      addSupplierInvoice, 
      addSupplierPayment 
    }}>
      {children}
    </SupplierContext.Provider>
  );
};

export const useSuppliers = () => useContext(SupplierContext);
