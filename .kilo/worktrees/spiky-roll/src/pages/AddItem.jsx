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
    <div className="page-animate max-w-lg mx-auto pb-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Add Item</h1>
          <p className="text-sm font-bold text-slate-500">New Product or Service</p>
        </div>
      </div>

      <div className="card p-6 flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Name <span className="text-rose-500">*</span></label>
             <div className="relative">
                <input required autoFocus type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 placeholder-slate-400 transition-all outline-none" placeholder="Enter item name" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sale Price (₹) <span className="text-rose-500">*</span></label>
               <div className="relative">
                  <input required type="number" step="any" min="0" value={formData.sellingPrice || ''} onChange={(e) => setFormData({...formData, sellingPrice: e.target.value})} onFocus={(e) => e.target.select()} className="w-full px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-black text-emerald-700 placeholder-emerald-300 transition-all outline-none" placeholder="0.00" />
               </div>
             </div>
             
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Purchase Price (₹)</label>
               <div className="relative">
                  <input type="number" step="any" min="0" value={formData.purchasePrice || ''} onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})} onFocus={(e) => e.target.select()} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-bold text-slate-800 placeholder-slate-400 transition-all outline-none" placeholder="0.00" />
               </div>
             </div>
          </div>

          <button disabled={isSubmitting} type="submit" className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 mt-8 disabled:opacity-50 disabled:active:scale-100">
             {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} strokeWidth={3} /> Save Item</>}
          </button>
        </form>
      </div>
    </div>
  );
}
