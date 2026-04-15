import React, { useState, useMemo, useRef } from 'react';
import { useBills } from '../context/BillContext';
import { useCustomers } from '../context/PartiesContext';
import { useSettings } from '../context/SettingsContext';
import { useInventory } from '../context/InventoryContext';
import { FileSpreadsheet, TrendingUp, AlertCircle, ShoppingBag, Search, Filter, Calendar, ChevronRight, FileText, Send } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { bills } = useBills();
  const { customers } = useCustomers();
  const { userSettings } = useSettings();
  const { products } = useInventory();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('MONTH'); // TODAY, YESTERDAY, MONTH, YEAR, ALL

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
      return filtered.filter(b => b.date && b.date.startsWith(todayStr));
    } else if (timeFilter === 'YESTERDAY') {
      return filtered.filter(b => b.date && b.date.startsWith(yesterdayStr));
    } else if (timeFilter === 'MONTH') {
      return filtered.filter(b => b.date && b.date.startsWith(thisMonthStr));
    } else if (timeFilter === 'YEAR') {
      return filtered.filter(b => b.date && b.date.startsWith(thisYearStr));
    }
    
    return filtered;
  }, [bills, searchTerm, timeFilter]);

  const stats = useMemo(() => {
    return filteredBills.reduce((acc, b) => {
      acc.totalSales += (b.grandTotal || b.total || 0);
      acc.totalPaid += (b.amountPaid || 0);
      acc.totalOutstanding += (b.outstanding || 0);
      acc.totalBills += 1;
      
      // Profit Calculation (using item costPrice if available)
      b.items.forEach(item => {
        const product = products.find(p => p.name === item.name);
        if (product && product.costPrice) {
          const cost = product.costPrice * item.quantity;
          const revenue = (item.rate || 0) * item.quantity;
          acc.totalProfit += (revenue - cost);
        }
      });

      return acc;
    }, { totalSales: 0, totalPaid: 0, totalOutstanding: 0, totalBills: 0, totalProfit: 0 });
  }, [filteredBills, products]);

  const handleExportSalesExcel = () => {
    const data = filteredBills.map(b => ({
      'Invoice No': b.invoiceNo,
      'Date': b.readableDate || new Date(b.date).toLocaleDateString(),
      'Customer': b.customerName,
      'Total Amount': b.grandTotal || b.total || 0,
      'Paid': b.amountPaid,
      'Outstanding': b.outstanding,
      'Mode': b.paymentMode,
      'Month': b.month || (new Date(b.date).getMonth() + 1),
      'Year': b.year || new Date(b.date).getFullYear()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `Sales_Report_${timeFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300 tracking-tight">Business Reports</h2>
          <p className="text-slate-500 dark:text-slate-500 transition-colors duration-300 text-sm mt-1 font-medium italic">"Data is the new oil of the digital economy."</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={handleExportSalesExcel}
             disabled={filteredBills.length === 0}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 text-sm"
           >
             <FileSpreadsheet size={16} /> Export Sales (XLSX)
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="md:col-span-2 bg-white dark:bg-slate-800 transition-colors duration-300 p-2.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 flex items-center gap-3 px-4">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by customer or invoice..." 
              className="bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex-1 py-1 focus:outline-none transition-colors duration-300 placeholder: font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="md:col-span-2 flex bg-slate-100 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'MONTH', label: 'Month' },
              { id: 'YEAR', label: 'Year' },
              { id: 'ALL', label: 'All' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                className={`flex-1 py-1.5 px-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${timeFilter === f.id ? 'bg-white dark:bg-slate-800 transition-colors duration-300 text-indigo-600 shadow-sm' : 'text-slate-500 dark:text-slate-500 transition-colors duration-300 hover:text-slate-700 dark:text-slate-300 transition-colors duration-300'}`}
              >
                {f.label}
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 transition-colors duration-300 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
             <ShoppingBag size={12} className="text-indigo-500" /> Total Sales
           </p>
           <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 transition-colors duration-300">Γé╣{stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <p className="text-slate-400 text-xs mt-4 font-bold tracking-tight">{stats.totalBills} Bills generated</p>
        </div>

        <div className="bg-white dark:bg-slate-800 transition-colors duration-300 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
             <TrendingUp size={12} /> GP (Gross Profit)
           </p>
           <h3 className="text-3xl font-black text-emerald-600">Γé╣{stats.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <p className="text-emerald-600/60 text-xs mt-4 font-bold flex items-center gap-1">
             <TrendingUp size={12} /> Profit potential
           </p>
        </div>

        <div className="bg-white dark:bg-slate-800 transition-colors duration-300 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
             <AlertCircle size={12} className="text-blue-500" /> Total Collected
           </p>
           <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 transition-colors duration-300">Γé╣{stats.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <p className="text-slate-400 text-xs mt-4 font-bold">Successfully received</p>
        </div>

        <div className="bg-white dark:bg-slate-800 transition-colors duration-300 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-10 -mt-10 group-hover:scale-125 transition-transform duration-500"></div>
           <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
             <AlertCircle size={12} /> Market Credit
           </p>
           <h3 className={`text-3xl font-black ${stats.totalOutstanding > 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-100 transition-colors duration-300'}`}>
             Γé╣{stats.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
           </h3>
           <p className="text-red-400 text-xs mt-4 font-bold">Pending accounts recovery</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center px-8">
           <h3 className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 uppercase tracking-widest text-xs flex items-center gap-2">
             <FileText size={16} className="text-indigo-600" /> Transactional Ledger
           </h3>
           <span className="text-[10px] font-black bg-white dark:bg-slate-800 transition-colors duration-300 border border-slate-200 dark:border-slate-700 transition-colors duration-300 px-3 py-1 rounded-full text-slate-400 tracking-wider">
             {filteredBills.length} Records found
           </span>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
           {filteredBills.length === 0 ? (
             <div className="p-24 text-center text-slate-400">
               <div className="bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 shadow-inner group transition-all">
                 <Search size={32} className="text-slate-300 group-hover:scale-110 transition-transform" />
               </div>
               <p className="font-black text-xl text-slate-700 dark:text-slate-300 transition-colors duration-300 mb-1">No sales data found</p>
               <p className="text-sm font-medium">Try broadening your search or switching filters.</p>
             </div>
           ) : (
             <table className="w-full text-left border-collapse">
               <thead className="sticky top-0 bg-white dark:bg-slate-800 transition-colors duration-300/90 backdrop-blur-md z-10 border-b border-slate-100 dark:border-slate-700/50 transition-colors duration-300 shadow-sm">
                 <tr className="text-slate-400 text-[10px] uppercase font-black tracking-widest">
                   <th className="py-5 px-8">Invoice Info</th>
                   <th className="py-5 px-6">Customer Name</th>
                   <th className="py-5 px-6 text-right">Collection</th>
                   <th className="py-5 px-8 text-right">Invoice Amount</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {filteredBills.map((bill, idx) => (
                   <tr key={idx} className="hover:bg-slate-50/80 transition-all duration-300 group">
                      <td className="py-5 px-8">
                         <div className="flex items-center gap-4">
                            <div className="bg-slate-100 text-slate-500 dark:text-slate-500 transition-colors duration-300 p-2.5 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                               <FileText size={18} />
                            </div>
                            <div>
                               <p className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 text-sm">#{bill.invoiceNo}</p>
                               <p className="text-[10px] text-slate-400 font-bold tracking-wider">{bill.readableDate || new Date(bill.date).toLocaleDateString()}</p>
                            </div>
                         </div>
                      </td>
                      <td className="py-5 px-6">
                         <p className="font-bold text-slate-700 dark:text-slate-300 transition-colors duration-300 text-sm">{bill.customerName}</p>
                         <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{bill.paymentMode} Payment</p>
                      </td>
                      <td className="py-5 px-6 text-right">
                         <p className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 text-sm">Γé╣{bill.amountPaid.toFixed(2)}</p>
                         <p className={`text-[10px] font-black uppercase tracking-tighter ${bill.outstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {bill.outstanding > 0 ? `- Γé╣${bill.outstanding.toFixed(2)} Pending` : 'Fully Paid'}
                         </p>
                      </td>
                      <td className="py-5 px-8 text-right">
                         <p className="font-black text-slate-900 text-lg tracking-tight">Γé╣{(bill.grandTotal || bill.total || 0).toFixed(2)}</p>
                         <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={14} className="text-indigo-400 translate-x-1" />
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
