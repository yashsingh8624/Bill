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
            </div>
            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors duration-300">Drawer Cash</h2>
          </div>
          <h3 className="text-3xl font-black text-amber-600 dark:text-amber-500 relative z-10 tracking-tighter transition-colors duration-300">â‚¹{totalCashInDrawer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest transition-colors duration-300">Physical Cash Balance</p>
        </div>
      </div>

      {/* Sales Analytics Section */}
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
                <p className="font-black 