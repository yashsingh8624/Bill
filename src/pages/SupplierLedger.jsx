import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Truck, Search, IndianRupee, MessageCircle, ChevronRight, Plus, X, PackageOpen, LayoutList } from 'lucide-react';

export default function SupplierLedger() {
  const { suppliers, addSupplier, addSupplierPayment, addSupplierInvoice, userSettings } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Modals
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', businessName: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.businessName && s.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenSupplier = (supplier) => {
    setSelectedSupplier(supplier);
  };

  const handleAddSupplierSubmit = (e) => {
    e.preventDefault();
    if (!supplierForm.name) return;
    addSupplier({
      name: supplierForm.name,
      phone: supplierForm.phone,
      businessName: supplierForm.businessName,
      createdAt: new Date().toISOString(),
      balance: 0
    });
    setIsAddSupplierModalOpen(false);
    setSupplierForm({ name: '', phone: '', businessName: '' });
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

  const handleSendWhatsApp = () => {
    if (!currentSupplier || !currentSupplier.phone) return;
    const amount = currentSupplier.balance || 0;
    const phone = currentSupplier.phone.startsWith('+91') ? currentSupplier.phone : `+91${currentSupplier.phone}`;
    
    // Reverse logic: we owe the supplier. Ask for account details or notify payment sent.
    // If we OWE money:
    let message = '';
    if (amount > 0) {
       message = `Dear ${currentCustomer.name},\nWe have an outstanding balance of ₹${amount.toFixed(2)} with you. Please share your UPI or Bank details to clear the payment.\n- ${userSettings.businessName}`;
    } else {
       message = `Dear ${currentCustomer.name},\nThis is to notify regarding our transactions. \n- ${userSettings.businessName}`;
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus size={18} /> Add Supplier
            </button>
          </div>

          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or business..." 
              className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
              {suppliers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-3 text-slate-400">
                    <Truck size={32} />
                  </div>
                  <p className="font-medium text-slate-600 text-lg">No suppliers added yet</p>
                  <p className="text-sm mt-1 mb-4">Add your party/supplier details to track stock invoices.</p>
                  <button onClick={() => setIsAddSupplierModalOpen(true)} className="text-indigo-600 font-medium hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg transition-colors">Add Supplier</button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                    <tr className="text-slate-500 text-sm uppercase font-semibold">
                      <th className="py-4 px-6">Supplier & Business</th>
                      <th className="py-4 px-6">Phone Number</th>
                      <th className="py-4 px-6 text-right">Amount To Pay</th>
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
                         <td className="py-4 px-6">
                           <div className="font-bold text-slate-800">{supplier.name}</div>
                           <div className="text-xs font-medium text-slate-500">{supplier.businessName || 'No business specified'}</div>
                         </td>
                         <td className="py-4 px-6 text-slate-600 font-medium">{supplier.phone || 'N/A'}</td>
                         <td className="py-4 px-6 text-right">
                            <span className={`font-bold ${supplier.balance > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                              ₹{(supplier.balance || 0).toFixed(2)}
                            </span>
                         </td>
                         <td className="py-4 px-6 text-center">
                            <div className="flex justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
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
        // Supplier Details View
        currentSupplier && (
          <div className="flex flex-col h-full space-y-6 animate-in slide-in-from-right-4 duration-300 w-full overflow-hidden">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedSupplier(null)}
                  className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-200"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{currentSupplier.name}</h2>
                  <p className="text-slate-500 text-sm font-medium">{currentSupplier.businessName} {currentSupplier.phone && `| ${currentSupplier.phone}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <button 
                  onClick={handleSendWhatsApp}
                  disabled={!currentSupplier.phone}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl transition-all font-medium flex items-center justify-center gap-1.5 shadow-sm text-sm"
                >
                  <MessageCircle size={16} /> WA Msg
                </button>
                <button 
                  onClick={() => {
                    setInvoiceForm({ invoiceNo: '', amount: '', date: new Date().toISOString().split('T')[0], note: '' });
                    setIsInvoiceModalOpen(true);
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl transition-all font-medium flex items-center justify-center gap-1.5 shadow-sm text-sm"
                >
                  <PackageOpen size={16} /> Record Purchase
                </button>
                <button 
                  onClick={() => {
                    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });
                    setIsPaymentModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition-all font-medium flex items-center justify-center gap-1.5 shadow-sm text-sm"
                >
                  <IndianRupee size={16} /> Make Payment
                </button>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-shrink-0">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-sm font-medium mb-1">Amount To Pay</p>
                <h3 className={`text-3xl font-black ${(currentSupplier.balance || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  ₹{(currentSupplier.balance || 0).toFixed(2)}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Purchases</p>
                <h3 className="text-3xl font-black text-slate-800">{currentSupplier.invoices?.length || 0} Invoices</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Payments</p>
                <h3 className="text-3xl font-black text-indigo-600">{currentSupplier.payments?.length || 0} Payments</h3>
              </div>
            </div>

            {/* Ledger Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                 <LayoutList size={18} className="text-slate-500" />
                 <h3 className="font-bold text-slate-800">Supplier Ledger History</h3>
               </div>
               <div className="overflow-y-auto flex-1 p-0">
                 {(!currentSupplier.invoices || currentSupplier.invoices.length === 0) && (!currentSupplier.payments || currentSupplier.payments.length === 0) ? (
                    <div className="p-8 text-center text-slate-500">No transactions recorded yet.</div>
                 ) : (
                    <div className="p-0">
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-6">Date</th>
                            <th className="py-3 px-6">Description</th>
                            <th className="py-3 px-6 text-right">Debit (Payment Made)</th>
                            <th className="py-3 px-6 text-right">Credit (Purchase/Invoice)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            ...(currentSupplier.invoices || []).map(i => ({
                              id: i.id, date: i.date, desc: `Stock Received / Inv #${i.invoiceNo} ${i.note ? `(${i.note})` : ''}`, debit: 0, credit: i.amount, type: 'INV'
                            })),
                            ...(currentSupplier.payments || []).map(p => ({
                              id: p.id, date: p.date, desc: `Payment Made ${p.note ? `(${p.note})` : ''}`, debit: p.amount, credit: 0, type: 'PAY'
                            }))
                          ].sort((a, b) => new Date(b.date) - new Date(a.date)).map((txn, idx) => (
                            <tr key={`${txn.type}-${txn.id}-${idx}`} className="hover:bg-slate-50/50">
                               <td className="py-4 px-6 text-slate-600 text-sm">{new Date(txn.date).toLocaleDateString()}</td>
                               <td className="py-4 px-6 text-slate-800 font-medium text-sm">
                                 {txn.type === 'INV' ? <span className="text-amber-600 mr-2 border border-amber-200 bg-amber-50 px-2 py-0.5 rounded text-xs">PURCHASE</span> : <span className="text-indigo-600 mr-2 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded text-xs">PAYMENT</span>}
                                 {txn.desc}
                               </td>
                               <td className="py-4 px-6 text-right text-sm font-bold text-emerald-600">{txn.debit > 0 ? `₹${txn.debit.toFixed(2)}` : '-'}</td>
                               <td className="py-4 px-6 text-right text-sm font-bold text-amber-600">{txn.credit > 0 ? `₹${txn.credit.toFixed(2)}` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 )}
               </div>
            </div>
          </div>
        )
      )}

      {/* ADD SUPPLIER MODAL */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <Truck size={18} className="text-indigo-600" /> Add New Supplier
              </h3>
              <button onClick={() => setIsAddSupplierModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSupplierSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier Name</label>
                <input type="text" required value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name</label>
                <input type="text" value={supplierForm.businessName} onChange={(e) => setSupplierForm({...supplierForm, businessName: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white" placeholder="Acme Logistics Ltd." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input type="text" value={supplierForm.phone} onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white" placeholder="9876543210" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddSupplierModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors w-full">Cancel</button>
                <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PURCHASE/INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <PackageOpen size={18} className="text-indigo-600" /> Record Purchase
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice Amount To Pay</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-2.5 text-slate-500 font-bold">₹</span>
                  <input type="number" required min="1" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({...invoiceForm, amount: e.target.value})} className="w-full px-4 py-2.5 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white font-bold text-amber-600" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier Inv No</label>
                  <input type="text" value={invoiceForm.invoiceNo} onChange={(e) => setInvoiceForm({...invoiceForm, invoiceNo: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white" placeholder="#INV-12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input type="date" required value={invoiceForm.date} onChange={(e) => setInvoiceForm({...invoiceForm, date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (Optional)</label>
                <input type="text" value={invoiceForm.note} onChange={(e) => setInvoiceForm({...invoiceForm, note: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-700" placeholder="e.g. Received 50 items" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">Save Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAKE PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <IndianRupee size={18} className="text-indigo-600" /> Record Payment Made
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-2.5 text-slate-500 font-bold">₹</span>
                  <input type="number" required min="1" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} className="w-full px-4 py-2.5 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white font-bold text-emerald-600" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input type="date" required value={paymentForm.date} onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Note (Optional)</label>
                <input type="text" value={paymentForm.note} onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-700" placeholder="e.g. Paid via UPI" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
