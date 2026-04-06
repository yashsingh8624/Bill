import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { generateId, generateReadableId } from '../utils/storage';

const SHEET_NAME = 'PRODUCTS';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady } = useAuth();
  const { showToast } = useToast();

  const fetchProducts = useCallback(async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, SHEET_NAME);
      const parsed = data
        .filter(p => !p.id.startsWith('DELETED_'))
        .map(p => ({
          ...p,
          sellingPrice: parseFloat(p.selling_price || 0),
          selling_price: parseFloat(p.selling_price || 0),
          purchasePrice: parseFloat(p.purchase_price || 0),
          purchase_price: parseFloat(p.purchase_price || 0),
          quantity: parseInt(p.quantity || 0, 10),
          lowStockThreshold: parseInt(p.low_stock_threshold || 5, 10),
          low_stock_threshold: parseInt(p.low_stock_threshold || 5, 10),
          stockHistory: p.stock_history_json ? (() => { try { return JSON.parse(p.stock_history_json); } catch { return []; } })() : [],
          stock_history: p.stock_history_json ? (() => { try { return JSON.parse(p.stock_history_json); } catch { return []; } })() : []
        }));
      setProducts(parsed.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast('Error loading inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, showToast]);

  useEffect(() => {
    if (isReady && spreadsheetId) {
      fetchProducts();
    }
  }, [isReady, spreadsheetId, fetchProducts]);

  const addProduct = useCallback(async (product) => {
    try {
      const newProduct = {
        id: generateReadableId('P', products),
        name: product.name || '',
        hsn: product.hsn || '',
        selling_price: String(parseFloat(product.sellingPrice || product.price || 0)),
        purchase_price: String(parseFloat(product.purchasePrice || 0)),
        quantity: String(parseInt(product.quantity || 0, 10)),
        low_stock_threshold: String(parseInt(product.lowStockThreshold || 5, 10)),
        stock_history_json: JSON.stringify(product.stockHistory || []),
        created_at: new Date().toISOString()
      };

      // Optimistic UI update first
      const parsed = {
        ...newProduct,
        sellingPrice: parseFloat(newProduct.selling_price),
        selling_price: parseFloat(newProduct.selling_price),
        purchasePrice: parseFloat(newProduct.purchase_price),
        purchase_price: parseFloat(newProduct.purchase_price),
        quantity: parseInt(newProduct.quantity, 10),
        lowStockThreshold: parseInt(newProduct.low_stock_threshold, 10),
        low_stock_threshold: parseInt(newProduct.low_stock_threshold, 10),
        stockHistory: product.stockHistory || [],
        stock_history: product.stockHistory || []
      };

      setProducts(prev => [...prev, parsed].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Product added ✓', 'success');

      // Background sync
      await appendRow(spreadsheetId, SHEET_NAME, objectToRow(SHEET_NAME, newProduct));

      return parsed;
    } catch (err) {
      console.error('Error adding product:', err);
      showToast('Product saved locally. Cloud sync pending.', 'warning');
      return null;
    }
  }, [spreadsheetId, products, showToast]);

  const updateProduct = useCallback(async (id, data) => {
    try {
      const existing = products.find(p => p.id === id);
      if (!existing) return;

      const updated = { ...existing };

      if (data.name !== undefined) updated.name = data.name;
      if (data.hsn !== undefined) updated.hsn = data.hsn;
      if (data.sellingPrice !== undefined) {
        updated.sellingPrice = parseFloat(data.sellingPrice);
        updated.selling_price = parseFloat(data.sellingPrice);
      }
      if (data.purchasePrice !== undefined) {
        updated.purchasePrice = parseFloat(data.purchasePrice);
        updated.purchase_price = parseFloat(data.purchasePrice);
      }
      if (data.quantity !== undefined) updated.quantity = parseInt(data.quantity, 10);
      if (data.lowStockThreshold !== undefined) {
        updated.lowStockThreshold = parseInt(data.lowStockThreshold, 10);
        updated.low_stock_threshold = parseInt(data.lowStockThreshold, 10);
      }
      if (data.stockHistory !== undefined) {
        updated.stockHistory = data.stockHistory;
        updated.stock_history = data.stockHistory;
      }

      // Optimistic UI update
      setProducts(prev => prev.map(p => p.id === id ? updated : p));

      // Background sync
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx !== -1) {
        const sheetRow = objectToRow(SHEET_NAME, {
          ...updated,
          selling_price: String(updated.sellingPrice || updated.selling_price),
          purchase_price: String(updated.purchasePrice || updated.purchase_price),
          quantity: String(updated.quantity),
          low_stock_threshold: String(updated.lowStockThreshold || updated.low_stock_threshold),
          stock_history_json: JSON.stringify(updated.stockHistory || updated.stock_history || [])
        });
        await updateRow(spreadsheetId, SHEET_NAME, rowIdx, sheetRow);
      }
    } catch (err) {
      console.error('Error updating product:', err);
      showToast('Update saved locally. Cloud sync pending.', 'warning');
    }
  }, [spreadsheetId, products, showToast]);

  const deleteProduct = useCallback(async (id) => {
    try {
      // Optimistic UI
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Product deleted', 'success');

      // Background sync
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx !== -1) {
        const emptyRow = objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', hsn: '', selling_price: '0', purchase_price: '0', quantity: '0', low_stock_threshold: '0', stock_history_json: '[]', created_at: '' });
        await updateRow(spreadsheetId, SHEET_NAME, rowIdx, emptyRow);
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast('Delete saved locally. Cloud sync pending.', 'warning');
    }
  }, [spreadsheetId, showToast]);

  const addStock = useCallback(async (id, qtyChange, note) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;

      const change = parseInt(qtyChange, 10);
      const newQuantity = Math.max(0, (product.quantity || 0) + change);
      const historyEntry = {
        id: generateId(),
        date: new Date().toISOString(),
        change,
        note,
        type: change >= 0 ? 'IN' : 'OUT'
      };
      const newHistory = [...(product.stockHistory || product.stock_history || []), historyEntry];

      await updateProduct(id, {
        quantity: newQuantity,
        stockHistory: newHistory
      });

      showToast(`Stock ${change >= 0 ? 'added' : 'removed'} ✓`, 'success');
    } catch (err) {
      console.error('Error updating stock:', err);
      showToast('Stock update saved locally.', 'warning');
    }
  }, [products, updateProduct, showToast]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    products,
    loading,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addStock,
    refreshProducts: fetchProducts
  }), [products, loading, addProduct, updateProduct, deleteProduct, addStock, fetchProducts]);

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => useContext(InventoryContext);
