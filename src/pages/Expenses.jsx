import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { IndianRupee, Plus, Trash2, Calendar, Tag, CreditCard, Wallet, Search } from 'lucide-react';

export default function Expenses() {
  const { expenses, addExpense, loading } = useExpenses();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    category: 'General'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;
    
    const success = await addExpense({
      ...formData,
      amount: parseFloat(formData.amount)
    });
    
    if (success) {
      setFormData({
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'Cash',
        category: 'General'
      });
      setIsAdding(false);
    }
  };

  const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const cashExpenses = expenses.filter(e => e.payment_mode === 'Cash').reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-0 min-w-0 pt-2 sm:pt-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Expense Tracker</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">Track your shop's daily operational costs.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl transition-all font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95"
        >
          {isAdding ? <Plus className="rotate-45 transition-transform" /> : <Plus />}
          {isAdding ? 'Cancel' : 'Add Expense'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center shadow-inner">
            <IndianRupee size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Expenses</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">₹{totalExpense.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shadow-inner">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Cash Outflow</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">₹{cashExpenses.toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      {isAdding && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl border border-indigo-100 dark:border-indigo-900/50 animate-in slide-in-from-top duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-xs font-black uppercase tracking-widest mb-1.5 ml-1">Expense Name *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Electricity Bill, Shop Rent"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-xs font-black uppercase tracking-widest mb-1.5 ml-1">Amount (₹) *</label>
                <input
                  type="number" required min="0" step="0.01"
                  value={formData.amount || ''}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500/50 text-sm font-black text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-xs font-black uppercase tracking-widest mb-1.5 ml-1">Date</label>
                <input
                  type="date" required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-xs font-black uppercase tracking-widest mb-1.5 ml-1">Payment Mode</label>
                <div className="flex gap-2">
                  {['Cash', 'Online'].map(mode => (
                    <button
                      key={mode} type="button"
                      onClick={() => setFormData({ ...formData, paymentMode: mode })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${formData.paymentMode === mode ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-[46px] bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-600 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/50 flex justify-between items-center sm:px-8">
          <h3 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest text-xs flex items-center gap-2">
            <Tag size={16} className="text-slate-400" /> Recent Expenses
          </h3>
          <span className="text-[10px] font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1 rounded-full text-slate-400 tracking-wider">
            {expenses.length} Entries
          </span>
        </div>
        
        <div className="table-wrapper">
          {expenses.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-full mb-4 border border-slate-100 dark:border-slate-700">
                  <Search size={32} className="text-slate-300" />
               </div>
               <p className="font-black text-slate-700 dark:text-slate-300 text-lg uppercase tracking-tight">No Expenses Recorded</p>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Start by adding your first shop expense</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-full max-w-sm">
              <thead>
                <tr className="bg-white dark:bg-slate-800 border-b border-slate-50 dark:border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="py-5 px-8">Date</th>
                  <th className="py-5 px-6">Description</th>
                  <th className="py-5 px-6">Mode</th>
                  <th className="py-5 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="py-5 px-8">
                       <p className="font-bold text-slate-500 dark:text-slate-400 text-sm uppercase">{new Date(expense.date).toLocaleDateString()}</p>
                    </td>
                    <td className="py-5 px-6">
                       <p className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase tracking-tight">{expense.name}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{expense.category}</p>
                    </td>
                    <td className="py-5 px-6">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${expense.payment_mode === 'Cash' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900'}`}>
                          {expense.payment_mode === 'Cash' ? <Wallet size={12} /> : <CreditCard size={12} />}
                          {expense.payment_mode}
                       </span>
                    </td>
                    <td className="py-5 px-6 text-right pr-8">
                       <p className="font-black text-slate-800 dark:text-slate-100 text-lg tracking-tighter">₹{(expense.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
