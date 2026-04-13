import React, { useState, useMemo } from 'react';
import { useCustomers } from '../context/PartiesContext';
import { useBills } from '../context/BillContext';
import { Search, Users, ChevronRight, Plus, ArrowLeft } from 'lucide-react';
import { calculateCustomerBalance } from '../utils/ledger';
import CustomerLedger from './CustomerLedger';
import { useNavigate } from 'react-router-dom';

export default function Customers() {
  const navigate = useNavigate();
  const { customers = [], loading } = useCustomers() || {};
  const { ledger = [] } = useBills() || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const processedCustomers = useMemo(() => {
    return customers.map(c => {
      const balance = parseFloat(calculateCustomerBalance(ledger, c.id, c) || 0);
      return {
        ...c,
        displayName: c.name || 'Unnamed Customer',
        displayPhone: c.phone || '',
        balance: balance,
        isReceivable: balance > 0,
        amountText: `₹${Math.abs(balance).toFixed(2)}`
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [customers, ledger]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return processedCustomers;
    const lowerQ = searchTerm.toLowerCase();
    return processedCustomers.filter(p => 
      p.displayName.toLowerCase().includes(lowerQ) || 
      p.displayPhone.includes(lowerQ)
    );
  }, [processedCustomers, searchTerm]);

  if (selectedCustomer) {
    return <CustomerLedger overrideCustomer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">Loading Customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 flex flex-col h-[calc(100vh-8rem)] relative w-full max-w-full overflow-hidden page-animate px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-200">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Customers</h2>
            <p className="text-slate-500 text-xs sm:text-sm font-bold">Manage your customer relationships and balances.</p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/add-party?role=customer')}
          className="flex items-center justify-center w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl sm:rounded-2xl font-black shadow-lg shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={20} strokeWidth={3} /> Add Customer
        </button>
      </div>

      <div className="search-wrapper bg-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 flex-shrink-0 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
        <Search size={18} className="search-icon text-slate-400 flex-shrink-0 sm:w-5 sm:h-5" />
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          className="search-input flex-1 py-1.5 focus:outline-none text-sm sm:text-base text-slate-700 placeholder:text-slate-400 font-bold bg-transparent pl-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 h-full custom-scrollbar w-full max-w-full">
          {processedCustomers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 text-center">
              <div className="bg-slate-50 p-8 rounded-full mb-4 text-slate-300 border border-slate-100">
                <Users size={64} strokeWidth={1.5} />
              </div>
              <p className="font-black text-slate-800 text-2xl">No customers found</p>
              <p className="text-sm mt-2 font-bold text-slate-400 max-w-xs">Start adding customers to track their purchases and payments.</p>
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[450px] sm:min-w-[600px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-[9px] sm:text-[10px] uppercase font-black tracking-widest">
                  <th className="py-4 px-4 sm:py-5 sm:px-8">Customer Details</th>
                  <th className="py-4 px-4 sm:py-5 sm:px-8 text-right">Balance Amount</th>
                  <th className="py-4 px-3 sm:py-5 sm:px-8 text-center w-12 sm:w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredCustomers.map(customer => (
                  <tr 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="hover:bg-indigo-50/30 transition-all cursor-pointer group"
                  >
                     <td className="py-4 px-4 sm:py-5 sm:px-8 flex items-center gap-3 sm:gap-5">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-2xl flex items-center justify-center font-black text-sm sm:text-lg uppercase shadow-sm bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
                           {(customer.displayName || '??').substring(0,2)}
                        </div>
                        <div className="min-w-0">
                           <p className="font-black text-slate-800 text-sm sm:text-[16px] truncate">{customer.displayName}</p>
                           <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 sm:mt-1 flex items-center gap-1.5 truncate">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                             {customer.displayPhone || 'No Phone Number'}
                           </p>
                        </div>
                     </td>
                     <td className="py-4 px-4 sm:py-5 sm:px-8 text-right">
                        <div className="flex flex-col items-end gap-1 sm:gap-1.5">
                           <span className="font-black text-[15px] sm:text-[17px] text-slate-800 whitespace-nowrap">{customer.amountText}</span>
                           {customer.balance > 0 ? (
                             <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg shadow-sm bg-emerald-100 text-emerald-700 border border-emerald-200/50 whitespace-nowrap">
                               You'll Get
                             </span>
                           ) : (
                             <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md whitespace-nowrap">Settled</span>
                           )}
                        </div>
                     </td>
                     <td className="py-4 px-3 sm:py-5 sm:px-8 text-center">
                        <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
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
