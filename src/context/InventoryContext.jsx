import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState(() => safeGet('smartbill_products', []));

  useEffect(() => {
    safeSet('smartbill_products', products);
  }, [products]);

  const addProduct = (product) => setProducts(prev => [...prev, { ...product, id: generateId() }]);
  
  const updateProduct = (id, data) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  
  const deleteProduct = (id) => setProducts(prev => prev.filter(p => p.id !== id));
  
  const addStock = (id, qtyChange, note) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const change = parseInt(qtyChange, 10);
        return {
          ...p,
          quantity: (p.quantity || 0) + change,
          stockHistory: [...(p.stockHistory || []), { 
             id: generateId(),
             date: new Date().toISOString(), 
             change, 
             note,
             type: change >= 0 ? 'IN' : 'OUT'
          }]
        };
      }
      return p;
    }));
  };

  return (
    <InventoryContext.Provider value={{ 
      products, 
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
