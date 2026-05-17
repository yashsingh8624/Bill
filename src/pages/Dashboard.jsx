import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBills } from '../context/BillContext';
import { useParties } from '../context/PartiesContext';
import { useStore } from '../context/StoreContext';
import { 
  TrendingUp, Calendar, AlertTriangle, Cloud, 
  IndianRupee, Activity, ShoppingCart, Target, ArrowDownRight, ArrowUpRight,
  Package, ChevronRight, Calculator, PieChart, ShieldCheck, Zap, ServerOff, Server, X, Wallet, Users
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { getSheetData } from '../utils/sheetsService';
import { calculateCustomerBalance, calculateSupplierBalance } from '../utils/ledger';

const STORAGE_KEYS = {
  DASH_SALES: 'bill_dash_sales_',
  DASH_OFFLINE_ANALYTICS: 'bill_dash_analytics'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { spreadsheetId, isReady, user, useFirebase } = useAuth();
  const { bills = [], ledger = [] } = useBills() || {};
  const { products = [] } = useStore() || {};
  const { customers = [], suppliers = [] } = useParties() || {};
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dashboardModal, setDashboardModal] = useState(null); // 'get' | 'give'
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);

  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const availableYears = useMemo(() => {
    const years = new Set(bills.map(b => new Date(b.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a,b) => b-a);
  }, [bills]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { recentBills, analyticsData, totalItemsSold } = useMemo(() => {
    const validBills = bills.filter(b => b.status !== 'cancelled' && b.status !== 'void').sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = validBills.slice(0, 5);
    
    const byMonthIndex = Array(12).fill(0).map(() => ({ count: 0, saleTotal: 0, costTotal: 0 }));
    let totalItems = 0;

    validBills.forEach(b => {
      const d = new Date(b.date);
      if (d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        byMonthIndex[m].count++;
        byMonthIndex[m].saleTotal += parseFloat(b.total || b.grandTotal || 0);

        if (b.items && Array.isArray(b.items)) {
          b.items.forEach(item => {
            const qty = parseFloat(item.quantity || 0);
            totalItems += qty;
            const customCp = parseFloat(item.costPrice || 0);
            const globalCp = parseFloat(products.find(p => p.id === item.id)?.costPrice || 0);
            const cp = customCp > 0 ? customCp : globalCp;
            if (cp > 0) {
              byMonthIndex[m].costTotal += (cp * qty);
            } else {
              const estCp = (parseFloat(item.price || item.sellPrice || 0) * 0.7);
              byMonthIndex[m].costTotal += (estCp * qty);
            }
          });
        }
      }
    });

    return { recentBills: recent, analyticsData: byMonthIndex, totalItemsSold: totalItems };
  }, [bills, selectedYear, products]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    let todaySales = 0, prevSales = 0, thisMonthSales = 0, lastMonthSales = 0, totalProfit = 0;
    
    bills.filter(b => b.status !== 'cancelled' && b.status !== 'void').forEach(b => {
      const d = new Date(b.date);
      d.setHours(0,0,0,0);
      const total = parseFloat(b.total || b.grandTotal || 0);
      
      if (d.getTime() === today.getTime()) todaySales += total;
      if (d.getTime() === today.getTime() - 86400000) prevSales += total;
      if (d >= firstDayMonth) thisMonthSales += total;
      if (d >= firstDayLastMonth && d < firstDayMonth) lastMonthSales += total;
    });

    analyticsData.forEach(m => {
      totalProfit += (m.saleTotal - m.costTotal);
    });

    const salesTrend = prevSales === 0 ? (todaySales > 0 ? 100 : 0) : ((todaySales - prevSales) / prevSales) * 100;
    const monthTrend = lastMonthSales === 0 ? (thisMonthSales > 0 ? 100 : 0) : ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100;

    return {
      todaySales, prevSales, salesTrend,
      thisMonthSales, monthTrend,
      totalProfit: Math.max(0, totalProfit)
    };
  }, [bills, analyticsData]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const isCurrentYear = selectedYear === new Date().getFullYear();
    
    // Only show up to current month if it's current year to make chart dynamic
    const dataToUse = isCurrentYear ? analyticsData.slice(0, currentMonth + 1) : analyticsData;
    
    if (dataToUse.length === 0) return { maxVal: 100, heights: [] };

    const maxVal = Math.max(...dataToUse.map(d => d.saleTotal), 100);
    const heights = dataToUse.map((d, i) => ({
      height: (d.saleTotal / maxVal) * 100,
      label: months[i],
      val: d.saleTotal > 1000 ? `â‚¹${(d.saleTotal/1000).toFixed(1)}k` : (d.saleTotal > 0 ? `â‚¹${d.saleTotal.toFixed(0)}` : '')
    }));
    return { maxVal, heights };
  }, [analyticsData, selectedYear]);

  const salesTrendData = useMemo(() => {
    const currentMonthData = analyticsData[new Date().getMonth()] || { saleTotal: 0 };
    const prevMonthData = analyticsData[new Date().getMonth() - 1] || { saleTotal: 0 };
    const diff = currentMonthData.saleTotal - prevMonthData.saleTotal;
    const prevSales = prevMonthData.saleTotal || 1; 
    return {
      trend: diff >= 0 ? 'up' : 'down',
      percentage: Math.abs((diff / prevSales) * 100).toFixed(1)
    };
  }, [analyticsData, selectedYear]);

  const totalCustomerDue = useMemo(() => 
    customers.reduce((sum, c) => sum + parseFloat(calculateCustomerBalance(ledger, c?.id, c) || 0), 0)
  , [customers, ledger]);
  
  const totalSupplierDue = useMemo(() => 
    suppliers.reduce((sum, s) => sum + Math.max(0, parseFloat(calculateSupplierBalance(ledger, s?.id) || 0)), 0)
  , [suppliers, ledger]);

  const lowStockProducts = products.filter(p => p.quantity <= (p.lowStockThreshold || 5));

  const totalCashInDrawer = useMemo(() => {
    let cash = 0;
    bills.filter(b => b.status !== 'cancelled' && b.status !== 'void').forEach(b => {
       const payMethods = Array.isArray(b.paymentMethods) ? b.paymentMethods : [{ method: b.paymentMode || 'cash', amount: b.received || b.grandTotal || 0 }];
       payMethods.forEach(m => {
          if (m.method.toLowerCase() === 'cash' || m.method.toLowerCase() === 'cash drawer') cash += parseFloat(m.amount || 0);
       });
       // Subtract returned change
       if (b.paymentMode?.toLowerCase() === 'cash' && parseFloat(b.change || 0) > 0) {
           cash -= parseFloat(b.change);
       }
    });
    
    // Add payment IN via cash from ledger
    ledger.filter(l => l.type === 'PAYMENT' && l.payment_mode === 'Cash Drawer').forEach(l => {
       cash += parseFloat(l.amount || 0);
    });

    // Subtract payment OUT via cash from ledger
    ledger.filter(l => (l.type === 'PAYMENT_MADE' || l.type === 'PAYMENT_OUT') && l.payment_mode === 'Cash Drawer').forEach(l => {
       cash -= parseFloat(l.amount || 0);
    });

    return cash > 0 ? cash : 0;
  }, [bills, ledger]);
  
  const customersWithDues = useMemo(() => customers.filter(c => calculateCustomerBalance(ledger, c.id, c) > 0), [customers, ledger]);
  const suppliersWithDues = useMemo(() => suppliers.filter(s => calculateSupplierBalance(ledger, s.id) > 0), [suppliers, ledger]);

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 min-w-0 page-animate">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Intelligence <SparklesIcon className="text-indigo-500 animate-pulse" size={24} />
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Welcome back, here's what's happening.</p>
        </div>
        
        <Link to="/reports" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm text-sm font-bold text-slate-700 dark:text-slate-200">
          <PieChart size={16} className="text-indigo-500" /> Executive Reports
        </Link>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <IndianRupee size={20} />
            </div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">Revenue Today</h2>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 relative z-10 tracking-tighter transition-colors duration-300">â‚¹{stats.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          
          <div className={`text-[10px] sm:text-xs mt-3 flex items-center gap-1 font-bold ${parseFloat(stats.salesTrend || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'} transition-colors duration-300`}>
            {parseFloat(stats.salesTrend || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(parseFloat(stats.salesTrend || 0)).toFixed(1)}% from yesterday
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <Calendar size={20} />
            </div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">This Month</h2>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 relative z-10 tracking-tighter transition-colors duration-300">â‚¹{stats.thisMonthSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <div className={`text-[10px] sm:text-xs mt-3 flex items-center gap-1 font-bold ${stats.monthTrend >= 0 ? 'text-emerald-500' : 'text-rose-500'} transition-colors duration-300`}>
            {stats.monthTrend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(stats.monthTrend).toFixed(1)}% from last month
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">Est. Profit</h2>
          </div>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-500 relative z-10 tracking-tighter transition-colors duration-300">â‚¹{stats.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-emerald-600/60 dark:text-emerald-500/60 text-[10px] mt-2 font-black uppercase tracking-widest">Lifetime Margin</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Wallet size={20} />
            </div>{/* Sales Analytics Section */}
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-lg shadow-indigo-500/5 dark:shadow-none border border-slate-100 dark:border-slate-700/50 relative overflow-hidden transition-all duration-300 backdrop-blur-xl">
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
           <div>
             <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
               <TrendingUp size={24} className="text-indigo-600 dark:text-indigo-400" /> Sales Analytics
             </h3>
             <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Monthly breakdown for {selectedYear}</p>
           </div>
           
           <select 
             value={selectedYear}
             onChange={(e) => setSelectedYear(Number(e.target.value))}
             className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer appearance-none text-sm min-w-[120px]"
           >
             {availableYears.map(y => (
               <option key={y} value={y}>{y}</option>
             ))}
           </select>
        </div>
        
        {/* Animated Bar Chart */}
        <div className="relative h-64 w-full flex items-end gap-1 sm:gap-2 z-10 mt-6 group">
          {chartData.heights.length === 0 ? (
            <div className="flex w-full h-full items-center justify-center text-slate-400 font-bold mb-8">No data for {selectedYear}</div>
          ) : (
            <>
               <div className="absolute left-0 top-0 bottom-8 w-full flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10">
                  <div className="w-full h-px bg-slate-400"></div>
                  <div className="w-full h-px bg-slate-400"></div>
                  <div className="w-full h-px bg-slate-400"></div>
                  <div className="w-full h-px bg-slate-400"></div>
               </div>
               
               {chartData.heights.map((bar, i) => (
                 <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group/bar">
                    <div 
                      className="w-full max-w-[2.5rem] bg-indigo-500 hover:bg-indigo-400 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-t-lg transition-all duration-700 ease-out relative cursor-pointer shadow-sm group-hover/bar:shadow-md"
                      style={{ height: `${bar.height || 2}%`, minHeight: '4px' }}
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold py-1 px-3 rounded-lg shadow-xl pointer-events-none transition-all z-20 whitespace-nowrap transform scale-95 group-hover/bar:scale-100">
                         {bar.val !== '' ? bar.val : 'â‚¹0'}
                         <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                      </div>
                    </div>
                    <span className="text-[10px] mt-3 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{bar.label}</span>
                 </div>
               ))}
            </>
          )}
        </div>
        
        {/* Trend Indicator */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-4 relative z-10">
           <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl ${salesTrendData.trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
               {salesTrendData.trend === 'up' ? <TrendingUp size={16} /> : <ArrowDownRight size={16} />}
             </div>
             <div>
               <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Growth vs Last Month</p>
               <p className={`font-black text-sm ${salesTrendData.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                 {salesTrendData.trend === 'up' ? '+' : '-'}{salesTrendData.percentage}%
               </p>
             </div>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Sales YTD</p>
                <p className="font-black text-slate-800 dark:text-slate-100">â‚¹{analyticsData.reduce((s,d)=>s+d.saleTotal,0).toLocaleString('en-IN', {maximumFractionDigits:0})}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Items Sold</p>
                <p className="font-black text-slate-800 dark:text-slate-100">{totalItemsSold}</p>
              </div>
           </div>
        </div>
      </div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">Drawer Cash</h2>
          </div>
          <h3 className="text-3xl font-black text-amber-600 dark:text-amber-500 relative z-10 tracking-tighter transition-colors duration-300">â‚¹{totalCashInDrawer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest transition-colors duration-300">Physical Cash Balance</p>
        </div>
      </div>
      {/* Cloud Storage Section */}
      {!isOffline && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:scale-110 transition-transform pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Cloud size={16} className="text-blue-500" /> Your Cloud Storage
            </h3>
            <div className="flex items-center gap-3">
              <p className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                Connected via {useFirebase ? 'Firebase' : 'Google Sheets'}
              </p>
            </div>
            {offlinePendingCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-2 flex items-center gap-1">
                 <AlertTriangle size={12} /> {offlinePendingCount} pending uploads waiting.
              </p>
            )}
          </div>
          <button 
            type="button"
            onClick={() => {
              if (useFirebase) {
                navigate('/reports');
              } else if (spreadsheetId) {
                window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
              }
            }}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 relative z-10"
          >
            {useFirebase ? 'Open Console' : 'Open Spreadsheets'} <ArrowUpRight size={16} />
          </button>
        </div>
      )}

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Payable/Receivables */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col transition-colors duration-300">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target size={16} className="text-indigo-500 dark:text-indigo-400" /> Pending Market Exposure
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div 
              onClick={() => setDashboardModal('get')}
              className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm cursor-pointer transition-colors group relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-100 dark:bg-emerald-800/30 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
                You'll Get
              </p>
              <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-500 tracking-tight mb-2">â‚¹{totalCustomerDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h4>
              <div className="flex items-center justify-between mt-4">
                 <p className="text-emerald-500 dark:text-emerald-300 text-[10px] font-bold uppercase">From {customersWithDues.length} Customers</p>
                 <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-500 shadow-sm group-hover:translate-x-1 transition-transform">
                   <ChevronRight size={16} />
                 </div>
              </div>
            </div>

            <div 
              onClick={() => setDashboardModal('give')}
              className="bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 p-6 rounded-3xl border border-rose-100 dark:border-rose-800/50 shadow-sm cursor-pointer transition-colors group relative overflow-hidden"
            >
              <div className="absolute right-0 top-0 w-24 h-24 bg-rose-100 dark:bg-rose-800/30 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
              <p className="text-rose-700 dark:text-rose-400 text-xs font-black uppercase tracking-widest mb-1">
                You'll Give
              </p>
              <h4 className="text-3xl font-black text-rose-600 dark:text-rose-500 tracking-tight mb-2">â‚¹{totalSupplierDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h4>
              <div className="flex items-center justify-between mt-4">
                 <p className="text-rose-500 dark:text-rose-300 text-[10px] font-bold uppercase">To {suppliersWithDues.length} Suppliers</p>
                 <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-rose-500 shadow-sm group-hover:translate-x-1 transition-transform">
                   <ChevronRight size={16} />
                 </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-700/50 flex-1 flex flex-col">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2 transition-colors duration-300">
              <Clock size={16} /> Recent Invoices
            </h3>
            {recentBills.length === 0 ? (
              <div className="py-12 text-center text-slate-300 dark:text-slate-600 italic font-medium transition-colors duration-300">Ready for your first sale!</div>
            ) : (
              recentBills.map((bill, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-800 dark:text-slate-100 text-sm transition-colors duration-300 text-ellipsis overflow-hidden">#{bill.invoiceNo}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-ellipsis overflow-hidden white-space-nowrap">{(bill.customerName || 'Unknown')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-slate-800 dark:text-slate-100 tracking-tighter transition-colors duration-300">â‚¹{(bill.grandTotal || bill.total || 0).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium transition-colors duration-300">{(bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A'))}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Inventory Watchlist */}
        <div id="low-stock-section" className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden flex flex-col transition-colors duration-300">
          <div className="p-8 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between bg-red-50/20 dark:bg-red-900/10">
            <h3 className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" /> Stock Watchlist
            </h3>
            <Link to="/products" className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-xl shadow-sm transition-colors">
              Inventory App
            </Link>
          </div>
          <div className="overflow-y-auto max-h-[350px] p-6 custom-scrollbar">
            {lowStockProducts.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-full mb-4 border border-emerald-100 dark:border-emerald-800/50 shadow-sm transition-colors duration-300">
                  <Package size={32} className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 mb-1 transition-colors duration-300">Inventory Healthy</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors duration-300">No items running low on stock.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {lowStockProducts.map(fp => (
                  <li key={fp.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-600/50 transition-colors duration-300">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate transition-colors duration-300">{fp.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold transition-colors duration-300">Stock: {fp.quantity} left</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider transition-colors duration-300">
                        {fp.quantity <= 0 ? 'Out of Stock' : 'Low'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
      
      {/* Modals for Get/Give breakdown */}
      {dashboardModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => { if(e.target === e.currentTarget) setDashboardModal(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className={`p-6 border-b flex items-center justify-between ${dashboardModal === 'get' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <h3 className={`font-black text-lg ${dashboardModal === 'get' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {dashboardModal === 'get' ? "You'll Get" : "You'll Give"}
              </h3>
              <button onClick={() => setDashboardModal(null)} className="text-slate-400 hover:text-slate-700 p-1 bg-white/50 dark:bg-slate-700/50 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-0 flex-1 bg-slate-50">
              <ul className="divide-y divide-slate-100">
                {(dashboardModal === 'get' ? customersWithDues : suppliersWithDues).length === 0 ? (
                  <li className="p-8 text-center text-slate-500 font-bold">No pending balances.</li>
                ) : (
                  (dashboardModal === 'get' ? customersWithDues : suppliersWithDues).map(entity => {
                    const balance = dashboardModal === 'get' ? calculateCustomerBalance(ledger, entity.id, entity) : calculateSupplierBalance(ledger, entity.id);
                    // Find last txn date
                    let entries = ledger.filter(l => 
                       dashboardModal === 'get' ? l.customer_id === entity.id || l.party_id === entity.id : l.supplier_id === entity.id || l.party_id === entity.id
                    ).sort((a,b) => new Date(b.date) - new Date(a.date));
                    const lastDate = entries.length > 0 ? new Date(entries[0].date).toLocaleDateString() : 'N/A';

                    return (
                      <li key={entity.id} 
                        onClick={() => {
                          setDashboardModal(null);
                          if(dashboardModal === 'get') navigate('/parties/customers', { state: { selectedCustomerId: entity.id }});
                          else navigate('/parties/suppliers', { state: { selectedSupplierId: entity.id }});
                        }}
                        className="p-4 hover:bg-white cursor-pointer active:bg-slate-100 transition-colors flex items-center justify-between"
                      >
                         <div>
                           <p className="font-bold text-slate-800 text-sm">{entity.name}</p>
                           {entity.phone && <p className="text-[10px] text-slate-500">{entity.phone}</p>}
                           <p className="text-[10px] bg-slate-100 px-2 rounded-md text-slate-400 mt-1 w-fit">Last Trx: {lastDate}</p>
                         </div>
                         <div className="text-right">
                           <p className={`font-black text-lg ${dashboardModal === 'get' ? 'text-emerald-600' : 'text-rose-600'}`}>
                             â‚¹{balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                           </p>
                         </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper Sparkles Icon
function SparklesIcon(props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
      {...props}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
      <path d="M20 3v4"/>
      <path d="M22 5h-4"/>
      <path d="M4 17v2"/>
      <path d="M5 18H3"/>
    </svg>
  );
}
      
