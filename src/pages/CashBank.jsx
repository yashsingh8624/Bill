import React, { useState, useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { useExpenses } from '../context/ExpenseContext';
import { useParties } from '../context/PartiesContext';
import { Landmark, ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, Filter, Smartphone, Banknote, Building2 } from 'lucide-react';

export default function CashBank() {
  const { bills = [], ledger = [] } = useBills() || {};
  const { expenses = [] } = useExpenses() || {};
  const { customers = [], suppliers = [] } = useParties() || {};
  const validBills = Array.isArray(bills) ? bills : [];
  const validExpenses = Array.isArray(expenses) ? expenses : [];
  const validLedger = Array.isArray(ledger) ? ledger : [];
  
  const [dateFilter, setDateFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  const allTransactions = useMemo(() => {
    const txs = [];
    validBills.filter(b => !b.isDeleted).forEach(bill => {
      const amt = parseFloat(bill.amountPaid || bill.paidAmount || 0);
      if (amt > 0) Object.assign(txs[txs.length] = {
        id: `b-${bill.id}`, date: bill.date, type: 'IN', title: bill.customerName || 'Customer', reference: `#${bill.invoiceNo}`, amount: amt, paymentMode: (bill.paymentMode || 'Cash').toLowerCase(), activity: 'Sale'
      });
    });
    validExpenses.forEach(exp => {
      const amt = parseFloat(exp.amount || 0);
      if (amt > 0) Object.assign(txs[txs.length] = {
        id: `e-${exp.id}`, date: exp.date, type: 'OUT', title: exp.name || 'Expense', reference: exp.category || '', amount: amt, paymentMode: (exp.payment_mode || exp.paymentMode || 'Cash').toLowerCase(), activity: exp.category || 'Expense'
      });
    });
    validLedger.filter(e => !e.is_void && !e.invoice_id).forEach(entry => {
      if (entry.type === 'SALE' || entry.type === 'PURCHASE') return;
      const amt = parseFloat(entry.amount || 0);
      if (amt <= 0 || !entry.date) return;
      
      let pMode = entry.paymentMode ? entry.paymentMode.toLowerCase() : 'cash';
      const match = (entry.description || '').match(/^\[(.*?)\]/);
      if (match) pMode = match[1].toLowerCase().trim();
      
      let title = entry.party_name;
      if (!title || title === 'Unknown') {
          const p = [...customers, ...suppliers].find(x => String(x.id) === String(entry.party_id || entry.customer_id || entry.supplier_id));
          if (p) title = p.name || p.businessName;
      }
      const type = (entry.type === 'PAYMENT' || entry.type === 'PAYMENT_IN' || entry.type === 'ROLLOVER') ? 'IN' : 'OUT';
      Object.assign(txs[txs.length] = { id: `l-${entry.id}`, date: entry.date, type, title: title || 'Unknown', reference: entry.description || '', amount: amt, paymentMode: pMode, activity: type === 'IN' ? 'Payment In' : 'Payment Out' });
    });
    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [validBills, validExpenses, validLedger, customers, suppliers]);

  const { transactions, balances, totalCollected, totalExpenses, netCashFlow } = useMemo(() => {
    let bal = { cash: 0, bank: 0, upi: 0 };
    let collectedStr = 0, expStr = 0;
    
    allTransactions.forEach(t => {
      const amt = t.type === 'IN' ? t.amount : -t.amount;
      if (t.paymentMode === 'upi') bal.upi += amt;
      else if (['bank', 'online', 'transfer'].includes(t.paymentMode)) bal.bank += amt;
      else bal.cash += amt;
      
      if (t.type === 'IN') collectedStr += t.amount;
      else expStr += t.amount;
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);

    let txs = allTransactions.filter(t => {
      if (dateFilter === 'TODAY' && !(t.date && t.date.startsWith(todayStr))) return false;
      if (dateFilter === 'YESTERDAY' && !(t.date && t.date.startsWith(yesterdayStr))) return false;
      if (dateFilter === 'MONTH' && !(t.date && t.date.startsWith(thisMonthStr))) return false;
      
      if (modeFilter !== 'ALL') {
        const smode = t.paymentMode.toLowerCase();
        if (modeFilter === 'CASH' && smode !== 'cash') return false;
        if (modeFilter === 'UPI' && smode !== 'upi') return false;
        if (modeFilter === 'BANK' && !['bank', 'online', 'transfer'].includes(smode)) return false;
      }
      return true;
    });
    return { transactions: txs, balances: bal, totalCollected: collectedStr, totalExpenses: expStr, netCashFlow: collectedStr - expStr };
  }, [allTransactions, dateFilter, modeFilter]);

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

{/* Date & Mode Filters */}
      <div className="flex flex-col md:flex-row gap-3">
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

        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto overflow-x-auto custom-scrollbar">
            {[
              { id: 'ALL', label: 'All Modes' },
              { id: 'CASH', label: 'Cash' },
              { id: 'BANK', label: 'Bank' },
              { id: 'UPI', label: 'UPI' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setModeFilter(f.id)}
                className={`flex-1 min-w-[80px] py-2 px-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center ${modeFilter === f.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
              <Banknote size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Cash in Hand</p>
            <h3 className={`text-2xl font-black ${balances.cash >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
              ₹{Math.abs(balances.cash).toFixed(2)} {balances.cash < 0 && '(Negative)'}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
              <Building2 size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Bank Balance</p>
            <h3 className={`text-2xl font-black ${balances.bank >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
              ₹{Math.abs(balances.bank).toFixed(2)} {balances.bank < 0 && '(Negative)'}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
              <Smartphone size={24} />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">UPI Collections</p>
            <h3 className={`text-2xl font-black ${balances.upi >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}>
              ₹{Math.abs(balances.upi).toFixed(2)} {balances.upi < 0 && '(Negative)'}
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
                                <p className="text-xs text-slate-500 capitalize">{tx.activity} • {tx.paymentMode} • {new Date(tx.date).toLocaleDateString()}</p>
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
