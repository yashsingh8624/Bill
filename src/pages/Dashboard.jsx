import React from 'react';
import { useAppContext } from '../context/AppContext';
import { IndianRupee, TrendingUp, AlertTriangle, FileText, ArrowRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { bills, products, customers } = useAppContext();

  // 1. Today's Sales
  const today = new Date().toISOString().split('T')[0];
  const todaysBills = bills.filter(b => b.date === today);
  const todaysSales = todaysBills.reduce((sum, bill) => sum + (bill.grandTotal || bill.total || 0), 0);

  // 2. Total Outstanding
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  // 3. Low Stock Alerts
  const lowStockProducts = products.filter(p => p.quantity < 5);

  // 4. Total Profit (Selling - Purchase price across all items sold)
  // Since we don't store individual item profit historically, we can estimate it based on current purchase price
  // Or if we strictly calculate from ALL bills:
  const totalProfit = bills.reduce((profitSum, bill) => {
    const billProfit = (bill.items || []).reduce((itemSum, item) => {
       // Find product's original purchase price or default to 0 if not found
       const product = item.productId ? products.find(p => p.id === item.productId) : null;
       const purchasePrice = product ? (parseFloat(product.purchasePrice) || 0) : 0;
       const profitPerItem = item.price - purchasePrice;
       return itemSum + (profitPerItem * item.quantity);
    }, 0);
    return profitSum + billProfit;
  }, 0);

  const recentBills = bills.slice(0, 5); // Get top 5 recent bills

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Overview of your business performance.</p>
        </div>
        <Link to="/new-bill" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
          <FileText size={18} />
          Create New Bill
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-3">
             <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
               <IndianRupee size={24} />
             </div>
             <p className="text-slate-500 text-sm font-medium">Today's Sales</p>
          </div>
          <h3 className="text-3xl font-black text-slate-800">₹{todaysSales.toFixed(2)}</h3>
        </div>
        
        {/* Total Profit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-3">
             <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
               <TrendingUp size={24} />
             </div>
             <p className="text-slate-500 text-sm font-medium">Total Profit</p>
          </div>
          <h3 className="text-3xl font-black text-emerald-600">₹{totalProfit.toFixed(2)}</h3>
        </div>

        {/* Total Outstanding */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-3">
             <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
               <Target size={24} />
             </div>
             <p className="text-slate-500 text-sm font-medium">Total Outstanding</p>
          </div>
          <h3 className="text-3xl font-black text-amber-500">₹{totalOutstanding.toFixed(2)}</h3>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center cursor-pointer hover:border-red-200 transition-colors" onClick={() => document.getElementById('low-stock-section')?.scrollIntoView({behavior: 'smooth'})}>
          <div className="flex items-center gap-4 mb-3">
             <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
               <AlertTriangle size={24} />
             </div>
             <p className="text-slate-500 text-sm font-medium">Low Stock Items</p>
          </div>
          <h3 className="text-3xl font-black text-red-500">{lowStockProducts.length} Items</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Recent Bills</h3>
            <Link to="/bills" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            {recentBills.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <FileText size={32} className="text-slate-300 mb-2" />
                <p className="font-medium">No bills created yet</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
                    <th className="py-3 px-5">Invoice</th>
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBills.map(bill => (
                    <tr key={bill.id} className="hover:bg-slate-50/80">
                       <td className="py-3 px-5 text-slate-800 font-medium text-sm">#{bill.invoiceNo || bill.id.slice(-4)}</td>
                       <td className="py-3 px-5 text-slate-600 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{bill.customerName}</td>
                       <td className="py-3 px-5 text-indigo-600 font-bold text-sm text-right">₹{(bill.grandTotal || bill.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock List */}
        <div id="low-stock-section" className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" /> Low Stock Alerts
            </h3>
            <Link to="/products" className="text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">
              Manage Stock
            </Link>
          </div>
          <div className="overflow-y-auto flex-1 max-h-[300px]">
             {lowStockProducts.length === 0 ? (
               <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                 <div className="bg-emerald-50 text-emerald-500 p-3 rounded-full mb-2">
                   <Target size={24} />
                 </div>
                 <p className="font-medium">All products are well stocked!</p>
               </div>
             ) : (
                <div className="divide-y divide-slate-100">
                   {lowStockProducts.map(product => (
                     <div key={product.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-800">{product.name}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">Purchased at ₹{parseFloat(product.purchasePrice || 0).toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-sm font-bold shadow-sm">
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
