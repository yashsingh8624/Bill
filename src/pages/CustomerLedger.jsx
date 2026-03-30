import React, { useState } from 'react';
import { useCustomers } from '../context/CustomerContext';
import { useBills } from '../context/BillContext';
import { useTransactions } from '../context/TransactionContext';
import { useSettings } from '../context/SettingsContext';
import { Users, Search, IndianRupee, MessageCircle, ChevronRight, Plus, X, Receipt, Edit2, Trash2 } from 'lucide-react';
import { getCustomerLedger, getCustomerBalance } from '../utils/ledger';

export default function CustomerLedger() {
  const customersRes = useCustomers() || {};
  const customers = Array.isArray(customersRes.customers) ? customersRes.customers : [];
  const { addCustomerPayment, updateCustomer, deleteCustomer } = customersRes;

  const { bills = [] } = useBills() || {};
  const { getTransactionsByEntityId } = useTransactions() || {};
  const { userSettings = {} } = useSettings() || {};
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });

  // Edit/Add Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  const filteredCustomers = customers.filter(c => 
    c && (
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.phone && String(c.phone).includes(searchTerm))
    )
  );

  const handleOpenCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const openPaymentModal = () => {
    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], note: 'Payment Received' });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentForm.amount || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      addCustomerPayment(
        selectedCustomer.id, 
        paymentForm.amount, 
        paymentForm.date, 
        paymentForm.note
      );
      setIsPaymentModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (customer) => {
    setEditForm({ name: customer.name, phone: customer.phone });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    updateCustomer(selectedCustomer.id, editForm);
    setIsEditModalOpen(false);
  };

  const handleDelete = () => {
    if (!selectedCustomer) return;
    if (window.confirm(`Are you sure you want to delete ${selectedCustomer.name}? Their transaction history will become orphaned.`)) {
       deleteCustomer(selectedCustomer.id);
       setSelectedCustomer(null);
    }
  };

  const currentCustomer = selectedCustomer 
    ? customers.find(c => c.id === selectedCustomer.id) 
    : null;

  const ledgerEntries = currentCustomer 
    ? getCustomerLedger(currentCustomer.id) 
    : [];
    
  const currentBalance = currentCustomer ? getCustomerBalance(currentCustomer.id) : 0;

  const getCustomerTotals = (customer) => {
    if (!customer || !customer.id) return { totalBilled: 0, totalPaid: 0, outstanding: 0, advance: 0, totalBills: 0 };
    
    const entries = getCustomerLedger(customer.id) || [];
    // Lifetime billed = sum of all SALE + OPENING entries
    const totalBilled = entries
      .filter(e => e && (e.type === 'SALE' || e.type === 'OPENING'))
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    // Lifetime paid = sum of all PAYMENT + ROLLOVER entries
    const totalPaid = entries
      .filter(e => e && (e.type === 'PAYMENT' || e.type === 'ROLLOVER'))
      .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    
    const rawBalance = totalBilled - totalPaid;
    // Clamp: outstanding >= 0, if negative = advance (overpaid)
    const outstanding = Math.max(0, rawBalance);
    const advance = rawBalance < 0 ? Math.abs(rawBalance) : 0;
    const totalBills = entries.filter(e => e && e.type === 'SALE').length;

    return { totalBilled, totalPaid, outstanding, advance, totalBills };
  };

  const handleSendWhatsApp = () => {
    if (!currentCustomer || !currentCustomer.phone) return;
    const { outstanding } = getCustomerTotals(currentCustomer);
    // Clean phone to digits only, add country code 91 if not present
    const rawPhone = String(currentCustomer.phone).replace(/[^0-9]/g, '');
    const phone = rawPhone.startsWith('91') ? rawPhone : `91${rawPhone}`;
    const bizName = userSettings.businessName || userSettings.ownerName || 'SmartBill Pro';
    const message = `Hello ${currentCustomer.name || 'Customer'}, your outstanding amount is ₹${outstanding.toFixed(2)}. Please clear your dues. Thank you.\n- ${bizName}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 flex flex-col min-h-screen sm:h-[calc(100vh-8rem)] relative w-full">
      {!selectedCustomer ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Customer Ledger</h2>
              <p className="text-slate-500 text-sm mt-1">Manage customer balances and payments.</p>
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
              {customers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-4 text-slate-400">
                    <Users size={40} />
                  </div>
                  <p className="font-bold text-slate-700 text-xl">No customers yet</p>
                  <p className="text-sm mt-2 font-medium">Customers are added automatically when you create a bill for them.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                    <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                      <th className="py-4 px-6">Customer Name</th>
                      <th className="py-4 px-6">Phone Number</th>
                      <th className="py-4 px-6 text-right">Outstanding (₹)</th>
                      <th className="py-4 px-6 text-center w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map(customer => (
                      <tr 
                        key={customer.id} 
                        onClick={() => handleOpenCustomer(customer)}
                        className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                      >
                         <td className="py-4 px-6 text-slate-800 font-bold flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                               {(customer.name || '??').substring(0,2)}
                            </div>
                            {customer.name || 'Unnamed Customer'}
                         </td>
                         <td className="py-4 px-6 text-slate-600 font-medium">{customer.phone || '-'}</td>
                           <td className="py-4 px-6 text-right">
                             <span className={`font-black ${parseFloat(getCustomerBalance(customer.id) || 0) > 0 ? 'text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100' : 'text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100'}`}>
                               ₹{parseFloat(getCustomerBalance(customer.id) || 0).toFixed(2)}
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
        currentCustomer && (
          <div className="flex flex-col space-y-6 animate-in slide-in-from-right-4 duration-300 w-full pb-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2.5 text-slate-500 bg-white hover:bg-slate-50 shadow-sm rounded-xl transition-all border border-slate-200 hover:text-slate-800"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                    {currentCustomer.name}
                    <button onClick={() => openEditModal(currentCustomer)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit Customer">
                       <Edit2 size={16} />
                    </button>
                    <button onClick={handleDelete} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Customer">
                       <Trash2 size={16} />
                    </button>
                  </h2>
                  <p className="text-slate-500 text-sm font-medium mt-0.5">{currentCustomer.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSendWhatsApp}
                  disabled={!currentCustomer.phone || currentBalance <= 0}
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={18} />
                  Reminder
                </button>
                <button 
                  onClick={openPaymentModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <IndianRupee size={18} />
                  Add Payment
                </button>
              </div>
            </div>

            {/* Summary cards - derived entirely from ledger */}
            {(() => {
              const { totalBilled, totalPaid, outstanding, advance, totalBills } = getCustomerTotals(currentCustomer);
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Billed</p>
                    <h3 className="text-2xl font-black text-slate-800">₹{totalBilled.toFixed(2)}</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-semibold uppercase">Lifetime</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Paid</p>
                    <h3 className="text-2xl font-black text-indigo-600">₹{totalPaid.toFixed(2)}</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-semibold uppercase">Lifetime</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Outstanding</p>
                    {advance > 0 ? (
                      <>
                        <h3 className="text-2xl font-black text-emerald-500">₹0.00</h3>
                        <p className="text-emerald-500 text-[10px] mt-1 font-black uppercase">Advance: ₹{advance.toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <h3 className={`text-2xl font-black ${outstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>₹{outstanding.toFixed(2)}</h3>
                        <p className={`text-[10px] mt-1 font-semibold uppercase ${outstanding > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{outstanding > 0 ? 'Due' : 'Fully Cleared'}</p>
                      </>
                    )}
                  </div>
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Bills</p>
                    <h3 className="text-2xl font-black text-slate-800">{totalBills}</h3>
                    <p className="text-slate-400 text-[10px] mt-1 font-semibold uppercase">Invoices</p>
                  </div>
                </div>
              );
            })()}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col w-full sm:flex-1 sm:overflow-hidden sm:min-h-0">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shadow-sm z-10 sticky top-0">
                 <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-slate-500" />
                    <h3 className="font-bold text-slate-800">Ledger Details</h3>
                 </div>
               </div>
               <div className="overflow-y-auto w-full pb-12" style={{ maxHeight: '55vh' }}>
                 {ledgerEntries.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 font-medium text-lg">No ledger entries found.</div>
                 ) : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider sticky top-0 border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-6">Date</th>
                          <th className="py-3 px-6">Description</th>
                          <th className="py-3 px-6 text-right text-red-500 bg-red-50/30">Debit (Billed)</th>
                          <th className="py-3 px-6 text-right text-emerald-600 bg-emerald-50/30">Credit (Paid)</th>
                          <th className="py-3 px-6 text-right text-indigo-600 bg-indigo-50/30">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerEntries.reduce((acc, txn) => {
                          const debit = (txn.type === 'SALE' || txn.type === 'OPENING') ? txn.amount : 0;
                          const credit = (txn.type === 'PAYMENT' || txn.type === 'ROLLOVER') ? txn.amount : 0;
                          acc.balance = acc.balance + debit - credit;
                          
                          acc.rows.push(
                            <tr key={`${txn.type}-${txn.id}`} className="hover:bg-slate-50/80 transition-colors">
                               <td className="py-4 px-6 text-slate-500 font-medium text-sm whitespace-nowrap">{new Date(txn.date).toLocaleDateString()}</td>
                               <td className="py-4 px-6 text-slate-800 font-bold text-sm">
                                 {txn.type === 'SALE' && <span className="text-slate-500 mr-2 border border-slate-200 bg-white px-2 py-0.5 rounded text-xs">INV</span>}
                                 {txn.type === 'PAYMENT' && <span className="text-emerald-600 mr-2 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded text-xs shadow-sm">PAY</span>}
                                 {txn.type === 'OPENING' && <span className="text-amber-500 mr-2 border border-amber-200 bg-amber-50 px-2 py-0.5 rounded text-xs shadow-sm">OPEN</span>}
                                 {txn.type === 'ROLLOVER' && <span className="text-indigo-400 mr-2 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded text-xs">ROLL</span>}
                                 {txn.desc}
                               </td>
                               <td className="py-4 px-6 text-right text-sm font-black text-slate-800 bg-red-50/10">{debit > 0 ? `₹${debit.toFixed(2)}` : '-'}</td>
                               <td className="py-4 px-6 text-right text-sm font-black text-emerald-600 bg-emerald-50/10">{credit > 0 ? `₹${credit.toFixed(2)}` : '-'}</td>
                               <td className="py-4 px-6 text-right text-sm font-black text-indigo-600 bg-indigo-50/10">₹{acc.balance.toFixed(2)}</td>
                            </tr>
                          );
                          return acc;
                        }, { rows: [], balance: 0 }).rows}
                      </tbody>
                    </table>
                 )}
               </div>
            </div>
          </div>
        )
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-600" /> Edit Customer
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Customer Name</label>
                  <input 
                    type="text" required
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                  />
               </div>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                  <input 
                    type="text" 
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium"
                  />
               </div>
               <div className="pt-4 flex gap-3">
                 <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all text-center">
                   Save Changes
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 border border-slate-100">
            <div className="px-6 py-4 border-b border-emerald-100 flex justify-between items-center bg-emerald-50">
              <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                <IndianRupee size={18} className="text-emerald-600" />
                Record Payment
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-emerald-400 hover:text-emerald-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                <p className="font-black text-slate-800 text-xl">{currentCustomer?.name}</p>
                <div className="mt-2 text-sm bg-white border border-slate-100 inline-block px-3 py-1 rounded-lg">
                   Due: <span className="font-black text-red-500">₹{getCustomerTotals(currentCustomer).outstanding.toFixed(2)}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Amount Received</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-3 text-slate-500 font-black">₹</span>
                  <input 
                    type="number" required min="1" step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full px-4 py-3 rounded-r-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-emerald-600 text-xl font-black shadow-inner"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Date</label>
                <input 
                  type="date" required
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/50 bg-white text-slate-700 font-medium"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Note (Optional)</label>
                <input 
                  type="text" 
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/50 bg-slate-50 focus:bg-white text-slate-700 font-medium"
                  placeholder="e.g. Cash payment"
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
