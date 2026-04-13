import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow } from '../utils/sheetsService';
import { getCollectionData, addDocument, subscribeToCollection } from '../utils/firestoreService';
import { generateId } from '../utils/storage';

const EXPENSES_SHEET = 'EXPENSES';
const FIRESTORE_COLLECTION = 'expenses';
const ExpenseContext = createContext();

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { spreadsheetId, isReady, useFirebase, firebaseUid } = useAuth();
  const { showToast } = useToast();
  const unsubRef = useRef(null);

  // ===== FIREBASE: Real-time onSnapshot =====
  useEffect(() => {
    if (!isReady || !useFirebase) return;

    console.log('[ExpenseContext] 🔴 Setting up real-time listener for expenses');
    setLoading(true);

    unsubRef.current = subscribeToCollection(FIRESTORE_COLLECTION, (data) => {
      console.log(`[ExpenseContext] 🔴 LIVE expenses update: ${data.length} docs`);
      const sorted = data
        .map(e => ({ ...e, amount: parseFloat(e.amount || 0) }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted);
      setLoading(false);
    }, (err) => {
      console.error('[ExpenseContext] Expenses snapshot error:', err);
      setLoading(false);
    }, firebaseUid);

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [isReady, useFirebase, firebaseUid]);

  // ===== SHEETS: one-time fetch =====
  const fetchDataSheets = useCallback(async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, EXPENSES_SHEET);
      const sorted = data.map(e => ({ ...e, amount: parseFloat(e.amount || 0) }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted);
    } catch (err) {
      console.error('Error fetching expenses (Sheets):', err);
    } finally {
      setLoading(false);
    }
  }, [spreadsheetId]);

  useEffect(() => {
    if (!isReady || useFirebase) return;
    fetchDataSheets();
  }, [isReady, useFirebase, fetchDataSheets]);

  const addExpense = async (expense) => {
    try {
      const newExpense = {
        id: generateId(),
        date: expense.date || new Date().toISOString().split('T')[0],
        name: expense.name,
        amount: String(expense.amount),
        payment_mode: expense.paymentMode || 'Cash',
        category: expense.category || 'General',
        created_at: new Date().toISOString()
      };

      const appExpense = { ...newExpense, amount: parseFloat(newExpense.amount) };
      
      // Optimistic update for Sheets mode
      if (!useFirebase) {
        setExpenses(prev => [appExpense, ...prev]);
      }

      if (useFirebase) {
        await addDocument(FIRESTORE_COLLECTION, newExpense);
        console.log('[ExpenseContext] ✅ Expense saved to Firestore');
      } else {
        await appendRow(spreadsheetId, EXPENSES_SHEET, objectToRow(EXPENSES_SHEET, newExpense));
      }
      
      showToast('Expense added successfully', 'success');
      return true;
    } catch (err) {
      console.error('Error adding expense:', err);
      showToast('Failed to add expense: ' + (err.message || 'Unknown error'), 'error');
      return false;
    }
  };

  const refreshExpenses = useCallback(async () => {
    if (useFirebase) {
      console.log('[ExpenseContext] Firebase mode — data is live, no manual refresh needed');
      return;
    }
    await fetchDataSheets();
  }, [useFirebase, fetchDataSheets]);

  const contextValue = useMemo(() => ({
    expenses, loading, addExpense, refreshExpenses
  }), [expenses, loading, addExpense, refreshExpenses]);

  return (
    <ExpenseContext.Provider value={contextValue}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => useContext(ExpenseContext);
