import React, { useState } from 'react';
import { useBills } from '../context/BillContext';
import { useCustomers } from '../context/CustomerContext';
import { FileText, Search, Eye, X, ArrowUpRight } from 'lucide-react';

export default function BillHistory() {
  const { bills } = useBills();
  const { customers } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  const filteredBills = bills.filter(b => 
    !b.isDeleted && 
    b.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bill History</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">View and manage past invoices.</p>
        </div>
      </div>

      <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by customer name..." 
          className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 h-full overflow-y-auto custom-scrollbar">
          {bills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
              <div className="bg-slate-50 p-6 rounded-full mb-4 text-slate-300">
                <FileText size={48} />
              </div>
              <p className="font-bold text-slate-700 text-xl">No bills generated</p>
              <p className="text-sm mt-2 font-medium">Your bill history will appear here.</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
              <p className="font-bold">No bills match your search.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Bill No.</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Payment</th>
                  <th className="py-4 px-6 text-right">Total Amount</th>
                  <th className="py-4 px-6 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-indigo-50/30 transition-colors group">
                     <td className="py-4 px-6 font-bold text-slate-700">#{bill.invoiceNo || bill.id.slice(-4)}</td>
                     <td className="py-4 px-6">
                        <p className="text-slate-800 font-bold">{bill.customerName}</p>
                        {bill.prevBalanceIncluded > 0 && (
                           <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm flex items-center w-fit mt-1">
                              <ArrowUpRight size={10} className="mr-0.5"/> Udhaar Incl.
                           </span>
                        )}
                     </td>
                     <td className="py-4 px-6 text-slate-500 text-sm font-medium">
                       {new Date(bill.date).toLocaleDateString()}
                     </td>
                     <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black shadow-sm border ${bill.outstanding > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                           {bill.paymentMode} {bill.outstanding > 0 ? `(Pending)` : `(Paid)`}
                        </span>
                     </td>
                     <td className="py-4 px-6 text-slate-800 font-black text-right">₹{(bill.grandTotal || bill.total || 0).toFixed(2)}</td>
                     <td className="py-4 px-6 text-center">
                        <button onClick={() => setSelectedBill(bill)} className="p-2 text-slate-400 group-hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent group-hover:border-indigo-100 group-hover:shadow-sm">
                          <Eye size={18} />
                        </button>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View Bill Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-md shadow-indigo-600/20">
                  <FileText size={18} />
                </div>
                Invoice Details
              </h3>
              <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white custom-scrollbar" id="receipt-content">
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100 shadow-sm rounded-b-xl p-4 bg-slate-50/50">
                <div>
                  <p className="text-[10px] text-slate-400 font-black mb-1 tracking-widest uppercase">Bill To</p>
                  <p className="font-black text-slate-800 text-xl uppercase">{selectedBill.customerName}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedBill.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-black mb-1 tracking-widest uppercase">Invoice Info</p>
                  <p className="font-bold text-slate-800">#{selectedBill.invoiceNo}</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">{new Date(selectedBill.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left mb-8">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-100 uppercase tracking-widest font-black">
                      <th className="pb-3 px-2">Item Description</th>
                      <th className="pb-3 px-2 text-center">Qty</th>
                      <th className="pb-3 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedBill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3.5 px-2 text-slate-800 text-sm font-bold uppercase tracking-tight">{item.name}</td>
                        <td className="py-3.5 px-2 text-slate-600 text-sm text-center font-bold">{item.quantity}</td>
                        <td className="py-3.5 px-2 text-slate-800 text-sm font-black text-right">₹{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-3 shadow-inner">
                <div className="flex justify-between items-center text-slate-500 text-sm font-bold">
                  <span>Subtotal</span>
                  <span>₹{(selectedBill.subTotal || selectedBill.total || 0).toFixed(2)}</span>
                </div>
                {selectedBill.gstEnabled && (
                  <div className="flex justify-between items-center text-slate-500 text-sm font-bold">
                    <span>GST ({selectedBill.gstRate}%)</span>
                    <span>₹{((selectedBill.cgst || 0) + (selectedBill.sgst || 0)).toFixed(2)}</span>
                  </div>
                )}
                {selectedBill.prevBalanceIncluded > 0 && (
                   <div className="flex justify-between items-center text-amber-600 text-sm font-bold pt-2 border-t border-amber-100">
                      <span>Previous Udhaar</span>
                      <span>₹{selectedBill.prevBalanceIncluded.toFixed(2)}</span>
                   </div>
                )}
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200">
                  <span className="font-black text-slate-700 uppercase tracking-wider text-xs">Final Net Total</span>
                  <span className="text-3xl font-black text-indigo-700 tracking-tighter">₹{(selectedBill.grandTotal || selectedBill.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-600 text-sm">Amount Paid</span>
                  <span className="font-black text-emerald-600 text-lg">₹{(selectedBill.amountPaid || 0).toFixed(2)}</span>
                </div>
                {(selectedBill.outstanding || 0) > 0 && (
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-600 text-sm">Outstanding Balance</span>
                    <span className="font-black text-red-600 text-lg">₹{(selectedBill.outstanding || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0 gap-3">
               <button onClick={() => window.print()} className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all shadow-sm">
                 Print Invoice
               </button>
               <button onClick={() => setSelectedBill(null)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-800/20">
                 Close View
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
