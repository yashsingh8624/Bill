import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from './ToastContext';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err.message);
      showToast('Error loading inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    
    // Realtime listener
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', 
        { event: '*', table: 'products', schema: 'public' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProducts(prev => [...prev, payload.new].sort((a,b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== payload.old.id));
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addProduct = async (product) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
           name: product.name,
           hsn: product.hsn,
           selling_price: parseFloat(product.sellingPrice || product.price || 0),
           purchase_price: parseFloat(product.purchasePrice || 0),
           quantity: parseInt(product.quantity || 0, 10),
           low_stock_threshold: parseInt(product.lowStockThreshold || 5, 10),
           stock_history: product.stockHistory || []
        }])
        .select();
      
      if (error) throw error;
      showToast('Product added successfully', 'success');
      return data[0];
    } catch (err) {
      console.error('Error adding product:', err.message);
      showToast('Failed to add product', 'error');
      return null;
    }
  };

  const updateProduct = async (id, data) => {
    try {
      // Map camelCase to snake_case for DB
      const dbData = {};
      if (data.name !== undefined) dbData.name = data.name;
      if (data.hsn !== undefined) dbData.hsn = data.hsn;
      if (data.sellingPrice !== undefined) dbData.selling_price = parseFloat(data.sellingPrice);
      if (data.purchasePrice !== undefined) dbData.purchase_price = parseFloat(data.purchasePrice);
      if (data.quantity !== undefined) dbData.quantity = parseInt(data.quantity, 10);
      if (data.lowStockThreshold !== undefined) dbData.low_stock_threshold = parseInt(data.lowStockThreshold, 10);
      if (data.stockHistory !== undefined) dbData.stock_history = data.stockHistory;

      const { error } = await supabase
        .from('products')
        .update(dbData)
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating product:', err.message);
      showToast('Failed to update product', 'error');
    }
  };

  const deleteProduct = async (id) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showToast('Product deleted', 'success');
    } catch (err) {
      console.error('Error deleting product:', err.message);
      showToast('Failed to delete product', 'error');
    }
  };

  const addStock = async (id, qtyChange, note) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;

      const change = parseInt(qtyChange, 10);
      const newQuantity = (product.quantity || 0) + change;
      const historyEntry = { 
         id: Date.now().toString(),
         date: new Date().toISOString(), 
         change, 
         note,
         type: change >= 0 ? 'IN' : 'OUT'
      };

      const { error } = await supabase
        .from('products')
        .update({
          quantity: newQuantity,
          stock_history: [...(product.stock_history || []), historyEntry]
        })
        .eq('id', id);
      
      if (error) throw error;
      showToast(`Stock ${change >= 0 ? 'added' : 'removed'} updated`, 'success');
    } catch (err) {
      console.error('Error adding stock:', err.message);
      showToast('Failed to update stock', 'error');
    }
  };

  return (
    <InventoryContext.Provider value={{ 
      products, 
      loading,
      setProducts, 
      addProduct, 
      updateProduct, 
      deleteProduct, 
      addStock 
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => useContext(InventoryContext);
