import React from 'react';
import { useBills } from '../context/BillContext';
import { useInventory } from '../context/InventoryContext';
import { useCustomers } from '../context/CustomerContext';
import { useSuppliers } from '../context/SupplierContext';
import { IndianRupee, TrendingUp, AlertTriangle, FileText, ArrowRight, Target, Users, Package, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { bills } = useBills();
  const { products } = useInventory();
  const { customers } = useCustomers();
  const { suppliers } = useSuppliers();

  // Dates
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  
  // Filters
  const todaysBills = bills.filter(b => b.date.startsWith(todayStr));
  const thisMonthBills = bills.filter(b => b.date.startsWith(currentMonthStr));
  
  // Sales & Profit Computations
  const todaysSales = todaysBills.reduce((sum, b) => sum + (b.grandTotal || b.total || 0), 0);
  const monthlySales = thisMonthBills.reduce((sum, b) => sum + (b.grandTotal || b.total || 0), 0);
  const totalProfit = bills.reduce((sum, b) => sum + (b.profit || 0), 0);
  
  // Dues
  const totalCustomerDue = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalSupplierDue = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

  // Low Stock
  const lowStockProducts = products.filter(p => p.quantity <= (p.lowStockThreshold || 5));

  // Top Products
  const productSalesMap = {};
  bills.forEach(bill => {
    (bill.items || []).forEach(item => {
      productSalesMap[item.name] = (productSalesMap[item.name] || 0) + item.quantity;
    });
  });
  const topProducts = Object.entries(productSalesMap).sort((a,b) => b[1] - a[1]).slice(0, 5);

  // Top Customers
  const customerBilledMap = {};
  bills.forEach(bill => {
    customerBilledMap[bill.customerName] = (customerBilledMap[bill.customerName] || 0) + (bill.grandTotal || bill.total || 0);
  });
  const topCustomers = Object.entries(customerBilledMap).sort((a,b) => b[1] - a[1]).slice(0, 5);

  const recentBills = bills.slice(0, 4);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Real-time overview of business performance.</p>
        </div>
        <Link to="/new-bill" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 whitespace-nowrap">
          <FileText size={18} />
          Create New Bill
        </Link>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 rounded-full blur-xl"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
               <IndianRupee size={20} />
             </div>
             <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Today's Sales</p>
          </div>
          <h3 className="text-3xl font-black text-slate-800 relative z-10">₹{todaysSales.toFixed(2)}</h3>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full blur-xl"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
               <Calendar size={20} />
             </div>
             <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Monthly Sales</p>
          </div>
          <h3 className="text-3xl font-black text-slate-800 relative z-10">₹{monthlySales.toFixed(2)}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full blur-xl"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
               <TrendingUp size={20} />
             </div>
             <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Profit</p>
          </div>
          <h3 className="text-3xl font-black text-emerald-600 relative z-10">₹{totalProfit.toFixed(2)}</h3>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center cursor-pointer hover:border-red-200 transition-colors relative overflow-hidden" onClick={() => document.getElementById('low-stock-section')?.scrollIntoView({behavior: 'smooth'})}>
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-50 rounded-full blur-xl"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
             <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
               <AlertTriangle size={20} />
             </div>
             <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Low Stock</p>
          </div>
          <h3 className="text-3xl font-black text-red-500 relative z-10">{lowStockProducts.length} Items</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
         {/* Ledger Due Summaries */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
             <Target size={20} className="text-indigo-500" /> Pending Ledgers Summary
           </h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                 <div>
                    <p className="text-sm font-bold text-indigo-900 uppercase tracking-widest mb-0.5">Customers Owe You</p>
                    <p className="text-xs text-indigo-500 font-medium">Money to receive over time</p>
                 </div>
                 <h4 className="text-2xl font-black text-indigo-600">₹{totalCustomerDue.toFixed(2)}</h4>
              </div>
              <div className="flex items-center justify-between p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                 <div>
                    <p className="text-sm font-bold text-rose-900 uppercase tracking-widest mb-0.5">You Owe Suppliers</p>
                    <p className="text-xs text-rose-500 font-medium">Money to pay to vendors</p>
                 </div>
                 <h4 className="text-2xl font-black text-rose-600">₹{totalSupplierDue.toFixed(2)}</h4>
              </div>
           </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
             <Package size={20} className="text-emerald-500" /> Top Selling Products
           </h3>
           <div className="space-y-1">
             {topProducts.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center font-medium">Not enough data to determine top products.</p>
             ) : (
                topProducts.map(([name, qty], idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded transition-colors text-sm">
                     <span className="font-bold text-slate-700">{name}</span>
                     <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded font-black text-xs shadow-sm">{qty} units</span>
                  </div>
                ))
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
             <Users size={20} className="text-blue-500" /> Top Customers
           </h3>
           <div className="space-y-1">
             {topCustomers.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center font-medium">No sales recorded yet.</p>
             ) : (
                topCustomers.map(([name, totalAmt], idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded transition-colors text-sm">
                     <div className="flex items-center gap-3">
                        <span className="w-5 text-center text-xs font-black text-slate-400">{idx + 1}</span>
                        <span className="font-bold text-slate-800">{name}</span>
                     </div>
                     <span className="text-slate-600 font-bold">₹{totalAmt.toFixed(2)}</span>
                  </div>
                ))
             )}
           </div>
        </div>

        {/* Low Stock List */}
        <div id="low-stock-section" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-red-50/30">
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> Low Stock Alerts
            </h3>
            <Link to="/products" className="text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors">
              Manage
            </Link>
          </div>
          <div className="overflow-y-auto max-h-[250px] p-2">
             {lowStockProducts.length === 0 ? (
               <div className="p-6 text-center text-emerald-600 flex flex-col items-center">
                 <div className="bg-emerald-50 p-2 rounded-full mb-2 border border-emerald-100 shadow-sm">
                   <Target size={20} />
                 </div>
                 <p className="font-bold text-sm text-emerald-700">All products are healthy!</p>
               </div>
             ) : (
                <div className="divide-y divide-red-50/50">
                   {lowStockProducts.map(product => (
                     <div key={product.id} className="p-3 flex items-center justify-between hover:bg-red-50/50 rounded-lg transition-colors">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{product.name}</p>
                          <p className="text-xs text-slate-500 font-medium">Min Level: {product.lowStockThreshold || 5}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-white border border-red-200 text-red-600 px-3 py-1 rounded-lg text-xs font-black shadow-sm">
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
