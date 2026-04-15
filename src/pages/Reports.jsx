import React, { useState, useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { useCustomers } from '../context/PartiesContext';
import { useSettings } from '../context/SettingsContext';
import { useInventory } from '../context/InventoryContext';
import { useExpenses } from '../context/ExpenseContext';
import { FileSpreadsheet, TrendingUp, AlertCircle, ShoppingBag, Search, Filter, Calendar, ChevronRight, FileText, Wallet, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { bills } = useBills();
  const { customers } = useCustomers();
  const { userSettings } = useSettings();
  const { products } = useInventory();
  const { expenses } = useExpenses();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('MONTH'); // TODAY, YESTERDAY, MONTH, YEAR, ALL, CUSTOM
  const [customRange, setCustomRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [showExcelView, setShowExcelView] = useState(false);

  const filteredBills = useMemo(() => {
    let filtered = bills.filter(b => !b.isDeleted);
    
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);

    if (timeFilter === 'TODAY') {
      filtered = filtered.filter(b => b.date && b.date.startsWith(todayStr));
    } else if (timeFilter === 'YESTERDAY') {
      filtered = filtered.filter(b => b.date && b.date.startsWith(yesterdayStr));
    } else if (timeFilter === 'MONTH') {
      filtered = filtered.filter(b => b.date && b.date.startsWith(thisMonthStr));
    } else if (timeFilter === 'YEAR') {
      filtered = filtered.filter(b => b.date && b.date.startsWith(thisYearStr));
    } else if (timeFilter === 'CUSTOM' && customRange.start && customRange.end) {
      filtered = filtered.filter(b => {
        const d = b.date?.split('T')[0];
        return d >= customRange.start && d <= customRange.end;
      });
    }
    
    return filtered;
  }, [bills, searchTerm, timeFilter, customRange]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);

    if (timeFilter === 'TODAY') {
      return filtered.filter(e => e.date === todayStr);
    } else if (timeFilter === 'YESTERDAY') {
      return filtered.filter(e => e.date === yesterdayStr);
    } else if (timeFilter === 'MONTH') {
      return filtered.filter(e => e.date?.startsWith(thisMonthStr));
    } else if (timeFilter === 'YEAR') {
      return filtered.filter(e => e.date?.startsWith(thisYearStr));
    } else if (timeFilter === 'CUSTOM' && customRange.start && customRange.end) {
      return filtered.filter(e => e.date >= customRange.start && e.date <= customRange.end);
    }
    return filtered;
  }, [expenses, timeFilter, customRange]);

  const stats = useMemo(() => {
    const s = filteredBills.reduce((acc, b) => {
      const billSaleAmount = Array.isArray(b.items) && b.items.length > 0
        ? b.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
        : (parseFloat(b.subTotal) || 0) + (parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0);
      acc.totalSales += billSaleAmount;
      acc.totalPaid += (b.amountPaid || 0);
      acc.totalOutstanding += (b.outstanding || 0);
      acc.totalBills += 1;
      
      (b.items || []).forEach(item => {
        const product = products.find(p => p.name === item.name);
        if (product && product.purchasePrice) {
          const cost = product.purchasePrice * item.quantity;
          const revenue = (item.rate || 0) * item.quantity;
          acc.totalGP += (revenue - cost);
        }
      });

      return acc;
    }, { totalSales: 0, totalPaid: 0, totalOutstanding: 0, totalBills: 0, totalGP: 0 });

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = s.totalGP - totalExpenses;

    return {
      ...s,
      totalExpenses,
      netProfit
    };
  }, [filteredBills, products, filteredExpenses]);

  const handleExportSalesExcel = () => {
    const data = filteredBills.map(b => ({
      'Invoice No': b.invoiceNo,
      'Date': b.readableDate || new Date(b.date).toLocaleDateString(),
      'Customer': b.customerName,
      'Gross Amount': (b.subTotal || 0).toFixed(2),
      'Discount': (b.totalDiscount || 0).toFixed(2),
      'GST': (b.gstAmount || ((parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0))).toFixed(2),
      'Bill Total': (Array.isArray(b.items) && b.items.length > 0 
        ? b.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) 
        : ((parseFloat(b.subTotal) || 0) + (parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0))).toFixed(2),
      'Paid': (b.amountPaid || 0).toFixed(2),
      'Outstanding': (b.outstanding || 0).toFixed(2),
      'Mode': b.paymentMode
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `Sales_Report_${timeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 min-w-0 page-animate">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Business Reports</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic">Detailed financial insights for your shop.</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={() => setShowExcelView(!showExcelView)}
             disabled={filteredBills.length === 0}
             className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-400 px-4 py-2.5 rounded-xl transition-all font-bold flex items-center gap-2 shadow-sm text-sm disabled:opacity-50"
           >
             <Eye size={16} /> {showExcelView ? 'Hide Excel View' : 'View Excel Data'}
           </button>
           <button 
             onClick={handleExportSalesExcel}
             disabled={filteredBills.length === 0}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 text-sm"
           >
             <FileSpreadsheet size={16} /> Download Excel
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="md:col-span-2 bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 flex items-center gap-3 px-4">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by customer or invoice..." 
              className="flex-1 py-1 focus:outline-none bg-transparent text-slate-700 dark:text-slate-100 placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="md:col-span-2 flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-600">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'MONTH', label: 'Month' },
              { id: 'YEAR', label: 'Year' },
              { id: 'CUSTOM', label: 'Custom' },
              { id: 'ALL', label: 'All' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                className={`flex-1 py-1.5 px-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest min-w-0 break-words ${timeFilter === f.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
         </div>
      </div>

      {timeFilter === 'CUSTOM' && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-600 shadow-sm flex flex-wrap items-center gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">From:</span>
            <input 
              type="date" 
              value={customRange.start}
              onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">To:</span>
            <input 
              type="date" 
              value={customRange.end}
              onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 relative z-10">
             <ShoppingBag size={12} className="text-indigo-500 dark:text-indigo-400" /> Total Sales
           </p>
           <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 relative z-10">₹{stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <p className="text-slate-400 text-xs mt-4 font-bold tracking-tight relative z-10">{stats.totalBills} Bills generated</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 relative z-10">
             <TrendingUp size={12} /> Net Profit
           </p>
           <h3 className={`text-3xl font-black relative z-10 ${stats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
             ₹{stats.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
           </h3>
           <p className="text-slate-400 text-xs mt-4 font-bold flex flex-col gap-0.5 relative z-10">
             <span className="flex justify-between">GP Margin: <span>₹{stats.totalGP.toFixed(2)}</span></span>
             <span className="flex justify-between text-red-500 dark:text-red-400">Expenses: <span>- ₹{stats.totalExpenses.toFixed(2)}</span></span>
           </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 relative z-10">
             <AlertCircle size={12} className="text-blue-500 dark:text-blue-400" /> Total Collected
           </p>
           <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 relative z-10">₹{stats.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <p className="text-slate-400 text-xs mt-4 font-bold relative z-10">Successfully received</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 dark:bg-red-900/10 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 relative z-10">
             <AlertCircle size={12} /> Market Credit
           </p>
           <h3 className={`text-3xl font-black relative z-10 ${stats.totalOutstanding > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
             ₹{stats.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
           </h3>
           <p className="text-red-400 text-xs mt-4 font-bold relative z-10">Pending accounts recovery</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-600 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center px-8">
           <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs flex items-center gap-2">
             <FileText size={16} className="text-indigo-600 dark:text-indigo-400" /> Transactional Ledger
           </h3>
           <span className="text-[10px] font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400 tracking-wider">
             {filteredBills.length} Records found
           </span>
        </div>
         <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
           {filteredBills.length === 0 ? (
             <div className="p-24 text-center text-slate-400">
               <div className="bg-slate-50 dark:bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700 shadow-inner group transition-all">
                 <Search size={32} className="text-slate-300 group-hover:scale-110 transition-transform" />
               </div>
               <p className="font-black text-xl text-slate-700 dark:text-slate-300 mb-1">No sales data found</p>
               <p className="text-sm font-medium">Try broadening your search or switching filters.</p>
             </div>
           ) : showExcelView ? (
             <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
               <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10 border-b border-slate-200 dark:border-slate-700">
                 <tr className="text-slate-600 dark:text-slate-400 font-bold">
                   <th className="py-3 px-4">Invoice No</th>
                   <th className="py-3 px-4">Date</th>
                   <th className="py-3 px-4">Customer</th>
                   <th className="py-3 px-4">Gross Amt</th>
                   <th className="py-3 px-4">Discount</th>
                   <th className="py-3 px-4">GST</th>
                   <th className="py-3 px-4">Bill Total</th>
                   <th className="py-3 px-4">Paid</th>
                   <th className="py-3 px-4">Outstanding</th>
                   <th className="py-3 px-4">Mode</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                 {filteredBills.map((b, idx) => (
                   <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium tracking-tight">
                     <td className="py-2 px-4">{b.invoiceNo}</td>
                     <td className="py-2 px-4">{b.readableDate || new Date(b.date).toLocaleDateString()}</td>
                     <td className="py-2 px-4">{b.customerName}</td>
                     <td className="py-2 px-4">₹{(b.subTotal || 0).toFixed(2)}</td>
                     <td className="py-2 px-4">₹{(b.totalDiscount || 0).toFixed(2)}</td>
                     <td className="py-2 px-4">₹{(b.gstAmount || ((parseFloat(b.cgst)||0) + (parseFloat(b.sgst)||0))).toFixed(2)}</td>
                     <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-100">₹{(Array.isArray(b.items) && b.items.length > 0 ? b.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) : ((parseFloat(b.subTotal) || 0) + (parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0))).toFixed(2)}</td>
                     <td className="py-2 px-4 text-emerald-600 dark:text-emerald-400">₹{(b.amountPaid || 0).toFixed(2)}</td>
                     <td className="py-2 px-4 text-red-500 dark:text-red-400">₹{(b.outstanding || 0).toFixed(2)}</td>
                     <td className="py-2 px-4">{b.paymentMode}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           ) : (
             <table className="w-full text-left border-collapse">
               <thead className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md z-10 border-b border-slate-100 dark:border-slate-700 shadow-sm">
                 <tr className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-widest">
                   <th className="py-5 px-8">Invoice Info</th>
                   <th className="py-5 px-6">Customer Name</th>
                   <th className="py-5 px-6 text-right">Collection</th>
                   <th className="py-5 px-8 text-right">Invoice Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                 {filteredBills.map((bill, idx) => (
                   <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group">
                      <td className="py-5 px-8">
                         <div className="flex items-center gap-4">
                            <div className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 p-2.5 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                               <FileText size={18} />
                            </div>
                            <div>
                               <p className="font-black text-slate-800 dark:text-slate-100 text-sm">#{bill.invoiceNo}</p>
                               <p className="text-[10px] text-slate-400 font-bold tracking-wider">{bill.readableDate || new Date(bill.date).toLocaleDateString()}</p>
                            </div>
                         </div>
                      </td>
                      <td className="py-5 px-6">
                         <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{bill.customerName}</p>
                         <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-tighter">{bill.paymentMode} Payment</p>
                      </td>
                      <td className="py-5 px-6 text-right">
                         <p className="font-black text-slate-800 dark:text-slate-100 text-sm">₹{bill.amountPaid.toFixed(2)}</p>
                         <p className={`text-[10px] font-black uppercase tracking-tighter ${bill.outstanding > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                            {bill.outstanding > 0 ? `- ₹${bill.outstanding.toFixed(2)} Pending` : 'Fully Paid'}
                         </p>
                      </td>
                      <td className="py-5 px-8 text-right">
                         <p className="font-black text-slate-900 dark:text-slate-100 text-lg tracking-tight">₹{(bill.grandTotal || bill.total || 0).toFixed(2)}</p>
                         <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={14} className="text-indigo-400 dark:text-indigo-500 translate-x-1" />
                         </div>
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
