import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, Check, ArrowLeft, Users, Truck, IndianRupee } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

export default function AddParty() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addCustomer, addSupplier } = useAppContext();
  const { showToast } = useToast();
  
  // If ?role=customer or ?role=supplier is passed, lock to that role
  const lockedRole = searchParams.get('role');
  const isRoleLocked = lockedRole === 'customer' || lockedRole === 'supplier';
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    businessName: '',
    openingBalance: '',
    role: lockedRole || 'customer'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCustomer = formData.role === 'customer';
  const title = isCustomer ? 'Add Customer' : 'Add Supplier';
  const subtitle = isCustomer ? 'New customer for your business' : 'New supplier / vendor';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return showToast('Name is required', 'error');
    
    setIsSubmitting(true);
    try {
      if (formData.role === 'customer') {
        await addCustomer({ 
          name: formData.name, 
          phone: formData.phone, 
          openingBalance: formData.openingBalance || 0,
          type: 'customer' 
        });
      } else {
        await addSupplier({ 
          name: formData.name, 
          phone: formData.phone, 
          businessName: formData.businessName,
          openingBalance: formData.openingBalance || 0,
          type: 'supplier' 
        });
      }
      showToast(`${isCustomer ? 'Customer' : 'Supplier'} added successfully`, 'success');
      navigate(-1);
    } catch (error) {
      showToast('Failed to add party', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-animate w-full max-w-lg mx-auto px-4 sm:px-0 pb-24 sm:pb-6 flex flex-col" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            {isCustomer ? <Users size={22} className="text-indigo-600" /> : <Truck size={22} className="text-amber-600" />}
            {title}
          </h1>
          <p className="text-sm font-bold text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="card p-6 flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Only show role toggle if not locked from URL */}
          {!isRoleLocked && (
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
               <button type="button" onClick={() => setFormData({...formData, role: 'customer'})} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.role === 'customer' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Users size={16} /> Customer
               </button>
               <button type="button" onClick={() => setFormData({...formData, role: 'supplier'})} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${formData.role === 'supplier' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 <Truck size={16} /> Supplier
               </button>
            </div>
          )}

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isCustomer ? 'Customer' : 'Supplier'} Name <span className="text-rose-500">*</span></label>
             <div className="relative search-wrapper">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 search-icon" />
                <input required autoFocus type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 placeholder-slate-400 transition-all outline-none search-clean" placeholder={`Enter ${isCustomer ? 'customer' : 'supplier'} name`} />
             </div>
          </div>

          {formData.role === 'supplier' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Business / Company Name</label>
               <div className="relative">
                  <input type="text" value={formData.businessName || ''} onChange={(e) => setFormData({...formData, businessName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 placeholder-slate-400 transition-all outline-none" placeholder="Enter business name" />
               </div>
            </div>
          )}

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
             <div className="relative search-wrapper">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 search-icon" />
                <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/[^0-9+]/g, '')})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 placeholder-slate-400 transition-all outline-none search-clean" placeholder="Enter phone number" />
             </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Opening Balance</label>
             <div className="relative search-wrapper">
                <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 search-icon" />
                <input type="number" step="0.01" value={formData.openingBalance || ''} onChange={(e) => setFormData({...formData, openingBalance: e.target.value})} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-800 placeholder-slate-400 transition-all outline-none search-clean" placeholder="0.00" />
             </div>
          </div>

          <button disabled={isSubmitting} type="submit" className={`w-full py-3.5 ${isCustomer ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'} text-white font-black rounded-xl shadow-[0_4px_12px] flex items-center justify-center gap-2 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:active:scale-100`}>
             {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={20} strokeWidth={3} /> Save {isCustomer ? 'Customer' : 'Supplier'}</>}
          </button>
        </form>
      </div>
    </div>
  );
}
