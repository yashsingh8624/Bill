import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { generateId } from '../utils/storage';

const SHEET_NAME = 'PRODUCTS';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady } = useAuth();
  const { showToast } = useToast();

  const fetchProducts = async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, SHEET_NAME);
      // Parse stock_history_json back to object
      const parsed = data
        .filter(p => !p.id.startsWith('DELETED_'))
        .map(p => ({
          ...p,
          selling_price: parseFloat(p.selling_price || 0),
          purchase_price: parseFloat(p.purchase_price || 0),
          quantity: parseInt(p.quantity || 0, 10),
          low_stock_threshold: parseInt(p.low_stock_threshold || 5, 10),
          stock_history: p.stock_history_json ? JSON.parse(p.stock_history_json) : []
        }));
      setProducts(parsed.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast('Error loading inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && spreadsheetId) {
      fetchProducts();
    }
  }, [isReady, spreadsheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addProduct = async (product) => {
    try {
      const newProduct = {
        id: generateId(),
        name: product.name || '',
        hsn: product.hsn || '',
        selling_price: String(parseFloat(product.sellingPrice || product.price || 0)),
        purchase_price: String(parseFloat(product.purchasePrice || 0)),
        quantity: String(parseInt(product.quantity || 0, 10)),
        low_stock_threshold: String(parseInt(product.lowStockThreshold || 5, 10)),
        stock_history_json: JSON.stringify(product.stockHistory || []),
        created_at: new Date().toISOString()
      };

      await appendRow(spreadsheetId, SHEET_NAME, objectToRow(SHEET_NAME, newProduct));

      const parsed = {
        ...newProduct,
        selling_price: parseFloat(newProduct.selling_price),
        purchase_price: parseFloat(newProduct.purchase_price),
        quantity: parseInt(newProduct.quantity, 10),
        low_stock_threshold: parseInt(newProduct.low_stock_threshold, 10),
        stock_history: product.stockHistory || []
      };

      setProducts(prev => [...prev, parsed].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Product added successfully', 'success');
      return parsed;
    } catch (err) {
      console.error('Error adding product:', err);
      showToast('Failed to add product', 'error');
      return null;
    }
  };

  const updateProduct = async (id, data) => {
    try {
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx === -1) throw new Error('Product not found');

      const existing = products.find(p => p.id === id);
      const updated = { ...existing };

      if (data.name !== undefined) updated.name = data.name;
      if (data.hsn !== undefined) updated.hsn = data.hsn;
      if (data.sellingPrice !== undefined) updated.selling_price = parseFloat(data.sellingPrice);
      if (data.purchasePrice !== undefined) updated.purchase_price = parseFloat(data.purchasePrice);
      if (data.quantity !== undefined) updated.quantity = parseInt(data.quantity, 10);
      if (data.lowStockThreshold !== undefined) updated.low_stock_threshold = parseInt(data.lowStockThreshold, 10);
      if (data.stockHistory !== undefined) updated.stock_history = data.stockHistory;

      const sheetRow = objectToRow(SHEET_NAME, {
        ...updated,
        selling_price: String(updated.selling_price),
        purchase_price: String(updated.purchase_price),
        quantity: String(updated.quantity),
        low_stock_threshold: String(updated.low_stock_threshold),
        stock_history_json: JSON.stringify(updated.stock_history || [])
      });

      await updateRow(spreadsheetId, SHEET_NAME, rowIdx, sheetRow);
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
    } catch (err) {
      console.error('Error updating product:', err);
      showToast('Failed to update product', 'error');
    }
  };

  const deleteProduct = async (id) => {
    try {
      const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
      if (rowIdx !== -1) {
        const emptyRow = objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', hsn: '', selling_price: '0', purchase_price: '0', quantity: '0', low_stock_threshold: '0', stock_history_json: '[]', created_at: '' });
        await updateRow(spreadsheetId, SHEET_NAME, rowIdx, emptyRow);
      }
      setProducts(prev => prev.filter(p => p.id !== id));
      showToast('Product deleted', 'success');
    } catch (err) {
      console.error('Error deleting product:', err);
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
        id: generateId(),
        date: new Date().toISOString(),
        change,
        note,
        type: change >= 0 ? 'IN' : 'OUT'
      };
      const newHistory = [...(product.stock_history || []), historyEntry];

      await updateProduct(id, {
        quantity: newQuantity,
        stockHistory: newHistory
      });

      showToast(`Stock ${change >= 0 ? 'added' : 'removed'}`, 'success');
    } catch (err) {
      console.error('Error updating stock:', err);
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
      addStock,
      refreshProducts: fetchProducts
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => useContext(InventoryContext);
