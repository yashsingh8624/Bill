import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Users, Search, IndianRupee, MessageCircle, ChevronRight, Plus, X, Receipt } from 'lucide-react';

export default function CustomerLedger() {
  const { customers, bills, userSettings, addCustomerPayment } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '' });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  const handleOpenCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const openPaymentModal = () => {
    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0], note: 'Payment Received' });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentForm.amount) return;
    
    addCustomerPayment(
      selectedCustomer.id, 
      paymentForm.amount, 
      paymentForm.date, 
      paymentForm.note
    );
    
    setIsPaymentModalOpen(false);
    // Refresh selected customer from updated context state
    // We rely on context update to trigger re-render, but selectedCustomer is a separate state.
    // It's better to read the customer directly from context using ID in render.
  };

  // Get freshest customer data
  const currentCustomer = selectedCustomer 
    ? customers.find(c => c.id === selectedCustomer.id) 
    : null;

  const customerBills = currentCustomer 
    ? bills.filter(b => b.customerId === currentCustomer.id) 
    : [];

  const handleSendWhatsApp = () => {
    if (!currentCustomer || !currentCustomer.phone) return;
    const amount = currentCustomer.balance || 0;
    const phone = currentCustomer.phone.startsWith('+91') ? currentCustomer.phone : `+91${currentCustomer.phone}`;
    
    // "Dear [Name], aapka outstanding ₹[amount] hai. Please clear karein. - [Owner Name] | [Owner Phone]"
    const message = `Dear ${currentCustomer.name}, aapka pending balance ₹${amount.toFixed(2)} hai. Kripya jald clear karein. Dhanyawad.\n- ${userSettings.ownerName} | ${userSettings.businessName}`;
    const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col relative w-full overflow-hidden">
      {!selectedCustomer ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Customer Ledger</h2>
              <p className="text-slate-500 text-sm mt-1">Manage customer balances and payments.</p>
            </div>
          </div>

          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
            <Search size={20} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
              {customers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12 text-center">
                  <div className="bg-slate-50 p-4 rounded-full mb-3 text-slate-400">
                    <Users size={32} />
                  </div>
                  <p className="font-medium text-slate-600 text-lg">No customers yet</p>
                  <p className="text-sm mt-1">Customers are added automatically when you create a bill for them.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-200">
                    <tr className="text-slate-500 text-sm uppercase font-semibold">
                      <th className="py-4 px-6">Customer Name</th>
                      <th className="py-4 px-6">Phone Number</th>
                      <th className="py-4 px-6 text-right">Outstanding</th>
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
                         <td className="py-4 px-6 text-slate-800 font-bold">{customer.name}</td>
                         <td className="py-4 px-6 text-slate-600 font-medium">{customer.phone || 'N/A'}</td>
                         <td className="py-4 px-6 text-right">
                            <span className={`font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              ₹{(customer.balance || 0).toFixed(2)}
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
        // Customer Details View
        currentCustomer && (
          <div className="flex flex-col h-full space-y-6 animate-in slide-in-from-right-4 duration-300 w-full overflow-hidden">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-200"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{currentCustomer.name}</h2>
                  <p className="text-slate-500 text-sm font-medium">{currentCustomer.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSendWhatsApp}
                  disabled={!currentCustomer.phone || (currentCustomer.balance || 0) <= 0}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl transition-all font-medium flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={18} />
                  Reminder
                </button>
                <button 
                  onClick={openPaymentModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all font-medium flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
                >
                  <IndianRupee size={18} />
                  Add Payment
                </button>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Outstanding</p>
                <h3 className={`text-3xl font-black ${(currentCustomer.balance || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  ₹{(currentCustomer.balance || 0).toFixed(2)}
                </h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Bills</p>
                <h3 className="text-3xl font-black text-slate-800">{customerBills.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-500 text-sm font-medium mb-1">Total Payments</p>
                <h3 className="text-3xl font-black text-indigo-600">{currentCustomer.payments?.length || 0}</h3>
              </div>
            </div>

            {/* Ledger Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                 <Receipt size={18} className="text-slate-500" />
                 <h3 className="font-bold text-slate-800">Transaction History</h3>
               </div>
               <div className="overflow-y-auto flex-1 p-0">
                 {customerBills.length === 0 && (!currentCustomer.payments || currentCustomer.payments.length === 0) ? (
                    <div className="p-8 text-center text-slate-500">No transactions recorded yet.</div>
                 ) : (
                    <div className="p-0">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-6">Date</th>
                            <th className="py-3 px-6">Description</th>
                            <th className="py-3 px-6 text-right">Debit (Bill)</th>
                            <th className="py-3 px-6 text-right">Credit (Paid)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* We combine bills and payments into a single ledger array and sort by date */}
                          {[
                            ...customerBills.map(b => ({
                              id: b.id,
                              date: b.date,
                              desc: `Bill #${b.invoiceNo}`,
                              debit: b.total || b.grandTotal, // backward compat
                              credit: b.amountPaid || 0,
                              type: 'BILL'
                            })),
                            ...(currentCustomer.payments || []).map(p => ({
                              id: p.id,
                              date: p.date,
                              desc: `Payment: ${p.note}`,
                              debit: 0,
                              credit: p.amount,
                              type: 'PAYMENT'
                            }))
                          ].sort((a, b) => new Date(b.date) - new Date(a.date)).map((txn, idx) => (
                            <tr key={`${txn.type}-${txn.id}-${idx}`} className="hover:bg-slate-50/50">
                               <td className="py-4 px-6 text-slate-600 text-sm">{new Date(txn.date).toLocaleDateString()}</td>
                               <td className="py-4 px-6 text-slate-800 font-medium text-sm">
                                 {txn.type === 'BILL' ? <span className="text-slate-800 mr-2 border border-slate-200 bg-white px-2 py-0.5 rounded text-xs">INV</span> : <span className="text-emerald-600 mr-2 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded text-xs">PAY</span>}
                                 {txn.desc}
                               </td>
                               <td className="py-4 px-6 text-right text-sm font-bold text-slate-800">{txn.debit > 0 ? `₹${txn.debit.toFixed(2)}` : '-'}</td>
                               <td className="py-4 px-6 text-right text-sm font-bold text-emerald-600">{txn.credit > 0 ? `₹${txn.credit.toFixed(2)}` : '-'}</td>
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

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <IndianRupee size={18} className="text-indigo-600" />
                Record Payment
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4 text-left">
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2 mb-2">{currentCustomer?.name}</p>
                <p className="text-xs text-slate-500">Current Outstanding: <span className="font-bold text-red-500">₹{(currentCustomer?.balance || 0).toFixed(2)}</span></p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Received</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-4 py-2.5 text-slate-500 font-bold">₹</span>
                  <input 
                    type="number" required min="1" step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-emerald-600 text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input 
                  type="date" required
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Note</label>
                <input 
                  type="text" 
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({...paymentForm, note: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-slate-700"
                  placeholder="e.g. Cash payment"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2">
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
