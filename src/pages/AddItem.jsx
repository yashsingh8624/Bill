import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, IndianRupee, Check, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export default function AddItem() {
  const navigate = useNavigate();
  const { addProduct } = useAppContext();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    sellingPrice: '',
    purchasePrice: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return showToast('Item name is required', 'error');
    if (!formData.sellingPrice) return showToast('Selling price is required', 'error');
    
    setIsSubmitting(true);
    try {
      await addProduct({ 
        name: formData.name, 
        sellingPrice: formData.sellingPrice,
        purchasePrice: formData.purchasePrice || '0'
      });
      showToast('Item added successfully', 'success');
      navigate(-1);
    } catch (error) {
      showToast('Failed to add item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-animate w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl px-4 sm:px-8 pb-24 sm:pb-6 flex flex-col min-w-0" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Add Item</h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">New Product or Service</p>
        </div>
      </div>

      <div className="card p-6 flex-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 rounded-3xl shadow-sm">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="md:col-span-2">
             <label className="text-gray-700 dark:text-gray-300 block text-xs font-bold uppercase tracking-wider mb-2">Item Name <span className="text-rose-500">*</span></label>
             <div className="relative">
                <input required autoFocus type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none" placeholder="Enter item name" />
             </div>
          </div>

          <div>
             <label className="text-gray-700 dark:text-gray-300 block text-xs font-bold uppercase tracking-wider mb-2">Sale Price (₹) <span className="text-rose-500">*</span></label>
             <div className="relative">
                <input required type="number" step="any" min="0" value={formData.sellingPrice || ''} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} onFocus={(e) => e.target.select()} className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-black text-emerald-700 dark:text-emerald-400 placeholder-emerald-300 transition-all outline-none" placeholder="0.00" />
             </div>
          </div>
          
          <div>
             <label className="text-gray-700 dark:text-gray-300 block text-xs font-bold uppercase tracking-wider mb-2">Purchase Price (₹)</label>
             <div className="relative">
                <input type="number" step="any" min="0" value={formData.purchasePrice || ''} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} onFocus={(e) => e.target.select()} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all outline-none" placeholder="0.00" />
             </div>
          </div>

          <button disabled={isSubmitting} type="submit" className="w-full py-3.5 md:col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:active:scale-100">
             {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} strokeWidth={3} /> Save Item</>}
          </button>
        </form>
      </div>
    </div>
  );
}
