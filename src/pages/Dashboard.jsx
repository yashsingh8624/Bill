import React, { useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { useInventory } from '../context/InventoryContext';
import { useCustomers, useSuppliers } from '../context/PartiesContext';
import { IndianRupee, TrendingUp, AlertTriangle, FileText, ArrowRight, Target, Users, Package, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight, Cloud, FolderOpen, FileSpreadsheet, Loader2, Wallet, History, X, Banknote, ArrowDown } from 'lucide-react';
import { useExpenses } from '../context/ExpenseContext';
import { Link, useNavigate } from 'react-router-dom';
import { calculateCustomerBalance, calculateSupplierBalance } from '../utils/ledger';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Dashboard() {
  const { folderId, spreadsheetId, status, isOffline } = useAuth() || {};

  const billsRes = useBills() || {};
  const bills = Array.isArray(billsRes.bills) ? billsRes.bills : [];
  const ledger = Array.isArray(billsRes.ledger) ? billsRes.ledger : [];

  const inventoryRes = useInventory() || {};
  const products = Array.isArray(inventoryRes.products) ? inventoryRes.products : [];

  const customersRes = useCustomers() || {};
  const customers = Array.isArray(customersRes.customers) ? customersRes.customers : [];

  const suppliersRes = useSuppliers() || {};
  const suppliers = Array.isArray(suppliersRes.suppliers) ? suppliersRes.suppliers : [];

  const { expenses } = useExpenses();

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

    const activeBills = bills.filter(b => b && !b.isDeleted);

    const todaysBills = activeBills.filter(b => b?.date && String(b.date).startsWith(todayStr));
    const yesterdaysBills = activeBills.filter(b => b?.date && String(b.date).startsWith(yesterdayStr));
    const thisMonthBills = activeBills.filter(b => b?.date && String(b.date).startsWith(thisMonthStr));
    const lastMonthBills = activeBills.filter(b => b?.date && String(b.date).startsWith(lastMonthStr));

    const getBillSaleAmount = (b) => {
      if (Array.isArray(b?.items) && b.items.length > 0) {
        return b.items.reduce((sum, item) => sum + (parseFloat(item?.amount) || 0), 0);
      }
      return (parseFloat(b?.subTotal) || 0) + (parseFloat(b?.cgst) || 0) + (parseFloat(b?.sgst) || 0);
    };

    const todaysSales = todaysBills.reduce((sum, b) => sum + getBillSaleAmount(b), 0);
    const yesterdaysSales = yesterdaysBills.reduce((sum, b) => sum + getBillSaleAmount(b), 0);
    const thisMonthSales = thisMonthBills.reduce((sum, b) => sum + getBillSaleAmount(b), 0);
    const lastMonthSales = lastMonthBills.reduce((sum, b) => sum + getBillSaleAmount(b), 0);

    const salesTrend = yesterdaysSales === 0 ? 0 : ((todaysSales - yesterdaysSales) / yesterdaysSales) * 100;
    const monthTrend = lastMonthSales === 0 ? 0 : ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100;

    const totalProfit = activeBills.reduce((acc, b) => {
      (b?.items || []).forEach(item => {
        const product = products.find(p => p && p.name === item?.name);
        if (product && product.purchasePrice) {
          acc += (parseFloat(item?.rate || 0) - parseFloat(product.purchasePrice)) * parseFloat(item?.quantity || 0);
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

  // Cash in Hand calculation
  const cashInHand = useMemo(() => {
    const cashCollected = bills.filter(b => !b.isDeleted && b.paymentMode === 'Cash')
      .reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    
    const cashEx = expenses.filter(e => e.payment_mode === 'Cash')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
      
    return Math.round((cashCollected - cashEx) * 100) / 100;
  }, [bills, expenses]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
  }, []);

  // Monthly Chart Data (Last 6 months with trends based on selected year)
  const chartData = useMemo(() => {
    const months = [];
    const currentYear = new Date().getFullYear();
    // If selected year is current year, show till current month. Else show till December (index 11).
    const endMonth = selectedYear === currentYear ? new Date().getMonth() : 11;

    // Fetch 7 months to calculate the trend for the oldest displayed month
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedYear, endMonth - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short' }),
        key: d.toISOString().slice(0, 7),
        value: 0
      });
    }

    bills.filter(b => !b.isDeleted).forEach(b => {
      const mKey = b.date?.slice(0, 7);
      const month = months.find(m => m.key === mKey);
      if (month) {
        const amt = Array.isArray(b.items) && b.items.length > 0
          ? b.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
          : (parseFloat(b.subTotal) || 0) + (parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0);
        month.value += amt;
      }
    });

    const displayMonths = [];
    for (let i = 1; i <= 6; i++) {
        const current = months[i];
        const prev = months[i-1];
        let trend = 'flat';
        if (current.value > prev.value) trend = 'up';
        if (current.value < prev.value) trend = 'down';
        
        displayMonths.push({
            ...current,
            trend
        });
    }

    return displayMonths;
  }, [bills, selectedYear]);

  const totalCustomerDue = useMemo(() => 
    customers.reduce((sum, c) => sum + parseFloat(calculateCustomerBalance(ledger, c?.id, c) || 0), 0)
  , [customers, ledger]);
  
  const totalSupplierDue = useMemo(() => 
    suppliers.reduce((sum, s) => sum + Math.max(0, parseFloat(calculateSupplierBalance(ledger, s?.id) || 0)), 0)
  , [suppliers, ledger]);

  const lowStockProducts = products.filter(p => p.quantity <= (p.lowStockThreshold || 5));



  const topProducts = useMemo(() => {
    const productSalesMap = {};
    bills.filter(b => !b.isDeleted).forEach(bill => {
      (bill.items || []).forEach(item => {
        productSalesMap[item.name] = (productSalesMap[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(productSalesMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [bills]);

  const recentBills = useMemo(() => bills.filter(b => !b.isDeleted).slice(0, 5), [bills]);

  const [dashboardModal, setDashboardModal] = useState(null); // 'get' | 'give'
  const customersWithDues = useMemo(() => customers.filter(c => calculateCustomerBalance(ledger, c.id, c) > 0), [customers, ledger]);
  const suppliersWithDues = useMemo(() => suppliers.filter(s => calculateSupplierBalance(ledger, s.id) > 0), [suppliers, ledger]);

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 min-w-0 page-animate">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors duration-300">Business Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium italic transition-colors duration-300">Welcome back! Your business is currently active.</p>
        </div>
        <Link to="/new-bill" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl transition-all duration-300 font-black flex items-center justify-center gap-2 shadow-xl shadow-green-600/20 whitespace-nowrap group">
          <FileText size={20} className="group-hover:scale-110 transition-transform" />
          Generate Invoice
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
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest transition-colors duration-300">Today's Sales</p>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 relative z-10 tracking-tighter transition-colors duration-300">₹{parseFloat(stats.todaysSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <div className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${parseFloat(stats.salesTrend || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
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
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest transition-colors duration-300">Monthly Intake</p>
          </div>
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 relative z-10 tracking-tighter transition-colors duration-300">₹{stats.thisMonthSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <div className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${stats.monthTrend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
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
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest transition-colors duration-300">Estimated GP</p>
          </div>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-500 relative z-10 tracking-tighter transition-colors duration-300">₹{stats.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <p className="text-emerald-600/60 dark:text-emerald-500/60 text-[10px] mt-2 font-black uppercase tracking-widest">Lifetime Margin</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-600 flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full blur-xl group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Wallet size={20} />
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest transition-colors duration-300">Cash In Hand</p>
          </div>
          <h3 className={`text-3xl font-black relative z-10 tracking-tighter transition-colors duration-300 ${cashInHand >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-500'}`}>
            ₹{cashInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 font-black uppercase tracking-widest transition-colors duration-300">Physical Cash Balance</p>
        </div>
      </div>

      {/* Sales Momentum Section */}
      {/* Sales Momentum Section */}
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-600 relative overflow-hidden transition-colors duration-300">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div>
             <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1 transition-colors duration-300">
               <TrendingUp size={24} className="text-indigo-600 dark:text-indigo-400" /> Sales Momentum
             </h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-bold transition-colors duration-300">Last 6 Months Performance</p>
           </div>
           <div>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none shadow-sm cursor-pointer transition-colors duration-300"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem', paddingRight: '2.5rem' }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year} Year</option>
                ))}
              </select>
           </div>
        </div>
        
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden shadow-sm transition-colors duration-300">
          {chartData.map((d, i) => (
            <div key={i} className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
               <span className="font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-sm sm:text-base transition-colors duration-300">{d.label}</span>
               <div className="flex items-center gap-4 sm:gap-6">
                  <span className="font-black text-slate-800 dark:text-slate-100 text-lg sm:text-xl tracking-tight transition-colors duration-300">₹{d.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <div className="w-6 flex justify-center">
                    {d.trend === 'up' && <span className="text-green-500 font-black text-2xl leading-none">↑</span>}
                    {d.trend === 'down' && <span className="text-red-500 font-black text-2xl leading-none">↓</span>}
                    {d.trend === 'flat' && <span className="text-slate-300 dark:text-slate-500 font-black text-2xl leading-none transition-colors duration-300">-</span>}
                  </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud Storage Section */}
      {!isOffline && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-50 rounded-full blur-2xl group-hover:scale-110 transition-transform pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Cloud size={16} className="text-blue-500" /> Your Cloud Storage
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Access your synced invoices and database sheets directly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 relative z-10">
            {(!folderId || !spreadsheetId) && status !== 'ready' ? (
              <div className="flex items-center text-slate-500 text-sm font-bold gap-2">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                Setting up your cloud storage...
              </div>
            ) : (
              <>
                {folderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${folderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-md hover:shadow-blue-500/20"
                  >
                    <FolderOpen size={18} />
                    Open Drive Folder
                  </a>
                )}
                {spreadsheetId && spreadsheetId !== 'LOCAL_MODE' && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
                  >
                    <FileSpreadsheet size={18} />
                    Open Google Sheet
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ledger Due Summaries - Vyapar Style */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 col-span-1 lg:col-span-2 transition-colors duration-300">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
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
              <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-500 tracking-tight mb-2">₹{totalCustomerDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h4>
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
              <h4 className="text-3xl font-black text-rose-600 dark:text-rose-500 tracking-tight mb-2">₹{totalSupplierDue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</h4>
              <div className="flex items-center justify-between mt-4">
                 <p className="text-rose-500 dark:text-rose-300 text-[10px] font-bold uppercase">To {suppliersWithDues.length} Suppliers</p>
                 <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-rose-500 shadow-sm group-hover:translate-x-1 transition-transform">
                   <ChevronRight size={16} />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
            <Package size={16} className="text-emerald-500 dark:text-emerald-400" /> Best Moving Stock
          </h3>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-300 dark:text-slate-600 italic font-medium transition-colors duration-300">No sales history yet.</div>
            ) : (
              topProducts.map(([name, qty], idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 dark:border-slate-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all">{idx + 1}</span>
                    <span className="font-black text-slate-700 dark:text-slate-300 text-sm uppercase tracking-tight transition-colors duration-300">{name}</span>
                  </div>
                  <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-black text-[10px] border border-emerald-100 dark:border-emerald-800/50 uppercase tracking-widest shadow-sm transition-colors duration-300">{qty} Units</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} className="text-blue-500 dark:text-blue-400" /> Recent Transactions
            </h3>
            <Link to="/bills" className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 tracking-widest flex items-center gap-1 group transition-colors">
              View All <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="space-y-4">
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
                    <p className="font-black text-slate-800 dark:text-slate-100 tracking-tighter transition-colors duration-300">₹{(bill.grandTotal || bill.total || 0).toFixed(2)}</p>
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
                <p className="font-black text-slate-700 dark:text-slate-300 text-lg uppercase tracking-tight transition-colors duration-300">Inventory Optimized</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 transition-colors duration-300">No refilling required</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="p-4 flex items-center justify-between bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-2xl hover:bg-red-50/30 dark:hover:bg-red-900/20 hover:border-red-100 dark:hover:border-red-800/50 transition-all group">
                    <div>
                      <p className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight transition-colors duration-300">{product.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold tracking-widest uppercase mt-0.5 transition-colors duration-300">Threshold: {product.lowStockThreshold || 5}</p>
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
      
      {/* Dashboard Modal */}
      {dashboardModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95">
            <div className={`px-6 py-4 flex justify-between items-center ${dashboardModal === 'get' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-rose-50 border-b border-rose-100'}`}>
              <h3 className={`text-lg font-black flex items-center gap-2 ${dashboardModal === 'get' ? 'text-emerald-800' : 'text-rose-800'}`}>
                {dashboardModal === 'get' ? "You'll Get" : "You'll Give"}
              </h3>
              <button onClick={() => setDashboardModal(null)} className="text-slate-400 hover:text-slate-700 p-1 bg-white/50 rounded-full hover:bg-white transition-colors">
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
                    const txns = ledger.filter(entry => 
                      (dashboardModal === 'get' ? entry.customer_id === entity.id : entry.supplier_id === entity.id) &&
                      !entry.is_void
                    ).sort((a,b) => new Date(b.date) - new Date(a.date));
                    const lastTxnDate = txns.length > 0 ? new Date(txns[0].date).toLocaleDateString() : 'N/A';
                    
                    return (
                      <li key={entity.id} className="p-4 bg-white hover:bg-slate-50 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{entity.name || entity.businessName}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">Last interaction: {lastTxnDate}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${dashboardModal === 'get' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{parseFloat(balance).toLocaleString('en-IN', {minimumFractionDigits: 2})}
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
