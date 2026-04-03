import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { safeGet, safeSet, generateId } from '../utils/storage';

const STORAGE_KEY = 'smartbill_products';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Load from localStorage on mount
  useEffect(() => {
    const saved = safeGet(STORAGE_KEY, []);
    setProducts(saved.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setLoading(false);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (!loading) {
      safeSet(STORAGE_KEY, products);
    }
  }, [products, loading]);

  const addProduct = (product) => {
    try {
      const newProduct = {
        id: generateId(),
        name: product.name,
        hsn: product.hsn,
        selling_price: parseFloat(product.sellingPrice || product.price || 0),
        purchase_price: parseFloat(product.purchasePrice || 0),
        quantity: parseInt(product.quantity || 0, 10),
        low_stock_threshold: parseInt(product.lowStockThreshold || 5, 10),
        stock_history: product.stockHistory || [],
        created_at: new Date().toISOString()
      };
      
      setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Product added successfully', 'success');
      return newProduct;
    } catch (err) {
      console.error('Error adding product:', err.message);
      showToast('Failed to add product', 'error');
      return null;
    }
  };

  const updateProduct = (id, data) => {
    try {
      setProducts(prev => prev.map(p => {
        if (p.id !== id) return p;
        const updated = { ...p };
        if (data.name !== undefined) updated.name = data.name;
        if (data.hsn !== undefined) updated.hsn = data.hsn;
        if (data.sellingPrice !== undefined) updated.selling_price = parseFloat(data.sellingPrice);
        if (data.purchasePrice !== undefined) updated.purchase_price = parseFloat(data.purchasePrice);
        if (data.quantity !== undefined) updated.quantity = parseInt(data.quantity, 10);
        if (data.lowStockThreshold !== undefined) updated.low_stock_threshold = parseInt(data.lowStockThreshold, 10);
        if (data.stockHistory !== undefined) updated.stock_history = data.stockHistory;
        return updated;
      }));
    } catch (err) {
      console.error('Error updating product:', err.message);
      showToast('Failed to update product', 'error');
    }
  };

  const deleteProduct = (id) => {
    try {
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Product deleted', 'success');
    } catch (err) {
      console.error('Error deleting product:', err.message);
      showToast('Failed to delete product', 'error');
    }
  };

  const addStock = (id, qtyChange, note) => {
    try {
      setProducts(prev => prev.map(p => {
        if (p.id !== id) return p;
        
        const change = parseInt(qtyChange, 10);
        const newQuantity = (p.quantity || 0) + change;
        const historyEntry = { 
          id: generateId(),
          date: new Date().toISOString(), 
          change, 
          note,
          type: change >= 0 ? 'IN' : 'OUT'
        };

        return {
          ...p,
          quantity: newQuantity,
          stock_history: [...(p.stock_history || []), historyEntry]
        };
      }));
      
      const change = parseInt(qtyChange, 10);
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
