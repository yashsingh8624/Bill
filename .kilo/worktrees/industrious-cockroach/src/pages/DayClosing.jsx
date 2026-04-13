import React, { useState, useMemo, useEffect } from 'react';
import { useBills } from '../context/BillContext';
import { safeGet, safeSet } from '../utils/storage';
import {
  Receipt, IndianRupee, CreditCard, Wallet, Calendar,
  CheckCircle2, TrendingUp, AlertCircle, History, X, Lock
} from 'lucide-react';

export default function DayClosing() {
  const { bills } = useBills();
  const today = new Date().toISOString().split('T')[0];

  // Check if today is already closed
  const [dailyReports, setDailyReports] = useState(() => safeGet('smartbill_daily_reports', []));
  const todayReport = dailyReports.find(r => r.date === today);
  const [isClosed, setIsClosed] = useState(!!todayReport);

  // Confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);
  // History panel
  const [showHistory, setShowHistory] = useState(false);

  const todayBills = useMemo(
    () => bills.filter(b => b && b.date && b.date.startsWith(today) && !b.isDeleted),
    [bills, today]
  );

  const stats = useMemo(() => {
    return todayBills.reduce((acc, b) => {
      const billTotal = Array.isArray(b.items) && b.items.length > 0
        ? b.items.reduce((s, i) => s + (parseFloat(i?.amount) || 0), 0)
        : (parseFloat(b.subTotal) || 0) + (parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0);

      acc.totalSales    += billTotal;
      acc.totalCollected += parseFloat(b.amountPaid || b.paidAmount || 0);
      acc.totalOutstanding += parseFloat(b.outstanding || b.finalOutstanding || 0);
      acc.billCount     += 1;
      if (b.paymentMode === 'Cash') acc.cashSales  += parseFloat(b.amountPaid || 0);
      if (b.paymentMode === 'UPI')  acc.upiSales   += parseFloat(b.amountPaid || 0);
      return acc;
    }, { totalSales: 0, totalCollected: 0, totalOutstanding: 0, billCount: 0, cashSales: 0, upiSales: 0 });
  }, [todayBills]);

  const handleCloseDay = () => {
    const report = {
      date: today,
      closedAt: new Date().toISOString(),
      totalSales: stats.totalSales,
      totalCollected: stats.totalCollected,
      totalOutstanding: stats.totalOutstanding,
      billCount: stats.billCount,
      cashSales: stats.cashSales,
      upiSales: stats.upiSales,
    };
    const existing = safeGet('smartbill_daily_reports', []);
    const updated = [report, ...existing.filter(r => r.date !== today)];
    safeSet('smartbill_daily_reports', updated);
    setDailyReports(updated);
    setIsClosed(true);
    setShowConfirm(false);
  };

  const pastReports = dailyReports.filter(r => r.date !== today || isClosed);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Day Closing</h2>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <Calendar size={14} />
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isClosed && (
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Lock size={12} /> Day Closed
            </span>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <History size={14} /> View History
          </button>
          {!isClosed && (
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-black text-slate-800 flex items-center gap-2"><History size={16} /> Closed Day Reports</h3>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
            {pastReports.length === 0 ? (
              <p className="p-8 text-center text-slate-400 font-medium">No closed day reports yet.</p>
            ) : (
              pastReports.map((r, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{r.billCount} bills · Closed {new Date(r.closedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">₹{parseFloat(r.totalSales || 0).toFixed(2)}</p>
                    <p className="text-xs text-emerald-600 font-bold">Collected: ₹{parseFloat(r.totalCollected || 0).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">Total Sales</p>
          <h3 className="text-3xl font-black">₹{stats.totalSales.toFixed(2)}</h3>
          <p className="text-indigo-200 text-xs mt-4 flex items-center gap-1 font-bold">
            <Receipt size={12} /> {stats.billCount} Invoice{stats.billCount !== 1 ? 's' : ''} today
          </p>
        </div>

        <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-600/20 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-emerald-100 text-xs font-black uppercase tracking-widest mb-1">Total Collected</p>
          <h3 className="text-3xl font-black">₹{stats.totalCollected.toFixed(2)}</h3>
          <p className="text-emerald-200 text-xs mt-4 font-bold flex items-center gap-3">
            <span className="flex items-center gap-1"><Wallet size={12}/> ₹{stats.cashSales.toFixed(0)} Cash</span>
            <span className="flex items-center gap-1"><TrendingUp size={12}/> ₹{stats.upiSales.toFixed(0)} UPI</span>
          </p>
        </div>

        <div className="bg-amber-500 p-6 rounded-3xl shadow-xl shadow-amber-500/20 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-amber-100 text-xs font-black uppercase tracking-widest mb-1">Udhaar (Credit)</p>
          <h3 className="text-3xl font-black">₹{stats.totalOutstanding.toFixed(2)}</h3>
          <p className="text-amber-100 text-xs mt-4 font-bold flex items-center gap-1">
            <AlertCircle size={12} /> Carried forward
          </p>
        </div>
      </div>

      {/* Today's Transactions */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Today's Transactions</h3>
          <span className="text-xs font-bold text-slate-400">{todayBills.length} Bills</span>
        </div>
        <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto">
          {todayBills.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">No sales recorded today yet.</div>
          ) : (
            todayBills.map((bill, idx) => {
              const billTotal = Array.isArray(bill.items) && bill.items.length > 0
                ? bill.items.reduce((s, i) => s + (parseFloat(i?.amount) || 0), 0)
                : (parseFloat(bill.subTotal) || 0) + (parseFloat(bill.cgst) || 0) + (parseFloat(bill.sgst) || 0);
              return (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${bill.paymentMode === 'Credit' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Receipt size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">#{bill.invoiceNo} — {bill.customerName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{bill.paymentMode} Mode</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">₹{billTotal.toFixed(2)}</p>
                    <p className={`text-[10px] font-black uppercase ${parseFloat(bill.outstanding || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {parseFloat(bill.outstanding || 0) > 0 ? `₹${parseFloat(bill.outstanding).toFixed(2)} Due` : 'Fully Paid'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Close Day CTA */}
      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-500"></div>
        <div className="flex-1">
          {isClosed ? (
            <>
              <h3 className="text-white font-black text-xl mb-1 flex items-center gap-2"><CheckCircle2 className="text-emerald-400" size={22}/> Day Successfully Closed</h3>
              <p className="text-slate-400 text-sm font-medium">Today's summary has been saved. Come back tomorrow to start fresh.</p>
            </>
          ) : (
            <>
              <h3 className="text-white font-black text-xl mb-1">Ready to close the day?</h3>
              <p className="text-slate-400 text-sm font-medium">
                This will save today's summary to reports and log the closing time. The action is permanent for today.
              </p>
            </>
          )}
        </div>
        {!isClosed && (
          <button
            onClick={() => setShowConfirm(true)}
            className="group relative overflow-hidden px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl bg-white text-slate-800 hover:scale-105 active:scale-95"
          >
            <div className="relative z-10 flex items-center gap-2">
              <IndianRupee size={18} /> Finalize & Close Day
            </div>
          </button>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 bg-amber-50 flex items-center justify-between">
              <h3 className="text-lg font-black text-amber-900 flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600" /> Confirm Day Close
              </h3>
              <button onClick={() => setShowConfirm(false)} className="text-amber-400 hover:text-amber-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-600 font-medium text-sm leading-relaxed">
                You are about to close <span className="font-black text-slate-800">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>.
                This will save the following summary to your daily reports:
              </p>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Total Bills</span><span className="font-black text-slate-800">{stats.billCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Total Sales</span><span className="font-black text-slate-800">₹{stats.totalSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Total Collected</span><span className="font-black text-emerald-600">₹{stats.totalCollected.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Udhaar (Outstanding)</span><span className="font-black text-amber-600">₹{stats.totalOutstanding.toFixed(2)}</span></div>
              </div>
              <p className="text-xs text-slate-400 font-medium">This action cannot be undone for today's date.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseDay}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={18} /> Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
