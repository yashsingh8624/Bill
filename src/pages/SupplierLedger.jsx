import React, { useState } from 'react';
import { useSuppliers } from '../context/SupplierContext';
import { useTransactions } from '../context/TransactionContext';
import { useSettings } from '../context/SettingsContext';
import { Truck, Search, IndianRupee, MessageCircle, ChevronRight, Plus, X, PackageOpen, LayoutList, Edit2, Trash2 } from 'lucide-react';

export default function SupplierLedger() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, addSupplierPayment, addSupplierInvoice } = useSuppliers();
  const { getTransactionsByEntityId } = useTransactions();
  const { userSettings } = useSettings();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Modals
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', businessName: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', businessName: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.businessName && s.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenSupplier = (supplier) => setSelectedSupplier(supplier);

  const handleAddSupplierSubmit = (e) => {
    e.preventDefault();
    if (!supplierForm.name) return;
    addSupplier({
      name: supplierForm.name,
      phone: supplierForm.phone,
      businessName: supplierForm.businessName,
      createdAt: new Date().toISOString()
    });
    setIsAddSupplierModalOpen(false);
    setSupplierForm({ name: '', phone: '', businessName: '' });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    updateSupplier(selectedSupplier.id, editForm);
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
  };

  const handleInvoiceSubmit = (e) => {
    e.preventDefault();
    if (!selectedSupplier || !invoiceForm.amount) return;
    addSupplierInvoice(selectedSupplier.id, invoiceForm.amount, invoiceForm.date, invoiceForm.note, invoiceForm.invoiceNo);
    setIsInvoiceModalOpen(false);
  };

  const currentSupplier = selectedSupplier ? suppliers.find(s => s.id === selectedSupplier.id) : null;
  const supplierTxns = currentSupplier ? getTransactionsByEntityId(currentSupplier.id) : [];

  const handleSendWhatsApp = () => {
    if (!currentSupplier || !currentSupplier.phone) return;
    const amount = currentSupplier.balance || 0;
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
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col relative w-full overflow-hidden">
      {!selectedSupplier ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Party / Supplier Ledger</h2>
              <p className="text-slate-500 text-sm mt-1">Manage suppliers, track purchases, and payments.</p>
            </div>
            <button 
              onClick={() => setIsAddSupplierModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus size={18} /> Add Supplier
            </button>
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
                              {supplier.name.substring(0,2)}
                           </div>
                           <div>
                             <div className="font-bold text-slate-800">{supplier.name}</div>
                             <div className="text-xs font-medium text-slate-500">{supplier.businessName || 'No business specified'}</div>
                           </div>
                         </td>
                         <td className="py-4 px-6 text-slate-600 font-medium">{supplier.phone || '-'}</td>
                         <td className="py-4 px-6 text-right">
                            <span className={`font-black ${supplier.balance > 0 ? 'text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100' : 'text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200'}`}>
                              ₹{(supplier.balance || 0).toFixed(2)}
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
          <div className="flex flex-col h-full space-y-6 animate-in slide-in-from-right-4 duration-300 w-full overflow-hidden">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-shrink-0">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Amount To Pay</p>
                <h3 className={`text-3xl font-black ${(currentSupplier.balance || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  ₹{(currentSupplier.balance || 0).toFixed(2)}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Invoices</p>
                <h3 className="text-3xl font-black text-slate-800">{supplierTxns.filter(t => t.type === 'INVOICE_RECEIVED').length}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Payments</p>
                <h3 className="text-3xl font-black text-indigo-600">{supplierTxns.filter(t => t.type === 'PAYMENT_MADE').length}</h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                 <LayoutList size={18} className="text-slate-500" />
                 <h3 className="font-bold text-slate-800">Supplier Ledger History</h3>
               </div>
               <div className="overflow-y-auto flex-1 p-0">
                 {supplierTxns.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-medium text-lg">No transactions recorded yet.</div>
                 ) : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-6">Date</th>
                          <th className="py-3 px-6">Description</th>
                          <th className="py-3 px-6 text-right text-emerald-600 bg-emerald-50/30">Payment Made</th>
                          <th className="py-3 px-6 text-right text-amber-600 bg-amber-50/30">Stock Bill</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...supplierTxns].sort((a, b) => new Date(b.date) - new Date(a.date)).map((txn, idx) => (
                          <tr key={`${txn.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                             <td className="py-4 px-6 text-slate-500 font-medium text-sm whitespace-nowrap">{new Date(txn.date).toLocaleDateString()}</td>
                             <td className="py-4 px-6 text-slate-800 font-bold text-sm">
                               {txn.type === 'INVOICE_RECEIVED' ? <span className="text-amber-600 mr-2 border border-amber-200 bg-white px-2 py-0.5 rounded shadow-sm text-[10px] tracking-wider font-black">BILL</span> : <span className="text-indigo-600 mr-2 border border-indigo-200 bg-white px-2 py-0.5 rounded shadow-sm text-[10px] tracking-wider font-black">PAID</span>}
                               {txn.notes || 'Note missing'}
                             </td>
                             <td className="py-4 px-6 text-right text-sm font-black text-emerald-600 bg-emerald-50/10">{txn.type === 'PAYMENT_MADE' ? `₹${txn.amount.toFixed(2)}` : '-'}</td>
                             <td className="py-4 px-6 text-right text-sm font-black text-amber-600 bg-amber-50/10">{txn.type === 'INVOICE_RECEIVED' ? `₹${txn.amount.toFixed(2)}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
            <form onSubmit={handleAddSupplierSubmit} className="p-6 space-y-4">
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
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="px-5 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors w-full">Cancel</button>
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors shadow-indigo-600/30">Add</button>
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
                   Pending: <span className="font-black text-amber-500">₹{(currentSupplier?.balance || 0).toFixed(2)}</span>
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
