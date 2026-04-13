import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getCollectionData, addDocument } from '../utils/firestoreService';
import { generateId } from '../utils/storage';

const FIRESTORE_COLLECTION = 'expenses';
const ExpenseContext = createContext();

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isReady } = useAuth();
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCollectionData(FIRESTORE_COLLECTION);
      const sorted = data.map(e => ({ ...e, amount: parseFloat(e.amount || 0) }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(sorted);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // KEY FIX: Always wait for isReady
  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [isReady, fetchData]);

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
      setExpenses(prev => [appExpense, ...prev]);

      await addDocument(FIRESTORE_COLLECTION, newExpense);
      
      showToast('Expense added successfully', 'success');
      return true;
    } catch (err) {
      console.error('Error adding expense:', err);
      showToast('Failed to add expense', 'error');
      return false;
    }
  };

  const contextValue = useMemo(() => ({
    expenses, loading, addExpense, refreshExpenses: fetchData
  }), [expenses, loading, addExpense, fetchData]);

  return (
    <ExpenseContext.Provider value={contextValue}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => useContext(ExpenseContext);
