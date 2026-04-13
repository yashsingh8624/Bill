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
    setEditForm({ name: supplier.name, phone: supplier.phone || '', businessName: supplier.businessName || '', openingBalance: supplier.openingBalance || supplier.previous_balance || 0 });
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
       message = `Dear ${currentSupplier.name},\nWe have an outstanding balance of ₹${amount.toFixed(2)} with you. Please share your UPI or Bank details to clear the payment.\n- ${userSettings.businessName}`;
    } else {
       message = `Dear ${currentSupplier.name},\nThis is to notify regarding our transactions.\n- ${userSettings.businessName}`;
    }
    const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 flex flex-col min-h-screen sm:h-[calc(100vh-8rem)] relative w-full">
      {!selectedSupplier ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Party / Supplier Ledger</h2>
              <p className="text-slate-500 text-sm mt-1">Manage suppliers, track purchases, and payments.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={refreshLedger}
                disabled={ledgerLoading}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCcw size={16} className={ledgerLoading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{ledgerLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
              <button 
                onClick={() => setIsAddSupplierModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
              >
                <Plus size={18} /> Add Supplier
              </button>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or business..." 
              className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
              {suppliers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-4 text-slate-400">
                    <Truck size={40} />
                  </div>
                  <p className="font-bold text-slate-700 text-xl">No suppliers added yet</p>
                  <p className="text-sm mt-2 font-medium mb-5">Add your party/vendor details to track stock invoices.</p>
                  <button onClick={() => setIsAddSupplierModalOpen(true)} className="text-indigo-600 font-bold hover:text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-xl transition-colors">Add First Supplier</button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                    <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                      <th className="py-4 px-6">Supplier & Business</th>
                      <th className="py-4 px-6">Phone Number</th>
                      <th className="py-4 px-6 text-right">Amount To Pay (₹)</th>
                      <th className="py-4 px-6 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.map(supplier => (
                      <tr 
                        key={supplier.id} 
                        onClick={() => handleOpenSupplier(supplier)}
                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                      >
                         <td className="py-4 px-6 flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                              {(supplier.name || '??').substring(0,2)}
                           </div>
                           <div>
                             <div className="font-bold text-slate-800">{supplier.name || 'Unnamed Supplier'}</div>
                             <div className="text-xs font-medium text-slate-500">{supplier.businessName || 'No business specified'}</div>
                           </div>
                         </td>
                         <td className="py-4 px-6 text-slate-600 font-medium">{supplier.phone || '-'}</td>
                           <td className="py-4 px-6 text-right">
                             <span className={`font-black ${parseFloat(calculateSupplierBalance(ledger, supplier.id, supplier) || 0) > 0 ? 'text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100' : 'text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200'}`}>
                               ₹{parseFloat(calculateSupplierBalance(ledger, supplier.id, supplier) || 0).toFixed(2)}
                             </span>
                           </td>
                         <td className="py-4 px-6 text-center">
                            <div className="flex justify-center text-slate-400 group-hover:text-indigo-600 transition-colors bg-white border border-slate-200 group-hover:border-indigo-200 rounded-lg p-1.5 shadow-sm">
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
        </>
      ) : (
        currentSupplier && (
          <div className="flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-300 w-full pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedSupplier(null)}
                  className="p-2.5 text-slate-500 bg-white hover:bg-slate-50 shadow-sm rounded-xl transition-all border border-slate-200 hover:text-slate-800"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    {currentSupplier.name}
                    <button onClick={() => {
                        setEditForm({ name: currentSupplier.name, phone: currentSupplier.phone, businessName: currentSupplier.businessName });
                        setIsEditModalOpen(true);
                      }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit Supplier">
                       <Edit2 size={16} />
                    </button>
                    <button onClick={handleDelete} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Supplier">
                       <Trash2 size={16} />
                    </button>
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mt-0.5">{currentSupplier.businessName} {currentSupplier.phone && `| ${currentSupplier.phone}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={handleSendWhatsApp}
                  disabled={!currentSupplier.phone}
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-3 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-1.5 shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={16} /> WA Msg
                </button>
                <button 
                  onClick={() => {
                    setInvoiceForm({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
                    setIsInvoiceModalOpen(true);
                  }}
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 px-4 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-1.5 shadow-sm text-sm"
                >
                  <PackageOpen size={16} /> Record Bill
                </button>
                <button 
                  onClick={() => {
                    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
                    setIsPaymentModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 text-sm"
                >
                  <IndianRupee size={16} /> Make Payment
                </button>
              </div>
            </div>

            {(() => {
              const isPaymentOut = (t) => {
                const norm = String(t||'').toLowerCase().replace(/\s+/g, "_");
                return norm === 'payment_made' || norm === 'payment_out';
              };
              const totalBilled = supplierTxns.filter(t => t && (String(t.type).toLowerCase() === 'purchase' || String(t.type).toLowerCase() === 'supplier_opening')).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              const totalGiven = supplierTxns.filter(t => t && isPaymentOut(t.type)).reduce((s, e) => s + parseFloat(e.amount || 0), 0);
              
              // NEW Correct Logic for Outstanding:
              const openingBalance = parseFloat(currentSupplier.openingBalance || currentSupplier.previous_balance || 0);
              const calculatedOutstanding = openingBalance + totalBilled - totalGiven;
              const outstanding = calculatedOutstanding > 0 ? calculatedOutstanding : 0;
              const advance = calculatedOutstanding < 0 ? Math.abs(calculatedOutstanding) : 0;
              const totalBills = supplierTxns.filter(t => t && String(t.type).toLowerCase() === 'purchase').length;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2">Total Billed</p>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800">₹{totalBilled.toFixed(2)}</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-semibold uppercase">Lifetime</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2">Total Given</p>
                    <h3 className="text-xl sm:text-2xl font-black text-indigo-600">₹{totalGiven.toFixed(2)}</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-semibold uppercase">Payment Out</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2">Outstanding</p>
                    {advance > 0 ? (
                      <>
                        <h3 className="text-xl sm:text-2xl font-black text-emerald-500">₹0.00</h3>
                        <p className="text-emerald-500 text-[10px] mt-1 font-black uppercase">Advance: ₹{advance.toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <h3 className={`text-xl sm:text-2xl font-black ${outstanding > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>₹{outstanding.toFixed(2)}</h3>
                        <p className={`text-[10px] mt-1 font-semibold uppercase ${outstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{outstanding > 0 ? 'To Pay' : 'Fully Cleared'}</p>
                      </>
                    )}
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 sm:mb-2">Total Bills</p>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800">{totalBills}</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-semibold uppercase">Invoices</p>
                  </div>
                </div>
              );
            })()}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col w-full sm:flex-1 sm:overflow-hidden sm:min-h-0 mt-4">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shadow-sm z-10 sticky top-0">
                 <div className="flex items-center gap-2">
                   <LayoutList size={18} className="text-slate-500" />
                   <h3 className="font-bold text-slate-800">Ledger Details</h3>
                 </div>
               </div>
               
               <div className="flex-1 overflow-y-auto w-full pb-12 custom-scrollbar" style={{ maxHeight: '60vh' }}>
                 {supplierTxns.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-medium text-lg">No transactions recorded yet.</div>
                 ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 border-b border-slate-100 z-10">
                            <tr>
                              <th className="py-4 px-6">Date</th>
                              <th className="py-4 px-6">Description</th>
                              <th className="py-4 px-6 text-right text-amber-600 bg-amber-50/30">Billed (Debit)</th>
                              <th className="py-4 px-6 text-right text-emerald-600 bg-emerald-50/30">Paid (Credit)</th>
                              <th className="py-4 px-6 text-right text-indigo-600 bg-indigo-50/30">Running Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {supplierTxns.reduce((acc, txn) => {
                                const isPayment = String(txn.type||'').toLowerCase().includes('payment');
                                const debit = !isPayment ? parseFloat(txn.amount || 0) : 0;
                                const credit = isPayment ? parseFloat(txn.amount || 0) : 0;
                                acc.balance = acc.balance + debit - credit;
                                
                                acc.rows.push(
                                <tr key={`${txn.id}-${acc.rows.length}`} className="hover:bg-slate-50/80 transition-colors">
                                   <td className="py-4 px-6 text-slate-500 font-medium text-sm whitespace-nowrap">{new Date(txn.date).toLocaleDateString()}</td>
                                   <td className="py-4 px-6 text-slate-800 font-bold text-sm">
                                     {isPayment ? (
                                       <span className="text-emerald-600 mr-2 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase shadow-sm">PAID</span>
                                     ) : (
                                       <span className="text-indigo-600 mr-2 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">BILL</span>
                                     )}
                                     {txn.desc || txn.description || (isPayment ? 'Payment Made' : 'Purchase')}
                                   </td>
                                   <td className="py-4 px-6 text-right text-sm font-black text-slate-800 bg-amber-50/10">{debit > 0 ? `₹${debit.toFixed(2)}` : '-'}</td>
                                   <td className="py-4 px-6 text-right text-sm font-black text-emerald-600 bg-emerald-50/10">{credit > 0 ? `₹${credit.toFixed(2)}` : '-'}</td>
                                   <td className="py-4 px-6 text-right text-sm font-black text-indigo-600 bg-indigo-50/10">₹{acc.balance.toFixed(2)}</td>
                                </tr>
                                );
                                return acc;
                              }, { rows: [], balance: 0 }).rows}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="block sm:hidden p-4 space-y-3">
                        {supplierTxns.reduce((acc, txn) => {
                          const isPayment = String(txn.type||'').toLowerCase().includes('payment');
                          const debit = !isPayment ? parseFloat(txn.amount || 0) : 0;
                          const credit = isPayment ? parseFloat(txn.amount || 0) : 0;
                          acc.balance = acc.balance + debit - credit;
                          
                          let badgeColor = isPayment ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100";
                          let amountColor = isPayment ? "text-rose-600" : "text-slate-800";
                          let prefix = isPayment ? "Paid: " : "Billed: ";
                          let typeLabel = isPayment ? "PAYMENT OUT" : txn.type;

                          acc.rows.push(
                            <div key={`${txn.id || txn.type}-${acc.rows.length}`} className="p-4 mb-3 rounded-xl border bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                                      {typeLabel}
                                    </span>
                                    {(txn.desc || txn.description) && (
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                        #{txn.desc || txn.description}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className="text-right">
                                  <div className={`text-lg font-black tracking-tight ${amountColor}`}>
                                    {prefix}₹{parseFloat(txn.amount || 0).toFixed(2)}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    Balance: ₹{acc.balance.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                          return acc;
                        }, { rows: [], balance: 0 }).rows.reverse()}
                      </div>
                    </>
                 )}
               </div>
            </div>
          </div>
        )
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-600" /> Edit Supplier
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier Name</label>
                  <input type="text" required value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Business / Company</label>
                  <input type="text" value={editForm.businessName} onChange={(e) => setEditForm({...editForm, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Opening Balance</label>
                  <div className="flex items-center">
                    <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-3 text-slate-500 font-bold">₹</span>
                    <input type="number" step="0.01" value={editForm.openingBalance} onChange={(e) => setEditForm({...editForm, openingBalance: e.target.value})} className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium" />
                  </div>
               </div>
               <div className="pt-4"><button type="submit" className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER MODAL */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><Truck size={18} className="text-indigo-600" /> Add New Supplier</h3>
              <button onClick={() => setIsAddSupplierModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier Name</label>
                <input type="text" required value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white font-medium text-slate-800" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Business Name</label>
                <input type="text" value={supplierForm.businessName} onChange={(e) => setSupplierForm({...supplierForm, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white font-medium text-slate-800" placeholder="Acme Logistics Ltd." />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                <input type="text" value={supplierForm.phone} onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white font-medium text-slate-800" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Opening Balance</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-3 text-slate-500 font-bold">₹</span>
                  <input type="number" step="0.01" value={supplierForm.openingBalance} onChange={(e) => setSupplierForm({...supplierForm, openingBalance: e.target.value})} className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white font-medium text-slate-800" placeholder="0.00" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="px-5 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors w-full">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-amber-100 flex justify-between items-center bg-amber-50">
              <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2"><PackageOpen size={18} className="text-amber-600" /> Record Purchase Bill</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-amber-400 hover:text-amber-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Invoice Amount</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-3 text-slate-500 font-black">₹</span>
                  <input type="number" required min="1" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})} className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:ring-2 focus:outline-none focus:ring-amber-500/50 focus:border-amber-500 bg-white font-black text-amber-600 text-xl shadow-inner" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Inv No</label>
                  <input type="text" value={invoiceForm.invoiceNo} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-amber-500/50 bg-white text-slate-800 font-medium" placeholder="#123" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Date</label>
                  <input type="date" required value={invoiceForm.date} onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-amber-500/50 bg-white text-slate-800 font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
                <input type="text" value={invoiceForm.note} onChange={(e) => setInvoiceForm({...invoiceForm, note: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-amber-500/50 bg-white text-slate-700 font-medium" placeholder="E.g. Received new stock" />
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><IndianRupee size={18} className="text-indigo-600" /> Send Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-indigo-400 hover:text-indigo-600"><X size={20} /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">To Supplier</p>
                <p className="font-black text-slate-800 text-xl">{currentSupplier?.name}</p>
                <div className="mt-2 text-sm bg-white border border-slate-100 inline-block px-3 py-1 rounded-lg">
                   Pending: <span className="font-black text-amber-500">₹{currentSupplierBalance.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Amount Sent</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-3 text-slate-500 font-bold">₹</span>
                  <input type="number" required min="1" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-white font-black text-emerald-600 text-xl shadow-inner" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Date</label>
                <input type="date" required value={paymentForm.date} onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Note</label>
                <input type="text" value={paymentForm.note} onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium" placeholder="E.g. Bank Transfer Ref 123" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors shadow-indigo-600/30 text-lg">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
