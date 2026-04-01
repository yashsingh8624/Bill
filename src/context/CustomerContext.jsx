import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from './ToastContext';

const CustomerContext = createContext();

export const CustomerProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // 1. Fetch data from Supabase on mount
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err.message);
      showToast('Error loading customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();

    // 2. Set up realtime subscription
    const channel = supabase
      .channel('customers-changes')
      .on('postgres_changes', 
        { event: '*', table: 'customers', schema: 'public' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCustomers(prev => [...prev, payload.new].sort((a,b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setCustomers(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
          } else if (payload.eventType === 'DELETE') {
            setCustomers(prev => prev.filter(c => c.id !== payload.old.id));
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Database Operations
  const addCustomer = async (customerData) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select();
      
      if (error) throw error;
      
      // If there was an opening balance, record it in the ledger separately
      if (parseFloat(customerData.previousBalance || 0) > 0) {
        await supabase.from('ledger').insert([{
           customer_id: data[0].id,
           type: 'OPENING',
           amount: parseFloat(customerData.previousBalance),
           description: 'Opening Balance',
           date: new Date().toISOString()
        }]);
      }
      
      return data[0];
    } catch (err) {
      console.error('Error adding customer:', err.message);
      showToast('Failed to add customer', 'error');
      return null;
    }
  };

  const updateCustomer = async (id, data) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating customer:', err.message);
      showToast('Failed to update customer', 'error');
    }
  };
  
  const deleteCustomer = async (id) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting customer:', err.message);
      showToast('Failed to delete customer', 'error');
    }
  };

  const addCustomerPayment = async (customerId, amount, date, notes) => {
    try {
      const { error } = await supabase
        .from('ledger')
        .insert([{
          customer_id: customerId,
          type: 'PAYMENT',
          amount: parseFloat(amount),
          date: date || new Date().toISOString(),
          description: notes || 'Direct Payment'
        }]);
      
      if (error) throw error;
      showToast('Payment recorded successfully', 'success');
    } catch (err) {
       console.error('Error recording payment:', err.message);
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
      addCustomerPayment 
    }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomers = () => useContext(CustomerContext);
