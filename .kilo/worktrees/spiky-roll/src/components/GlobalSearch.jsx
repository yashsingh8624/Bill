import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Package, Users, Receipt, Command, ArrowRight } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useCustomers } from '../context/PartiesContext';
import { useBills } from '../context/BillContext';

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ products: [], customers: [], bills: [] });
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const { products } = useInventory();
  const { customers } = useCustomers();
  const { bills } = useBills();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(true); // This hack depends on how Layout handles it, better to use a dedicated toggle
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], customers: [], bills: [] });
      return;
    }

    const q = query.toLowerCase();
    setResults({
      products: products.filter(p => p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)).slice(0, 5),
      customers: customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 5),
      bills: bills.filter(b => b.invoiceNo?.toLowerCase().includes(q) || b.customerName?.toLowerCase().includes(q)).slice(0, 5)
    });
  }, [query, products, customers, bills]);

  if (!isOpen) return null;

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 backdrop-blur-sm bg-slate-900/40 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-4 border-b border-slate-100 gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, customers, or bills... (Esc to close)"
            className="search-clean flex-1 text-lg outline-none text-slate-700 placeholder:text-slate-400 font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-medium text-slate-500">
              <span className="text-xs">ESC</span>
            </kbd>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {!query && (
            <div className="p-12 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Command size={32} />
              </div>
              <h3 className="text-slate-600 font-bold">Quick Search</h3>
              <p className="text-slate-400 text-sm mt-1">Start typing to find anything in SmartBill Pro</p>
            </div>
          )}

          {query && results.products.length === 0 && results.customers.length === 0 && results.bills.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium">
              No results found for "{query}"
            </div>
          )}

          {results.products.length > 0 && (
            <div className="mb-4">
              <h4 className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Products</h4>
              {results.products.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(`/products`)}
                  className="w-full flex items-center gap-4 px-3 py-3 hover:bg-indigo-50 rounded-xl transition-colors text-left group"
                >
                  <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg group-hover:bg-white transition-colors">
                    <Package size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">Stock: {p.quantity} | Price: ₹{p.sellingPrice || p.price}</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          )}

          {results.customers.length > 0 && (
            <div className="mb-4">
              <h4 className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customers</h4>
              {results.customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(`/customers`)}
                  className="w-full flex items-center gap-4 px-3 py-3 hover:bg-indigo-50 rounded-xl transition-colors text-left group"
                >
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg group-hover:bg-white transition-colors">
                    <Users size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone || 'No phone'} | Balance: ₹{(c.balance || 0).toFixed(2)}</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          )}

          {results.bills.length > 0 && (
            <div className="mb-2">
              <h4 className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Bills</h4>
              {results.bills.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSelect(`/bills`)}
                  className="w-full flex items-center gap-4 px-3 py-3 hover:bg-indigo-50 rounded-xl transition-colors text-left group"
                >
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-lg group-hover:bg-white transition-colors">
                    <Receipt size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">#{b.invoiceNo}</p>
                    <p className="text-xs text-slate-500">{b.customerName} | ₹{(b.grandTotal || b.total).toFixed(2)}</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <div className="flex gap-4">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Product</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Customer</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Invoice</span>
           </div>
           <span>SmartBill OS v1.1</span>
        </div>
      </div>
    </div>
  );
}
