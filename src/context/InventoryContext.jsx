import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { getCollectionData, addDocument, updateDocument, softDeleteDocument, subscribeToCollection } from '../utils/firestoreService';
import { generateId, generateReadableId } from '../utils/storage';

const SHEET_NAME = 'PRODUCTS';
const FIRESTORE_COLLECTION = 'products';

const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady, useFirebase, firebaseUid } = useAuth();
  const { showToast } = useToast();
  const unsubRef = useRef(null);

  const parseProduct = (p) => ({
    ...p,
    sellingPrice: parseFloat(p.selling_price || p.sellingPrice || 0),
    selling_price: parseFloat(p.selling_price || p.sellingPrice || 0),
    purchasePrice: parseFloat(p.purchase_price || p.purchasePrice || 0),
    purchase_price: parseFloat(p.purchase_price || p.purchasePrice || 0),
    quantity: parseInt(p.quantity || 0, 10),
    lowStockThreshold: parseInt(p.low_stock_threshold || p.lowStockThreshold || 5, 10),
    low_stock_threshold: parseInt(p.low_stock_threshold || p.lowStockThreshold || 5, 10),
    stockHistory: p.stock_history_json ? (() => { try { return JSON.parse(p.stock_history_json); } catch { return []; } })() : (p.stockHistory || p.stock_history || []),
    stock_history: p.stock_history_json ? (() => { try { return JSON.parse(p.stock_history_json); } catch { return []; } })() : (p.stockHistory || p.stock_history || [])
  });

  // ===== FIREBASE: Real-time onSnapshot =====
  useEffect(() => {
    if (!isReady || !useFirebase) return;

    console.log('[InventoryContext] 🔴 Setting up real-time listener for products');
    setLoading(true);

    unsubRef.current = subscribeToCollection(FIRESTORE_COLLECTION, (data) => {
      console.log(`[InventoryContext] 🔴 LIVE products update: ${data.length} docs`);
      const parsed = data
        .filter(p => !p.id?.startsWith('DELETED_'))
        .map(parseProduct)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setProducts(parsed);
      setLoading(false);
    }, (err) => {
      console.error('[InventoryContext] Products snapshot error:', err);
      showToast('Error loading inventory', 'error');
      setLoading(false);
    }, firebaseUid);

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [isReady, useFirebase, firebaseUid, showToast]);

  // ===== SHEETS: one-time fetch =====
  const fetchProductsSheets = useCallback(async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, SHEET_NAME);
      const parsed = data.filter(p => !p.id.startsWith('DELETED_')).map(parseProduct);
      setProducts(parsed.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch (err) {
      console.error('Error fetching products (Sheets):', err);
      showToast('Error loading inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId, showToast]);

  useEffect(() => {
    if (!isReady || useFirebase) return;
    fetchProductsSheets();
  }, [isReady, useFirebase, fetchProductsSheets]);

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

      const parsed = parseProduct(newProduct);
      
      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setProducts(prev => [...prev, parsed].sort((a, b) => a.name.localeCompare(b.name)));
      }
      
      showToast('Product added ✓', 'success');

      if (useFirebase) {
        await addDocument(FIRESTORE_COLLECTION, newProduct);
      } else {
        await appendRow(spreadsheetId, SHEET_NAME, objectToRow(SHEET_NAME, newProduct));
      }

      return parsed;
    } catch (err) {
      console.error('Error adding product:', err);
      showToast('Failed to add product: ' + (err.message || 'Unknown error'), 'error');
      return null;
    }
  }, [spreadsheetId, products, showToast, useFirebase]);

  const updateProduct = useCallback(async (id, data) => {
    try {
      const existing = products.find(p => p.id === id);
      if (!existing) return;

      const updated = { ...existing };
      if (data.name !== undefined) updated.name = data.name;
      if (data.hsn !== undefined) updated.hsn = data.hsn;
      if (data.sellingPrice !== undefined) { updated.sellingPrice = parseFloat(data.sellingPrice); updated.selling_price = parseFloat(data.sellingPrice); }
      if (data.purchasePrice !== undefined) { updated.purchasePrice = parseFloat(data.purchasePrice); updated.purchase_price = parseFloat(data.purchasePrice); }
      if (data.quantity !== undefined) updated.quantity = parseInt(data.quantity, 10);
      if (data.lowStockThreshold !== undefined) { updated.lowStockThreshold = parseInt(data.lowStockThreshold, 10); updated.low_stock_threshold = parseInt(data.lowStockThreshold, 10); }
      if (data.stockHistory !== undefined) { updated.stockHistory = data.stockHistory; updated.stock_history = data.stockHistory; }

      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setProducts(prev => prev.map(p => p.id === id ? updated : p));
      }

      if (useFirebase) {
        await updateDocument(FIRESTORE_COLLECTION, id, {
          name: updated.name, hsn: updated.hsn,
          selling_price: String(updated.sellingPrice || updated.selling_price),
          purchase_price: String(updated.purchasePrice || updated.purchase_price),
          quantity: String(updated.quantity),
          low_stock_threshold: String(updated.lowStockThreshold || updated.low_stock_threshold),
          stock_history_json: JSON.stringify(updated.stockHistory || updated.stock_history || [])
        });
      } else {
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
      }
    } catch (err) {
      console.error('Error updating product:', err);
      showToast('Failed to update product', 'error');
    }
  }, [spreadsheetId, products, showToast, useFirebase]);

  const deleteProduct = useCallback(async (id) => {
    try {
      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
      showToast('Product deleted', 'success');

      if (useFirebase) {
        await softDeleteDocument(FIRESTORE_COLLECTION, id);
      } else {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'id', id);
        if (rowIdx !== -1) {
          const emptyRow = objectToRow(SHEET_NAME, { id: `DELETED_${id}`, name: '[DELETED]', hsn: '', selling_price: '0', purchase_price: '0', quantity: '0', low_stock_threshold: '0', stock_history_json: '[]', created_at: '' });
          await updateRow(spreadsheetId, SHEET_NAME, rowIdx, emptyRow);
        }
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast('Failed to delete product', 'error');
    }
  }, [spreadsheetId, showToast, useFirebase]);

  const addStock = useCallback(async (id, qtyChange, note) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) return;
      const change = parseInt(qtyChange, 10);
      const newQuantity = Math.max(0, (product.quantity || 0) + change);
      const historyEntry = { id: generateId(), date: new Date().toISOString(), change, note, type: change >= 0 ? 'IN' : 'OUT' };
      const newHistory = [...(product.stockHistory || product.stock_history || []), historyEntry];
      await updateProduct(id, { quantity: newQuantity, stockHistory: newHistory });
      showToast(`Stock ${change >= 0 ? 'added' : 'removed'} ✓`, 'success');
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  }, [products, updateProduct, showToast]);

  const refreshProducts = useCallback(async () => {
    if (useFirebase) {
      console.log('[InventoryContext] Firebase mode — data is live, no manual refresh needed');
      return;
    }
    await fetchProductsSheets();
  }, [useFirebase, fetchProductsSheets]);

  const contextValue = useMemo(() => ({
    products, loading, setProducts, addProduct, updateProduct, deleteProduct, addStock, refreshProducts
  }), [products, loading, addProduct, updateProduct, deleteProduct, addStock, refreshProducts]);

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => useContext(InventoryContext);
