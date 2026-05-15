import React, { useMemo, useState } from 'react';
import { useBills } from '../context/BillContext';
import { useExpenses } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';
import { useParties } from '../context/PartiesContext';
import { Landmark, Wallet, Smartphone, Building2, RefreshCcw } from 'lucide-react';

export default function CashBank() {
  const { isReady, useFirebase } = useAuth();
  const billsRes = useBills() || {};
  const bills = Array.isArray(billsRes.bills) ? billsRes.bills : [];
  const ledger = Array.isArray(billsRes.ledger) ? billsRes.ledger : [];
  
  const expensesRes = useExpenses() || {};
  const expenses = Array.isArray(expensesRes.expenses) ? expensesRes.expenses : [];
  
  const partiesRes = useParties() || {};
  const customers = Array.isArray(partiesRes.customers) ? partiesRes.customers : [];
  const suppliers = Array.isArray(partiesRes.suppliers) ? partiesRes.suppliers : [];

  const [filterMode, setFilterMode] = useState('All');

  const allTransactions = useMemo(() => {
    let txs = [];

    // 1. BILLS (Sales)
    bills.forEach(b => {
      if (b.isDeleted || !(b.amountPaid > 0)) return;
      const mode = String(b.paymentMode || 'Cash');
      let normMode = 'Cash';
      if (mode.toLowerCase().includes('upi')) normMode = 'UPI';
      if (mode.toLowerCase().includes('bank')) normMode = 'Bank';
      if (mode.toLowerCase().includes('cash')) normMode = 'Cash';

      txs.push({
        id: b.id || b.invoiceNo,
        date: b.date,
        partyName: b.customerName || 'Walk-in Customer',
        amount: parseFloat(b.amountPaid || 0),
        type: 'Sale',
        mode: normMode,
        raw: b
      });
    });

    // 2. EXPENSES (Outflow)
    expenses.forEach(e => {
      const mode = String(e.payment_mode || 'Cash');
      let normMode = 'Cash';
      if (mode.toLowerCase().includes('upi') || mode.toLowerCase().includes('online')) normMode = 'UPI';
      if (mode.toLowerCase().includes('bank') || mode.toLowerCase().includes('card')) normMode = 'Bank';
      if (mode.toLowerCase().includes('cash')) normMode = 'Cash';

      txs.push({
        id: e.id || Math.random().toString(),
        date: e.date,
        partyName: e.category || 'Expense',
        amount: -Math.abs(parseFloat(e.amount || 0)),
        type: 'Expense',
        mode: normMode,
        raw: e
      });
    });

    // 3. LEDGER PAYMENTS (Inflow & Outflow)
    ledger.forEach(l => {
      const isPaymentIn = l.type === 'PAYMENT' || l.type === 'Payment In';
      const isPaymentOut = l.type === 'PAYMENT_MADE' || l.type === 'PAYMENT_OUT' || l.type === 'Payment Out';
      if (!isPaymentIn && !isPaymentOut) return;

      const desc = String(l.description || '');
      
      // Prevent double counting of direct bill payments (these are already counted in the BILLS section)
      if (desc.toLowerCase().includes('paid for bill')) return;

      let normMode = 'Cash';
      if (desc.toLowerCase().includes('[upi]')) normMode = 'UPI';
      else if (desc.toLowerCase().includes('[bank]')) normMode = 'Bank';
      else if (desc.toLowerCase().includes('[cash]')) normMode = 'Cash';
      else if (desc.toLowerCase().includes('upi')) normMode = 'UPI';
      else if (desc.toLowerCase().includes('bank')) normMode = 'Bank';

      const partyId = l.party_id || l.customer_id || l.supplier_id;
      let pName = 'Unknown Party';
      if (partyId) {
        let p = customers.find(c => String(c.id) === String(partyId));
        if (!p) p = suppliers.find(s => String(s.id) === String(partyId));
        if (p) pName = p.name || p.businessName || pName;
      }

      txs.push({
        id: l.id || Math.random().toString(),
        date: l.date,
        partyName: pName,
        amount: isPaymentIn ? Math.abs(parseFloat(l.amount || 0)) : -Math.abs(parseFloat(l.amount || 0)),
        type: isPaymentIn ? 'Payment In' : 'Payment Out',
        mode: normMode,
        raw: l
      });
    });

    return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [bills, expenses, ledger, customers, suppliers]);

  const filteredTransactions = useMemo(() => {
    if (filterMode === 'All') return allTransactions;
    return allTransactions.filter(tx => tx.mode === filterMode);
  }, [allTransactions, filterMode]);

  const cashBalance = allTransactions.filter(tx => tx.mode === 'Cash').reduce((sum, tx) => sum + tx.amount, 0);
  const upiBalance = allTransactions.filter(tx => tx.mode === 'UPI').reduce((sum, tx) => sum + tx.amount, 0);
  const bankBalance = allTransactions.filter(tx => tx.mode === 'Bank').reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6 flex flex-col w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 page-animate min-w-0" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Cash & Bank</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">Track your liquidity and accounts.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet size={48} />
           </div>
           <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-3">
             <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/20 rounded-lg">
               <Wallet size={18} />
             </div>
             Cash in Hand
           </div>
           <h3 className={`text-3xl font-black relative z-10 tracking-tighter ${cashBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-500'}`}>
             ₹{cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </h3>
           <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest relative z-10">Total Cash Balance</p>
        </div>

        {/* Bank */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Building2 size={48} />
           </div>
           <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm mb-3 relative z-10">
             <div className="p-1.5 bg-blue-50 dark:bg-blue-500/20 rounded-lg">
               <Building2 size={18} />
             </div>
             Bank Balance
           </div>
           <h3 className={`text-3xl font-black relative z-10 tracking-tighter ${bankBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-500'}`}>
             ₹{bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </h3>
           <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest relative z-10">Total Bank Balance</p>
        </div>

        {/* UPI */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <Smartphone size={48} />
           </div>
           <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-3 relative z-10">
             <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/20 rounded-lg">
               <Smartphone size={18} />
             </div>
             UPI Collections
           </div>
           <h3 className={`text-3xl font-black relative z-10 tracking-tighter ${upiBalance >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-500'}`}>
             ₹{upiBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </h3>
           <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest relative z-10">Total UPI Collections</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
         {['All', 'Cash', 'Bank', 'UPI'].map(mode => (
           <button
             key={mode}
             onClick={() => setFilterMode(mode)}
             className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all ${
               filterMode === mode 
                 ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' 
                 : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
             }`}
           >
             {mode}
           </button>
         ))}
      </div>

      {/* Transaction List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
           <h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {filteredTransactions.length === 0 ? (
             <div className="p-10 text-center flex flex-col items-center">
                <RefreshCcw className="text-slate-300 dark:text-slate-600 mb-3" size={32} />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No transactions found.</p>
             </div>
          ) : (
            filteredTransactions.map(tx => (
              <div key={tx.id} className="p-4 sm:px-5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex flex-col justify-between gap-2">
                <div className="flex justify-between items-start mb-1">
                   <p className="font-bold text-base text-slate-800 dark:text-slate-100 truncate pr-4">{tx.partyName}</p>
                   <p className={`font-black whitespace-nowrap text-right ${tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                   </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                   <span className={`px-2 py-0.5 rounded-md ${
                      tx.amount > 0 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                   }`}>
                      {tx.type}
                   </span>
                   <span>•</span>
                   <span className="flex items-center gap-1">
                     {tx.mode === 'Cash' && <Wallet size={12} />}
                     {tx.mode === 'UPI' && <Smartphone size={12} />}
                     {tx.mode === 'Bank' && <Building2 size={12} />}
                     {tx.mode}
                   </span>
                   <span>•</span>
                   <span>{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}