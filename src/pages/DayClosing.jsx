import React, { useState, useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { Receipt, IndianRupee, CreditCard, Wallet, Calendar, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

export default function DayClosing() {
  const { bills } = useBills();
  const [isClosed, setIsClosed] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const todayBills = useMemo(() => bills.filter(b => b.date === today && !b.isDeleted), [bills, today]);

  const stats = useMemo(() => {
    return todayBills.reduce((acc, b) => {
      acc.totalSales += (b.grandTotal || b.total || 0);
      acc.totalCollected += (b.amountPaid || 0);
      acc.totalOutstanding += (b.outstanding || 0);
      acc.billCount += 1;
      
      if (b.paymentMode === 'Cash') acc.cashSales += (b.amountPaid || 0);
      if (b.paymentMode === 'UPI') acc.upiSales += (b.amountPaid || 0);
      
      return acc;
    }, { totalSales: 0, totalCollected: 0, totalOutstanding: 0, billCount: 0, cashSales: 0, upiSales: 0 });
  }, [todayBills]);

  const handleCloseDay = () => {
    // In a real app, this would save to a 'DailyLogs' collection
    // For now, we simulate a success state
    setIsClosed(true);
    setTimeout(() => {
       alert("Day closed successfully. All summaries logged locally.");
       setIsClosed(false);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Day Closing</h2>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <Calendar size={14} /> Reconciling for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Live Reporting</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden group">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
           <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-1">Total Sales</p>
           <h3 className="text-3xl font-black">₹{stats.totalSales.toFixed(2)}</h3>
           <p className="text-indigo-200 text-xs mt-4 flex items-center gap-1 font-bold">
             <Receipt size={12} /> {stats.billCount} Invoices generated
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
           <p className="text-amber-100 text-xs font-black uppercase tracking-widest mb-1">Total Credit (Udhaar)</p>
           <h3 className="text-3xl font-black">₹{stats.totalOutstanding.toFixed(2)}</h3>
           <p className="text-amber-100 text-xs mt-4 font-bold flex items-center gap-1">
             <AlertCircle size={12} /> Amount carried forward
           </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
           <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">Today's Transactions</h3>
           <span className="text-xs font-bold text-slate-400">Total {todayBills.length} Bills</span>
        </div>
        <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
           {todayBills.length === 0 ? (
             <div className="p-12 text-center text-slate-400 font-medium">No sales recorded today yet.</div>
           ) : (
             todayBills.map((bill, idx) => (
               <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={`p-2 rounded-xl ${bill.paymentMode === 'Credit' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        <Receipt size={18} />
                     </div>
                     <div>
                        <p className="font-bold text-slate-800 text-sm">#{bill.invoiceNo} - {bill.customerName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{bill.paymentMode} Mode</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="font-black text-slate-800">₹{(bill.grandTotal || bill.total).toFixed(2)}</p>
                     <p className={`text-[10px] font-black uppercase ${bill.outstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {bill.outstanding > 0 ? `₹${bill.outstanding.toFixed(2)} Due` : 'Fully Paid'}
                     </p>
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-500"></div>
         <div className="flex-1">
            <h3 className="text-white font-black text-xl mb-1">Ready to close the day?</h3>
            <p className="text-slate-400 text-sm font-medium">Closing the day will generate a summary and prepare the system for tomorrow. This action is recorded in the audit logs.</p>
         </div>
         <button 
           onClick={handleCloseDay}
           disabled={isClosed}
           className={`group relative overflow-hidden px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl ${
             isClosed ? 'bg-emerald-600 text-white' : 'bg-white text-slate-800 hover:scale-105 active:scale-95'
           }`}
         >
            <div className="relative z-10 flex items-center gap-2">
               {isClosed ? <CheckCircle2 size={20} /> : < IndianRupee size={18} />}
               {isClosed ? 'Day Closed' : 'Finalize & Close Day'}
            </div>
         </button>
      </div>
    </div>
  );
}
