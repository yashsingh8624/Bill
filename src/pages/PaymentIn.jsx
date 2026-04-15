import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee as RupeeIcon, Check, ArrowLeft, Search as SearchIcon, Plus, ArrowDownRight, Smartphone, Banknote, FileText, History } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { calculateCustomerRawBalance } from '../utils/ledger';

export default function PaymentIn() {
  const navigate = useNavigate();
  const { customers = [], ledger = [], addCustomerPayment, addCustomer } = useAppContext();
  const { showToast } = useToast();
  
  // Calculate default receipt number
  const paymentReceiptNo = useMemo(() => {
    const defaultPrefix = 'REC-';
    const num = ledger.filter(l => l.type === 'PAYMENT').length + 1000;
    return defaultPrefix + num;
  }, [ledger]);

  const initialState = {
    customerId: '',
    customerSearch: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    paymentMethod: 'Cash',
    receiptNo: paymentReceiptNo
  };

  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update receipt number if ledger size changes
  useEffect(() => {
    if (!formData.receiptNo || formData.receiptNo.startsWith('REC-')) {
       setFormData(prev => ({ ...prev, receiptNo: paymentReceiptNo }));
    }
  }, [paymentReceiptNo, formData.receiptNo]);

  // Derived Values
  const filteredCustomers = useMemo(() => {
    if (!formData.customerSearch) return [];
    return customers.filter(c => (c.name || '').toLowerCase().includes(formData.customerSearch.toLowerCase()));
  }, [customers, formData.customerSearch]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === formData.customerId) || null;
  }, [customers, formData.customerId]);

  const currentBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    return calculateCustomerRawBalance(ledger, selectedCustomer.id, selectedCustomer);
  }, [selectedCustomer, ledger]);

  const paymentHistory = useMemo(() => {
    return ledger.filter(l => l.type === 'PAYMENT' && !l.is_void)
                 .sort((a,b) => new Date(b.date) - new Date(a.date))
                 .slice(0, 10);
  }, [ledger]);

  // Handlers
  const handleCreateCustomer = async () => {
    if (!formData.customerSearch.trim()) return showToast('Enter customer name', 'error');
    setIsSubmitting(true);
    try {
      const newC = await addCustomer({ name: formData.customerSearch.trim() });
      if (newC) {
        setFormData(prev => ({ ...prev, customerId: newC.id, customerSearch: '' }));
        showToast('Customer created', 'success');
      }
    } catch (e) {
      showToast('Error creating customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) return showToast('Please select a customer', 'error');
    if (!formData.amount || parseFloat(formData.amount) <= 0) return showToast('Enter valid amount', 'error');
    
    setIsSubmitting(true);
    try {
      if (addCustomerPayment) {
        await addCustomerPayment(
          formData.customerId, 
          parseFloat(formData.amount), 
          formData.date, 
          formData.notes,
          formData.paymentMethod,
          formData.receiptNo,
          selectedCustomer?.name || ''
        );
      } else {
        throw new Error('API not bound');
      }
      showToast('Payment saved! Ready for next entry.', 'success');
      // Fast entry reset
      setFormData(prev => ({
        ...initialState,
        receiptNo: paymentReceiptNo // keeping updated receipt
      }));
    } catch (error) {
      showToast('Failed to record payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-animate w-full px-4 sm:px-0 max-w-2xl mx-auto pb-24 space-y-6 flex flex-col pt-2 sm:pt-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
             <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
               Payment In <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Collection</span>
            </h1>
            <p className="text-sm font-bold text-slate-500">Record money received from customers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* FORM SECTION */}
        <div className="md:col-span-3 space-y-4">
          <div className="card p-5 sm:p-6 shadow-sm border-emerald-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Receipt & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Receipt No</label>
                    <div className="relative">
                      <input type="text" value={formData.receiptNo || ''} onChange={(e) => setFormData({...formData, receiptNo: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-slate-700 text-sm" placeholder="Enter receipt no" />
                    </div>
                  </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                   <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-slate-700 text-sm" />
                 </div>
              </div>

              {/* Customer Search & Preview */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Customer Name <span className="text-rose-500">*</span></span>
                    {selectedCustomer && <button type="button" onClick={() => setFormData({...formData, customerId: ''})} className="text-emerald-600 hover:text-emerald-700 text-[10px]">CHANGE</button>}
                 </label>
                 
                 {!selectedCustomer ? (
                     <div className="space-y-2 relative">
                        <div className="relative search-wrapper">
                           <SearchIcon size={18} className="search-icon absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                           <input type="text" value={formData.customerSearch} onChange={(e) => setFormData({...formData, customerSearch: e.target.value})} className="search-clean w-full pl-11 pr-4 py-3.5 bg-white border-2 border-emerald-100 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-black text-slate-800 shadow-sm transition-all" placeholder="Search customer by name..." autoComplete="off" />
                        </div>
                        
                        {formData.customerSearch && (
                          <div className="max-h-52 overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl bg-white shadow-xl absolute left-0 right-0 top-full mt-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                             {filteredCustomers.length === 0 ? (
                                <div className="p-4 flex flex-col items-center justify-center gap-2">
                                   <span className="text-sm font-bold text-slate-500">Not found in database</span>
                                   <button type="button" onClick={handleCreateCustomer} disabled={isSubmitting} className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-emerald-200 active:scale-95 transition-all">
                                     <Plus size={16} /> Add "{formData.customerSearch}"
                                   </button>
                                </div>
                             ) : (
                                filteredCustomers.map(c => (
                                   <div key={c.id} onClick={() => setFormData({...formData, customerId: c.id, customerSearch: ''})} className="p-4 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer flex items-center justify-between group last:border-0 transition-colors">
                                      <span className="font-bold text-slate-700 group-hover:text-emerald-700">{c.name}</span>
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase group-hover:bg-emerald-200 group-hover:text-emerald-700 transition-colors">Select</span>
                                   </div>
                                ))
                             )}
                          </div>
                        )}
                     </div>
                 ) : (
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl shadow-lg relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -z-0"></div>
                       <div className="relative z-10 flex flex-col">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Selected Party</span>
                          <span className="font-black text-xl text-white tracking-tight">{selectedCustomer.name}</span>
                       </div>
                       <div className="relative z-10 text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Current Balance</span>
                          <span className={`font-black tracking-tight text-lg flex items-baseline justify-end gap-0.5
                            ${currentBalance > 0 ? 'text-emerald-400' : currentBalance < 0 ? 'text-rose-400' : 'text-slate-300'}
                          `}>
                            <span className="opacity-80 text-sm">₹</span>
                            {Math.abs(currentBalance).toLocaleString('en-IN')}
                            <span className="text-[10px] ml-1 uppercase">{currentBalance > 0 ? '(Adv)' : currentBalance < 0 ? '(Due)' : ''}</span>
                          </span>
                       </div>
                    </div>
                 )}
              </div>

              {/* Amount Entry */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Received Amount (₹) <span className="text-rose-500">*</span></label>
                 <div className="relative">
                    <input 
                      required 
                      type="number" 
                      step="any" 
                      min="1" 
                      value={formData.amount || ''} 
                      onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                      onFocus={(e) => e.target.select()}
                      className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 font-black text-3xl text-emerald-600 placeholder-emerald-200 transition-all outline-none shadow-sm" 
                      placeholder="Enter amount" 
                    />
                 </div>
                 {formData.amount && currentBalance < 0 && (
                   <p className="mt-2 text-xs font-bold text-slate-500">
                     New Balance: ₹{Math.abs(currentBalance + parseFloat(formData.amount || 0)).toLocaleString('en-IN')} 
                     {currentBalance + parseFloat(formData.amount || 0) < 0 ? ' (Due)' : ' (Adv)'}
                   </p>
                 )}
              </div>

              {/* Payment Method Tabs */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Mode</label>
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                   {['Cash', 'UPI', 'Bank'].map(method => (
                     <button
                       key={method}
                       type="button"
                       onClick={() => setFormData({...formData, paymentMethod: method})}
                       className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-all
                         ${formData.paymentMethod === method ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}
                       `}
                     >
                       {method === 'Cash' ? <Banknote size={16} /> : method === 'UPI' ? <Smartphone size={16} /> : <RupeeIcon size={16} />}
                       {method}
                     </button>
                   ))}
                 </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                <input type="text" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 outline-none font-bold text-slate-700 placeholder-slate-400 text-sm" placeholder="Optional notes... e.g. Bill payment" />
              </div>

              <div className="pt-4">
                <button disabled={isSubmitting || !formData.customerId || !formData.amount} type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 text-lg tracking-wide uppercase">
                   {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={24} strokeWidth={3} /> Save Entry</>}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* RECENT TRANSACTIONS SIDEBAR */}
        <div className="md:col-span-2">
           <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
             <History size={16} /> Recent Receipts
           </h3>
           <div className="card p-0 flex flex-col divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
              {paymentHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No recent entries</div>
              ) : (
                paymentHistory.map((txn, idx) => (
                  <div key={txn.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                           <ArrowDownRight size={16} strokeWidth={3} />
                        </div>
                        <div className="overflow-hidden pr-2">
                           <h4 className="font-bold text-slate-800 text-sm truncate max-w-[120px] sm:max-w-[140px]">
                              {txn.customer_name || customers.find(c => c.id === txn.customer_id)?.name || 'Unknown'}
                           </h4>
                           <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(txn.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                        </div>
                     </div>
                     <div className="text-right shrink-0">
                        <div className="font-black text-emerald-600 text-sm flex items-baseline justify-end gap-0.5 tracking-tight">
                           <span className="text-[10px] font-bold opacity-80">+₹</span>
                           {Math.abs(parseFloat(txn.amount)).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Payment In</div>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
        
      </div>
    </div>
  );
}
