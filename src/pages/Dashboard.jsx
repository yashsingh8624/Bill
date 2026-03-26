import React, { useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { useInventory } from '../context/InventoryContext';
import { useCustomers } from '../context/CustomerContext';
import { useSuppliers } from '../context/SupplierContext';
import { IndianRupee, TrendingUp, AlertTriangle, FileText, ArrowRight, Target, Users, Package, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { bills } = useBills();
  const { products } = useInventory();
  const { customers } = useCustomers();
  const { suppliers } = useSuppliers();

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const thisMonthStr = todayStr.slice(0, 7);
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    const activeBills = bills.filter(b => !b.isDeleted);
    
    const todaysBills = activeBills.filter(b => b.date && b.date.startsWith(todayStr));
    const yesterdaysBills = activeBills.filter(b => b.date && b.date.startsWith(yesterdayStr));
    const thisMonthBills = activeBills.filter(b => b.date && b.date.startsWith(thisMonthStr));
    const lastMonthBills = activeBills.filter(b => b.date && b.date.startsWith(lastMonthStr));

    const todaysSales = todaysBills.reduce((sum, b) => sum + (b.grandTotal || b.total || 0), 0);
    const yesterdaysSales = yesterdaysBills.reduce((sum, b) => sum + (b.grandTotal || b.total || 0), 0);
    const thisMonthSales = thisMonthBills.reduce((sum, b) => sum + (b.grandTotal || b.total || 0), 0);
    const lastMonthSales = lastMonthBills.reduce((sum, b) => sum + (b.grandTotal || b.total || 0), 0);

    const salesTrend = yesterdaysSales === 0 ? 100 : ((todaysSales - yesterdaysSales) / yesterdaysSales) * 100;
    const monthTrend = lastMonthSales === 0 ? 100 : ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100;

    const totalProfit = activeBills.reduce((acc, b) => {
       b.items.forEach(item => {
          const product = products.find(p => p.name === item.name);
          if (product && product.costPrice) {
             acc += (item.rate - product.costPrice) * item.quantity;
          }
       });
       return acc;
    }, 0);

    return {
      todaysSales,
      salesTrend,
      thisMonthSales,
      monthTrend,
      totalProfit,
      activeBillsCount: activeBills.length
    };
  }, [bills, products]);

  // Dues
  const totalCustomerDue = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalSupplierDue = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

  // Low Stock
  const lowStockProducts = products.filter(p => p.quantity <= (p.lowStockThreshold || 5));

  // Top Products
  const topProducts = useMemo(() => {
    const productSalesMap = {};
    bills.filter(b => !b.isDeleted).forEach(bill => {
      (bill.items || []).forEach(item => {
        productSalesMap[item.name] = (productSalesMap[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(productSalesMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
  }, [bills]);

  // Recent Bills
  const recentBills = useMemo(() => bills.filter(b => !b.isDeleted).slice(0, 5), [bills]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Business Overview</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Welcome back! Your business is currently active.</p>
        </div>
        <Link to="/new-bill" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 whitespace-nowrap group">
          <FileText size={20} className="group-hover:scale-110 transition-transform"/>
          Generate Invoice
        </Link>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
           <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <IndianRupee size={20} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Today's Sales</p>
           </div>
           <h3 className="text-3xl font-black text-slate-800 relative z-10 tracking-tighter">₹{stats.todaysSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <div className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${stats.salesTrend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {stats.salesTrend >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
              {Math.abs(stats.salesTrend).toFixed(1)}% from yesterday
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
           <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Calendar size={20} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Monthly Intake</p>
           </div>
           <h3 className="text-3xl font-black text-slate-800 relative z-10 tracking-tighter">₹{stats.thisMonthSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <div className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${stats.monthTrend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {stats.monthTrend >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
              {Math.abs(stats.monthTrend).toFixed(1)}% from last month
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
           <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                <TrendingUp size={20} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Estimated GP</p>
           </div>
           <h3 className="text-3xl font-black text-emerald-600 relative z-10 tracking-tighter">₹{stats.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
           <p className="text-emerald-600/60 text-[10px] mt-2 font-black uppercase tracking-widest">Lifetime Margin</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center cursor-pointer hover:border-red-200 transition-colors relative overflow-hidden group" onClick={() => document.getElementById('low-stock-section')?.scrollIntoView({behavior: 'smooth'})}>
           <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-50 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
           <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
                <AlertTriangle size={20} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Inventory Health</p>
           </div>
           <h3 className="text-3xl font-black text-red-500 relative z-10 tracking-tighter">{lowStockProducts.length} Critical</h3>
           <p className="text-red-400 text-[10px] mt-2 font-black uppercase tracking-widest">Needs Re-stocking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Ledger Due Summaries */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-8">
             <Target size={16} className="text-indigo-500" /> Pending Market Exposure
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 shadow-inner group">
                <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  Receivables <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </p>
                <h4 className="text-2xl font-black text-indigo-700 tracking-tight">₹{totalCustomerDue.toLocaleString('en-IN')}</h4>
                <p className="text-indigo-400 text-[10px] mt-4 font-bold uppercase">From {customers.filter(c => c.balance > 0).length} Customers</p>
              </div>
              <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100 shadow-inner group">
                <p className="text-rose-600 text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  Payables <ArrowDownRight size={14} className="group-hover:translate-x-1 group-hover:translate-y-1 transition-transform" />
                </p>
                <h4 className="text-2xl font-black text-rose-700 tracking-tight">₹{totalSupplierDue.toLocaleString('en-IN')}</h4>
                <p className="text-rose-400 text-[10px] mt-4 font-bold uppercase">To {suppliers.filter(s => s.balance > 0).length} Suppliers</p>
              </div>
           </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
             <Package size={16} className="text-emerald-500" /> Best Moving Stock
           </h3>
           <div className="space-y-4">
             {topProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-300 italic font-medium">No sales history yet.</div>
             ) : (
                topProducts.map(([name, qty], idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                     <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all">{idx + 1}</span>
                        <span className="font-black text-slate-700 text-sm uppercase tracking-tight">{name}</span>
                     </div>
                     <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black text-[10px] border border-emerald-100 uppercase tracking-widest shadow-sm">{qty} Units</span>
                  </div>
                ))
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <FileText size={16} className="text-blue-500" /> Recent Transactions
             </h3>
             <Link to="/history" className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 tracking-widest flex items-center gap-1 group">
               View All <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </Link>
           </div>
           <div className="space-y-4">
             {recentBills.length === 0 ? (
                <div className="py-12 text-center text-slate-300 italic font-medium">Ready for your first sale!</div>
             ) : (
                recentBills.map((bill, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors group">
                     <div>
                        <p className="font-black text-slate-800 text-sm">#{bill.invoiceNo}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{bill.customerName}</p>
                     </div>
                     <div className="text-right">
                        <p className="font-black text-slate-800 tracking-tighter">₹{(bill.grandTotal || bill.total || 0).toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{(bill.readableDate || new Date(bill.date).toLocaleDateString())}</p>
                     </div>
                  </div>
                ))
             )}
           </div>
        </div>

        {/* Inventory Watchlist */}
        <div id="low-stock-section" className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-red-50/20">
            <h3 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" /> Stock Watchlist
            </h3>
            <Link to="/products" className="text-[10px] font-black uppercase text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition-colors">
              Inventory App
            </Link>
          </div>
          <div className="overflow-y-auto max-h-[350px] p-6 custom-scrollbar">
             {lowStockProducts.length === 0 ? (
               <div className="py-12 text-center flex flex-col items-center">
                 <div className="bg-emerald-50 p-4 rounded-full mb-4 border border-emerald-100 shadow-sm">
                   <Package size={32} className="text-emerald-500" />
                 </div>
                 <p className="font-black text-slate-700 text-lg uppercase tracking-tight">Inventory Optimized</p>
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">No refilling required</p>
               </div>
             ) : (
                <div className="space-y-3">
                   {lowStockProducts.map(product => (
                     <div key={product.id} className="p-4 flex items-center justify-between bg-white border border-slate-100 rounded-2xl hover:bg-red-50/30 hover:border-red-100 transition-all group">
                        <div>
                          <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{product.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Threshold: {product.lowStockThreshold || 5}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black shadow-md shadow-red-500/20">
                            {product.quantity} Left
                          </span>
                        </div>
                     </div>
                   ))}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
