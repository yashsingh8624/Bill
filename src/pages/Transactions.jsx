import React, { useState, useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { useCustomers } from '../context/PartiesContext';
import { useExpenses } from '../context/ExpenseContext';
import { Search, X, FileText, ArrowDownLeft, ArrowUpRight, Filter } from 'lucide-react';

const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function Transactions() {
  const { bills = [], ledger = [] } = useBills() || {};
  const { customers = [] } = useCustomers() || {};
  const { expenses = [] } = useExpenses() || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | sale | payment_in | payment_out | expense

  // Build unified transaction list
  const transactions = useMemo(() => {
    const txns = [];

    // From ledger - sales and payments
    ledger.filter(e => !e.is_void).forEach(entry => {
      const customer = customers.find(c => c.id === entry.customer_id);
      
      let displayType = entry.type;
      if (entry.type === 'SALE') displayType = 'Sale';
      else if (entry.type === 'PAYMENT' || entry.type === 'ROLLOVER') displayType = 'Payment In';
      else if (entry.type === 'PAYMENT_MADE') displayType = 'Payment Out';
      else if (entry.type === 'PURCHASE') displayType = 'Purchase';
      else displayType = entry.type;
      
      txns.push({
        id: entry.id,
        date: entry.date,
        dateFormatted: new Date(entry.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        partyName: customer?.name || entry.supplier_id || '—',
        type: displayType,
        typeRaw: entry.type,
        amount: parseFloat(entry.amount || 0),
        description: entry.description || entry.desc || '',
        invoiceId: entry.invoice_id || '',
      });
    });

    // From expenses
    expenses.forEach(exp => {
      txns.push({
        id: exp.id,
        date: exp.date,
        dateFormatted: new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        partyName: exp.name || 'Expense',
        type: 'Expense',
        typeRaw: 'EXPENSE',
        amount: parseFloat(exp.amount || 0),
        description: exp.category || '',
        invoiceId: '',
      });
    });

    // Sort by date descending
    txns.sort((a, b) => new Date(b.date) - new Date(a.date));
    return txns;
  }, [ledger, customers, expenses]);

  // Filter
  const filtered = useMemo(() => {
    let result = transactions;
    if (filterType !== 'all') {
      const typeMap = {
        sale: ['SALE', 'PURCHASE'],
        payment_in: ['PAYMENT', 'ROLLOVER'],
        payment_out: ['PAYMENT_MADE'],
        expense: ['EXPENSE'],
      };
      result = result.filter(t => typeMap[filterType]?.includes(t.typeRaw));
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.partyName.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.invoiceId.toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, filterType, searchTerm]);

  // Totals
  const totals = useMemo(() => {
    const sales = filtered.filter(t => t.typeRaw === 'SALE').reduce((s, t) => s + t.amount, 0);
    const paymentsIn = filtered.filter(t => ['PAYMENT', 'ROLLOVER'].includes(t.typeRaw)).reduce((s, t) => s + t.amount, 0);
    const paymentsOut = filtered.filter(t => ['PAYMENT_MADE'].includes(t.typeRaw)).reduce((s, t) => s + t.amount, 0);
    const expenseTotal = filtered.filter(t => t.typeRaw === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { sales, paymentsIn, paymentsOut, expenses: expenseTotal };
  }, [filtered]);

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 animate-in fade-in flex flex-col min-w-0">
      {/* Header */}
      <div className="flex flex-col flex-shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
            Transactions
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">History of all your business transactions</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar flex-shrink-0">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex flex-col whitespace-nowrap">
          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Total Sales</span>
          <span className="font-black text-indigo-700">{fmt(totals.sales)}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex flex-col whitespace-nowrap">
          <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Received</span>
          <span className="font-black text-emerald-700">{fmt(totals.paymentsIn)}</span>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex flex-col whitespace-nowrap">
          <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Paid Out</span>
          <span className="font-black text-rose-700">{fmt(totals.paymentsOut)}</span>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex flex-col whitespace-nowrap">
          <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Expenses</span>
          <span className="font-black text-amber-700">{fmt(totals.expenses)}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar flex-shrink-0 text-sm">
        {[
          { key: 'all', label: 'All Txns' },
          { key: 'sale', label: 'Sales' },
          { key: 'payment_in', label: 'Payment In' },
          { key: 'payment_out', label: 'Payment Out' },
          { key: 'expense', label: 'Expenses' },
        ].map(f => (
          <button
            key={f.key}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all ${filterType === f.key ? 'bg-slate-800 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            onClick={() => setFilterType(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-wrapper bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-600 flex items-center gap-3 px-4 flex-shrink-0 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
        <Search size={20} className="search-icon text-slate-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by party, details..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input flex-1 py-1.5 focus:outline-none text-slate-700 dark:text-slate-100 placeholder:text-slate-400 font-medium bg-transparent pl-0"
        />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1"><X size={18} /></button>}
      </div>

      {/* Transaction Cards */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
        {filtered.length === 0 ? (
           <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-slate-100 p-4 rounded-full mb-4 text-slate-300">
                 <Filter size={32} />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 transition-colors duration-300 text-lg">No transactions found</p>
           </div>
        ) : (
          <div className="space-y-3">
             {filtered.map(txn => {
                const isIncoming = ['Sale', 'Payment In'].includes(txn.type);
                const isOutgoing = ['Payment Out', 'Expense', 'Purchase'].includes(txn.type);
                
                let icon;
                if (txn.type === 'Sale' || txn.type === 'Purchase') icon = <FileText size={18} />;
                else if (txn.type === 'Payment In') icon = <ArrowDownLeft size={18} strokeWidth={3} />;
                else if (txn.type === 'Payment Out' || txn.type === 'Expense') icon = <ArrowUpRight size={18} strokeWidth={3} />;

                 let colorClass = 'text-slate-500 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600';
                if (txn.type === 'Sale') colorClass = 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-900 dark:text-indigo-400';
                else if (txn.type === 'Payment In') colorClass = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900 dark:text-emerald-400';
                else if (txn.type === 'Payment Out') colorClass = 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-900 dark:text-rose-400';
                else if (txn.type === 'Expense') colorClass = 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900 dark:text-amber-400';

                return (
                  <div key={txn.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group">
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border ${colorClass}`}>
                           {icon}
                        </div>
                        <div>
                           <p className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight">{txn.partyName}</p>
                           <p className="text-xs text-slate-500 font-medium mt-0.5">{txn.dateFormatted}</p>
                           {txn.description && <p className="text-[11px] text-slate-400 mt-1 max-w-full max-w-sm truncate">{txn.description}</p>}
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end">
                        <p className={`font-black text-[16px] ${isIncoming ? 'text-emerald-600 dark:text-emerald-400' : isOutgoing ? 'text-slate-800 dark:text-slate-100' : 'text-slate-800 dark:text-slate-100'}`}>
                           {isIncoming ? '+' : '-'}{fmt(txn.amount)}
                        </p>
                        <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded mt-1 border ${colorClass}`}>
                           {txn.type}
                        </span>
                     </div>
                  </div>
                );
             })}
          </div>
        )}
      </div>
    </div>
  );
}
