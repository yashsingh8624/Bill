import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export default function PaymentOut() {
  const navigate = useNavigate();
  const { suppliers = [], addSupplierPayment } = useAppContext();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    supplierId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [suppliers, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplierId) return showToast('Please select a supplier', 'error');
    if (!formData.amount || formData.amount <= 0) return showToast('Enter valid amount', 'error');
    
    setIsSubmitting(true);
    try {
      if (addSupplierPayment) {
        await addSupplierPayment(formData.supplierId, parseFloat(formData.amount), formData.date, formData.notes || 'Payment Made');
      } else {
         throw new Error('API not bound');
      }
      showToast('Payment recorded successfully', 'success');
      navigate(-1);
    } catch (error) {
      showToast('Failed to record payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  return (
    <div className="page-animate w-full px-4 sm:px-8 max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl pb-24 space-y-6 flex flex-col min-w-0 pt-2 sm:pt-4" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors">
             <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Payment Out</h1>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Record money paid</p>
          </div>
        </div>
      </div>

      <div className="card p-6 flex-1 flex flex-col bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 rounded-3xl shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          
          <div className="md:col-span-2">
             <label className="text-gray-700 dark:text-gray-300 block text-xs font-bold uppercase tracking-wider mb-2">Select Supplier <span className="text-rose-500">*</span></label>
             {!formData.supplierId ? (
                <div className="space-y-3">
                   <div className="relative search-wrapper">
                      <Search size={18} className="search-icon absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="search-clean w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-rose-500 outline-none font-bold text-slate-700 dark:text-slate-100 transition-all" placeholder="Search supplier..." />
                   </div>
                   <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-600 rounded-xl dark:bg-slate-800 bg-white">
                      {filteredSuppliers.length === 0 && <p className="p-4 text-center text-slate-400 text-sm font-bold">No suppliers found</p>}
                      {filteredSuppliers.map(s => (
                         <div key={s.id} onClick={() => setFormData({...formData, supplierId: s.id})} className="p-3 border-b border-slate-50 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer font-bold text-slate-700 dark:text-slate-300 transition-colors">{s.name}</div>
                      ))}
                   </div>
                </div>
             ) : (
                <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/40 border border-rose-100 dark:border-rose-800/50 rounded-xl">
                   <span className="font-black text-rose-800 dark:text-rose-400">{suppliers.find(s => s.id === formData.supplierId)?.name}</span>
                   <button type="button" onClick={() => setFormData({...formData, supplierId: ''})} className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 uppercase">Change</button>
                </div>
             )}
          </div>

          <div>
             <label className="text-gray-700 dark:text-gray-300 block text-xs font-bold uppercase tracking-wider mb-2">Amount Paid (₹) <span className="text-rose-500">*</span></label>
             <div className="relative">
                <input 
                  required 
                  type="number" 
                  step="any" 
                  min="1" 
                  value={formData.amount || ''} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                  onFocus={(e) => e.target.select()}
                  className="w-full px-4 py-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-black text-2xl text-rose-700 dark:text-rose-400 placeholder-rose-300 transition-all outline-none" 
                  placeholder="Enter amount" 
                />
             </div>
          </div>

          <div>
            <label className="text-gray-700 dark:text-gray-300 block text-xs font-bold uppercase tracking-wider mb-2">Date</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-rose-500 outline-none font-bold text-slate-700 dark:text-slate-100 transition-all" />
          </div>

          <div>
            <label className="text-gray-700 dark:text-gray-300 block text-xs font-bold uppercase tracking-wider mb-2">Notes</label>
            <input type="text" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-rose-500 outline-none font-bold text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all" placeholder="Optional notes..." />
          </div>

          <button disabled={isSubmitting || !formData.supplierId} type="submit" className="w-full md:col-span-2 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-[0_4px_12px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100">
             {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} strokeWidth={3} /> Save Payment</>}
          </button>
        </form>
      </div>
    </div>
  );
}
