import React, { useState, useMemo } from 'react';
import { useSuppliers } from '../context/PartiesContext';
import { useBills } from '../context/BillContext';
import { Search, Truck, ChevronRight, Plus, ArrowLeft } from 'lucide-react';
import { calculateSupplierBalance } from '../utils/ledger';
import SupplierLedger from './SupplierLedger';
import { useNavigate } from 'react-router-dom';

export default function Suppliers() {
  const navigate = useNavigate();
  const { suppliers = [], loading } = useSuppliers() || {};
  const { ledger = [] } = useBills() || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const processedSuppliers = useMemo(() => {
    return suppliers.map(s => {
      const balance = parseFloat(calculateSupplierBalance(ledger, s.id) || 0);
      return {
        ...s,
        displayName: s.name || s.businessName || 'Unnamed Supplier',
        displayPhone: s.phone || '',
        balance: balance,
        // For suppliers, positive balance usually means we owe them (Payable)
        amountText: `₹${Math.abs(balance).toFixed(2)}`
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [suppliers, ledger]);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return processedSuppliers;
    const lowerQ = searchTerm.toLowerCase();
    return processedSuppliers.filter(p => 
      p.displayName.toLowerCase().includes(lowerQ) || 
      p.displayPhone.includes(lowerQ)
    );
  }, [processedSuppliers, searchTerm]);

  if (selectedSupplier) {
    return <SupplierLedger overrideSupplier={selectedSupplier} onBack={() => setSelectedSupplier(null)} />;
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Loading Suppliers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 flex flex-col w-full max-w-5xl mx-auto page-animate px-4 sm:px-0 min-w-0" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-white p-2.5 rounded-2xl shadow-lg shadow-amber-200">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Suppliers</h2>
            <p className="text-slate-500 text-xs sm:text-sm font-bold">Manage purchases, payments, and supplier balances.</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/add-party?role=supplier')}
          className="flex items-center justify-center w-full sm:w-auto gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-amber-200 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} strokeWidth={3} /> Add Supplier
        </button>
      </div>

      <div className="search-wrapper bg-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 flex-shrink-0 transition-all focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-300">
        <Search size={18} className="search-icon text-slate-400 flex-shrink-0 sm:w-5 sm:h-5" />
        <input 
          type="text" 
          placeholder="Search suppliers by name or business..." 
          className="search-input flex-1 py-1.5 focus:outline-none text-sm sm:text-base text-slate-700 placeholder:text-slate-400 font-bold bg-transparent pl-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-w-0">
        <div className="table-wrapper" style={{ maxHeight: 'calc(100vh - 18rem)' }}>
          {processedSuppliers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 text-center">
              <div className="bg-slate-50 p-8 rounded-full mb-4 text-slate-300 border border-slate-100">
                <Truck size={64} strokeWidth={1.5} />
              </div>
              <p className="font-black text-slate-800 text-2xl">No suppliers available</p>
              <p className="text-sm mt-2 font-bold text-slate-400 max-w-xs">Add your first supplier to manage purchases and track payments.</p>
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[450px] sm:min-w-[600px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-[9px] sm:text-[10px] uppercase font-black tracking-widest">
                  <th className="py-4 px-4 sm:py-5 sm:px-8">Supplier Info</th>
                  <th className="py-4 px-4 sm:py-5 sm:px-8 text-right">Payable Amount</th>
                  <th className="py-4 px-3 sm:py-5 sm:px-8 text-center w-12 sm:w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredSuppliers.map(supplier => (
                  <tr 
                    key={supplier.id} 
                    onClick={() => setSelectedSupplier(supplier)}
                    className="hover:bg-amber-50/30 transition-all cursor-pointer group"
                  >
                     <td className="py-4 px-4 sm:py-5 sm:px-8 flex items-center gap-3 sm:gap-5">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl flex items-center justify-center font-black text-sm sm:text-lg uppercase shadow-sm bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-110 transition-transform">
                           {(supplier.displayName || '??').substring(0,2)}
                        </div>
                        <div className="min-w-0">
                           <p className="font-black text-slate-800 text-sm sm:text-[16px] truncate">{supplier.displayName}</p>
                           <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 sm:mt-1 flex items-center gap-1.5 truncate">
                             <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                             {supplier.displayPhone || 'No Phone Number'}
                           </p>
                        </div>
                     </td>
                     <td className="py-4 px-4 sm:py-5 sm:px-8 text-right">
                        <div className="flex flex-col items-end gap-1 sm:gap-1.5">
                           <span className="font-black text-[15px] sm:text-[17px] text-slate-800 whitespace-nowrap">{supplier.amountText}</span>
                           {supplier.balance > 0 ? (
                             <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg shadow-sm bg-rose-100 text-rose-700 border border-rose-200/50 whitespace-nowrap">
                               You'll Give
                             </span>
                           ) : (
                             <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md whitespace-nowrap">Settled</span>
                           )}
                        </div>
                     </td>
                     <td className="py-4 px-3 sm:py-5 sm:px-8 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-amber-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                           <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
