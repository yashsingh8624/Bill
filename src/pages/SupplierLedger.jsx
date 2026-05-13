import React, { useState, useMemo } from 'react';
import { useSuppliers } from '../context/PartiesContext';
import { useSettings } from '../context/SettingsContext';
import { Truck, Search, IndianRupee, MessageCircle, ChevronRight, Plus, X, PackageOpen, LayoutList, Edit2, Trash2, RefreshCcw } from 'lucide-react';
import { useBills } from '../context/BillContext';
import { getFilteredLedger, calculateSupplierBalance } from '../utils/ledger';

export default function SupplierLedger({ overrideSupplier = null, onBack = null }) {
  const suppliersRes = useSuppliers() || {};
  const { ledger = [], refreshLedger, loading: ledgerLoading } = useBills() || {};
  const suppliers = Array.isArray(suppliersRes.suppliers) ? suppliersRes.suppliers : [];
  const { addSupplier, updateSupplier, deleteSupplier, addSupplierPayment, addSupplierInvoice } = suppliersRes;
  
  const { userSettings = {} } = useSettings() || {};
  
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelectedSupplier, setInternalSelectedSupplier] = useState(null);
  
  const selectedSupplier = overrideSupplier || internalSelectedSupplier;
  const setSelectedSupplier = (val) => {
    if (!val && onBack) {
      onBack();
    } else {
      setInternalSelectedSupplier(val);
    }
  };
  
  // Modals
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', businessName: '', openingBalance: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', businessName: '', openingBalance: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });

  const filteredSuppliers = suppliers.filter(s => 
    s && (
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.businessName && s.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const currentSupplier = selectedSupplier ? suppliers.find(s => s && s.id === selectedSupplier.id) : null;
  const supplierTxns = currentSupplier ? (getFilteredLedger(ledger, currentSupplier.id, 'supplier') || []) : [];
  const currentSupplierBalance = currentSupplier ? parseFloat(calculateSupplierBalance(ledger, currentSupplier.id, currentSupplier) || 0) : 0;

  const handleOpenSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setEditForm({ name: supplier.name || '', phone: supplier.phone || '', businessName: supplier.businessName || '', openingBalance: supplier.openingBalance || supplier.previous_balance || '' });
  };

  const handleAddSupplier = async (e) => {
    if (e) e.preventDefault();
    if (!supplierForm.name || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await addSupplier({
        name: supplierForm.name,
        phone: supplierForm.phone,
        businessName: supplierForm.businessName,
        openingBalance: supplierForm.openingBalance || 0,
        type: 'supplier',
        createdAt: new Date().toISOString()
      });
      setIsAddSupplierModalOpen(false);
      setSupplierForm({ name: '', phone: '', businessName: '', openingBalance: '' });
    } catch (error) {
       console.error('Failed to add supplier:', error);
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const updData = { ...editForm, previous_balance: editForm.openingBalance, openingBalance: editForm.openingBalance };
    updateSupplier(selectedSupplier.id, updData);
    setIsEditModalOpen(false);
  };

  const handleDelete = () => {
    if (!selectedSupplier) return;
    if (window.confirm(`Are you sure you want to delete ${selectedSupplier.name}? Their transactions will remain orphaned.`)) {
       deleteSupplier(selectedSupplier.id);
       setSelectedSupplier(null);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentForm.amount) return;
    addSupplierPayment(selectedSupplier.id, paymentForm.amount, paymentForm.date, paymentForm.note);
    setIsPaymentModalOpen(false);
    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], note: 'Payment Made' });
  };

  const handleInvoiceSubmit = (e) => {
    e.preventDefault();
    if (!selectedSupplier || !invoiceForm.amount) return;
    addSupplierInvoice(selectedSupplier.id, invoiceForm.amount, invoiceForm.date, invoiceForm.note, invoiceForm.invoiceNo);
    setIsInvoiceModalOpen(false);
    setInvoiceForm({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  };

  const handleSendWhatsApp = () => {
    if (!currentSupplier || !currentSupplier.phone) return;
    const amount = currentSupplierBalance;
    const phone = currentSupplier.phone.startsWith('+91') ? currentSupplier.phone : `+91${currentSupplier.phone}`;
    
    let message = '';
    if (amount > 0) {
       message = `Dear ${currentSupplier.name},\nWe have an outstanding balance of â‚¹${amount.toFixed(2)} with you. Please share your UPI or Bank details to clear the payment.\n- ${userSettings.businessName}`;
    } else {
       message = `Dear ${currentSupplier.name},\nThis is to notify regarding our transactions.\n- ${userSettings.businessName}`;
    }
    const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 flex flex-col w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 min-w-0" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      {!selectedSupplier ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Party / Supplier Ledger</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage suppliers, track purchases, and payments.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={refreshLedger}
                disabled={ledgerLoading}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-4 py-2.5 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCcw size={16} className={ledgerLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{ledgerLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <button 
                onClick={() => setIsAddSupplierModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
              >
                <Plus size={18} /> Add Supplier
              </button>
            </div>
          </div>
               </div>
            </div>
          </div>
        )
      )}
{/* EDIT MODAL */}
      {isEditModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-600 animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-600" /> Edit Supplier
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
               <div>
                  <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5">Supplier Name</label>
                  <input type="text" required value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium" />
               </div>
               <div>
                  <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5">Business / Company</label>
                  <input type="text" value={editForm.businessName} onChange={(e) => setEditForm({...editForm, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium" />
               </div>
               <div>
                  <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5">Phone Number</label>
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium" />
               </div>
               <div>
                  <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5">Opening Balance</label>
                  <div className="relative search-wrapper">
                    <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 search-icon" />
                    <input 
                      type="number" step="0.01" 
                      value={editForm.openingBalance} 
                      onChange={(e) => setEditForm({...editForm, openingBalance: e.target.value})} 
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold outline-none search-clean" 
                      placeholder="0.00"
                    />
                  </div>
               </div>
               <div className="pt-4"><button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-colors">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER MODAL */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Truck size={18} className="text-indigo-600" /> Add New Supplier</h3>
              <button onClick={() => setIsAddSupplierModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Supplier Name</label>
                <input type="text" required value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 transition-colors duration-300 font-medium text-slate-800 dark:text-slate-100 transition-colors duration-300" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Business Name</label>
                <input type="text" value={supplierForm.businessName} onChange={(e) => setSupplierForm({...supplierForm, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 transition-colors duration-300 font-medium text-slate-800 dark:text-slate-100 transition-colors duration-300" placeholder="Acme Logistics Ltd." />
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Phone Number</label>
                <input type="text" value={supplierForm.phone} onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 transition-colors duration-300 font-medium text-slate-800 dark:text-slate-100 transition-colors duration-300" placeholder="9876543210" />
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Opening Balance</label>
                <div className="relative search-wrapper">
                  <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 search-icon" />
                  <input 
                    type="number" step="0.01" 
                    value={supplierForm.openingBalance} 
                    onChange={(e) => setSupplierForm({...supplierForm, openingBalance: e.target.value})} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-slate-800 transition-colors duration-300 font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300 outline-none search-clean" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="px-5 py-3 text-slate-600 dark:text-slate-400 transition-colors duration-300 font-bold hover:bg-slate-100 rounded-xl transition-colors w-full">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-md transition-colors shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{/* RECORD PURCHASE/INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-amber-100 flex justify-between items-center bg-amber-50">
              <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2"><PackageOpen size={18} className="text-amber-600" /> Record Purchase Bill</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-amber-400 hover:text-amber-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Invoice Amount</label>
                <div className="relative search-wrapper">
                  <IndianRupee size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 search-icon" />
                  <input 
                    type="number" required min="1" step="0.01" 
                    value={invoiceForm.amount} 
                    onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-2 focus:outline-none focus:ring-amber-500/50 focus:border-amber-500 bg-white dark:bg-slate-800 transition-colors duration-300 font-black text-amber-600 text-xl shadow-inner search-clean" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Inv No</label>
                  <input type="text" value={invoiceForm.invoiceNo} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-amber-500/50 bg-white dark:bg-slate-800 transition-colors duration-300 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-medium" placeholder="#123" />
                </div>
                <div>
                  <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Date</label>
                  <input type="date" required value={invoiceForm.date} onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-amber-500/50 bg-white dark:bg-slate-800 transition-colors duration-300 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-medium" />
                </div>
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Notes</label>
                <input type="text" value={invoiceForm.note} onChange={(e) => setInvoiceForm({...invoiceForm, note: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:ring-amber-500/50 bg-white dark:bg-slate-800 transition-colors duration-300 text-slate-700 dark:text-slate-300 transition-colors duration-300 font-medium" placeholder="E.g. Received new stock" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl shadow-md transition-colors shadow-amber-500/30 text-lg">Save Purchase Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAKE PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><IndianRupee size={18} className="text-indigo-600" /> Send Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-indigo-400 hover:text-indigo-600"><X size={20} /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 border border-slate-200 dark:border-slate-700 transition-colors duration-300 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">To Supplier</p>
                <p className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 text-xl">{currentSupplier?.name}</p>
                <div className="mt-2 text-sm bg-white dark:bg-slate-800 transition-colors duration-300 border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 inline-block px-3 py-1 rounded-lg">
                   Pending: <span className="font-black text-amber-500">â‚¹{currentSupplierBalance.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Amount Sent</label>
                <div className="relative search-wrapper">
                  <IndianRupee size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 search-icon" />
                  <input 
                    type="number" required min="1" step="0.01" 
                    value={paymentForm.amount} 
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-white dark:bg-slate-800 transition-colors duration-300 font-black text-emerald-600 text-xl shadow-inner search-clean" 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Date</label>
                <input type="date" required value={paymentForm.date} onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 bg-white dark:bg-slate-800 transition-colors duration-300 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-medium" />
              </div>
              <div>
                <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold transition-colors duration-300 mb-1.5">Note</label>
                <input type="text" value={paymentForm.note} onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 bg-white dark:bg-slate-800 transition-colors duration-300 text-slate-700 dark:text-slate-300 transition-colors duration-300 font-medium" placeholder="E.g. Bank Transfer Ref 123" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-md transition-colors shadow-indigo-600/30 text-lg">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );