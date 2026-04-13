import React, { useState, useMemo } from 'react';
import { useCustomers, useSuppliers } from '../context/PartiesContext';
import { useBills } from '../context/BillContext';
import { Search, Users, ChevronRight, Plus } from 'lucide-react';
import { calculateCustomerBalance, calculateSupplierBalance } from '../utils/ledger';
import CustomerLedger from './CustomerLedger';
import SupplierLedger from './SupplierLedger';

export default function Parties() {
  const { customers = [] } = useCustomers() || {};
  const { suppliers = [] } = useSuppliers() || {};
  const { ledger = [] } = useBills() || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParty, setSelectedParty] = useState(null); // { type: 'customer'|'supplier', party: object }

  const parties = useMemo(() => {
    const list = [];
    
    customers.forEach(c => {
      const balance = parseFloat(calculateCustomerBalance(ledger, c.id, c) || 0);
      list.push({
        ...c,
        partyType: 'customer',
        displayName: c.name || 'Unnamed Customer',
        displayPhone: c.phone || '',
        balance: balance,
        // For customers, positive balance means "We will get" (receivable)
        // If balance > 0 => You'll Get (green). Wait, logic in CustomerLedger: 
        // outstanding > 0 ? 'text-red-500' in ledger, but here "You'll Get" is positive for the shop owner!
        // So balance > 0 means the customer owes us -> "You'll Get".
        showRed: false, // "You'll Get" is green
        isReceivable: balance > 0,
        amountText: `₹${Math.abs(balance).toFixed(2)}`
      });
    });

    suppliers.forEach(s => {
      const balance = parseFloat(calculateSupplierBalance(ledger, s.id) || 0);
      list.push({
        ...s,
        partyType: 'supplier',
        displayName: s.name || s.businessName || 'Unnamed Supplier',
        displayPhone: s.phone || '',
        balance: balance,
        // For suppliers, positive balance means "We have to give" (payable)
        // If balance > 0 => You'll Give (red).
        showRed: true,
        isReceivable: false,
        amountText: `₹${Math.abs(balance).toFixed(2)}`
      });
    });

    // Sort by name
    return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [customers, suppliers, ledger]);

  const filteredParties = useMemo(() => {
    if (!searchTerm) return parties;
    const lowerQ = searchTerm.toLowerCase();
    return parties.filter(p => 
      p.displayName.toLowerCase().includes(lowerQ) || 
      p.displayPhone.includes(lowerQ)
    );
  }, [parties, searchTerm]);

  // If a party is selected, render their respective ledger component
  if (selectedParty) {
    if (selectedParty.partyType === 'customer') {
      return <CustomerLedger overrideCustomer={selectedParty} onBack={() => setSelectedParty(null)} />;
    } else {
      return <SupplierLedger overrideSupplier={selectedParty} onBack={() => setSelectedParty(null)} />;
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] relative w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Parties</h2>
          <p className="text-slate-500 text-sm mt-1">Manage customers and suppliers.</p>
        </div>
      </div>

      <div className="search-wrapper bg-white p-2.5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
        <Search size={20} className="search-icon text-slate-400 flex-shrink-0" />
        <input 
          type="text" 
          placeholder="Search parties by name or phone..." 
          className="search-input flex-1 py-1.5 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium bg-transparent pl-0"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 h-full custom-scrollbar">
          {parties.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 text-center">
              <div className="bg-slate-50 p-6 rounded-full mb-4 text-slate-300">
                <Users size={48} />
              </div>
              <p className="font-bold text-slate-700 text-xl">No parties yet</p>
              <p className="text-sm mt-2 font-medium">Add customers by billing them, and suppliers from the ledger.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Party Name</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {filteredParties.map(party => (
                  <tr 
                    key={party.id + party.partyType} 
                    onClick={() => setSelectedParty(party)}
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                  >
                     <td className="py-4 px-6 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase shadow-sm ${party.partyType === 'customer' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                           {(party.displayName || '??').substring(0,2)}
                        </div>
                        <div>
                           <p className="font-bold text-slate-800 text-[15px]">{party.displayName}</p>
                           <p className="text-xs font-medium text-slate-500 mt-0.5">{party.displayPhone || 'No Phone'}</p>
                        </div>
                     </td>
                     <td className="py-4 px-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${party.partyType === 'customer' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                           {party.partyType}
                        </span>
                     </td>
                     <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end gap-1">
                           <span className="font-black text-[15px] text-slate-800">{party.amountText}</span>
                           {party.balance > 0 && (
                             <span className={`text-[10px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${!party.showRed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                               {!party.showRed ? "You'll Get" : "You'll Give"}
                             </span>
                           )}
                           {party.balance === 0 && (
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Settled</span>
                           )}
                        </div>
                     </td>
                     <td className="py-4 px-6 text-center">
                        <div className="flex justify-center text-slate-300 group-hover:text-indigo-600 transition-colors">
                           <ChevronRight size={20} />
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
