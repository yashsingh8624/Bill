import React, { useState, useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { useExpenses } from '../context/ExpenseContext';
import { Landmark, ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, Filter } from 'lucide-react';

export default function CashBank() {
  const { bills } = useBills() || { bills: [] };
  const { expenses } = useExpenses() || { expenses: [] };
  const validBills = Array.isArray(bills) ? bills : [];
  const validExpenses = Array.isArray(expenses) ? expenses : [];
  
  const [dateFilter, setDateFilter] = useState('ALL');

  const {
    filteredBills,
    filteredExpenses
  } = useMemo(() => {
    let b = validBills.filter(bill => !bill.isDeleted);
    let e = validExpenses;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);

    if (dateFilter === 'TODAY') {
      b = b.filter(bill => bill.date && bill.date.startsWith(todayStr));
      e = e.filter(exp => exp.date && exp.date.startsWith(todayStr));
    } else if (dateFilter === 'YESTERDAY') {
      b = b.filter(bill => bill.date && bill.date.startsWith(yesterdayStr));
      e = e.filter(exp => exp.date && exp.date.startsWith(yesterdayStr));
    } else if (dateFilter === 'MONTH') {
      b = b.filter(bill => bill.date && bill.date.startsWith(thisMonthStr));
      e = e.filter(exp => exp.date && exp.date.startsWith(thisMonthStr));
    }
    
    return { filteredBills: b, filteredExpenses: e };
  }, [validBills, validExpenses, dateFilter]);

  const totalCollected = filteredBills.reduce((acc, bill) => acc + (parseFloat(bill.amountPaid || bill.paidAmount || 0) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, exp) => acc + (parseFloat(exp.amount) || 0), 0);
  const netCashFlow = totalCollected - totalExpenses;

  // Compile Transactions
  const transactions = useMemo(() => {
    const txs = [];
    filteredBills.forEach(bill => {
      const amt = parseFloat(bill.amountPaid || bill.paidAmount || 0);
      if (amt > 0) {
        txs.push({
          id: `bill-${bill.id || Math.random()}`,
          date: bill.date,
          type: 'IN',
          title: `Payment from ${bill.customerName || 'Customer'}`,
          reference: `#${bill.invoiceNo || 'N/A'}`,
          amount: amt
        });
      }
    });

    filteredExpenses.forEach(exp => {
      const amt = parseFloat(exp.amount || 0);
      if (amt > 0) {
        txs.push({
          id: `exp-${exp.id || Math.random()}`,
          date: exp.date,
          type: 'OUT',
          title: `Expense: ${exp.category || 'General'}`,
          reference: exp.name || 'N/A',
          amount: amt
        });
      }
    });

    // Sort by date descending
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredBills, filteredExpenses]);

  return (
    <div className="space-y-6 flex flex-col w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 page-animate min-w-0">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Landmark className="text-blue-600 dark:text-blue-500" size={28} />
            Cash & Bank
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Track your overall cash flow and banking activity.</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto overflow-x-auto custom-scrollbar">
          {[
            { id: 'ALL', label: 'All Time', icon: Calendar },
            { id: 'TODAY', label: 'Today', icon: Filter },
            { id: 'YESTERDAY', label: 'Yesterday', icon: Filter },
            { id: 'MONTH', label: 'This Month', icon: Filter }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`flex-1 min-w-[100px] py-2 px-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${dateFilter === f.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800/50' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <f.icon size={16} />
              {f.label}
            </button>
          ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Net Cash Flow</p>
            <h3 className={`text-2xl font-black ${netCashFlow >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
              ₹{Math.abs(netCashFlow).toFixed(2)} {netCashFlow < 0 && '(Negative)'}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
              <ArrowUpRight size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Total In (Collected)</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              ₹{totalCollected.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-4">
              <ArrowDownRight size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Total Out (Expenses)</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              ₹{totalExpenses.toFixed(2)}
            </h3>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-8 mb-4">Recent Activity</h3>
      
      <div className="bg-white dark:bg-slate-800 rounded-[16px] shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div className="block lg:hidden p-4 space-y-3">
            {transactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8 font-medium">No activity for this period.</p>
            ) : transactions.map((tx) => (
                <div key={tx.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${tx.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {tx.type === 'IN' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{tx.title}</h4>
                                <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <span className={`font-black ${tx.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {tx.type === 'IN' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </span>
                    </div>
                </div>
            ))}
        </div>

        <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                    <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                        <th className="py-4 px-6">Date</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6">Description</th>
                        <th className="py-4 px-6">Details</th>
                        <th className="py-4 px-6 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {transactions.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-500 font-medium">No activity in the selected period.</td>
                        </tr>
                    ) : transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="py-4 px-6 text-sm font-medium text-slate-600 dark:text-slate-400">
                                {new Date(tx.date).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${tx.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {tx.type === 'IN' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {tx.type === 'IN' ? 'CREDIT' : 'DEBIT'}
                                </span>
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-100">
                                {tx.title}
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-500">
                                {tx.reference}
                            </td>
                            <td className={`py-4 px-6 text-right font-black ${tx.type === 'IN' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {tx.type === 'IN' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}