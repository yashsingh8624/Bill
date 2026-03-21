import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { FileText, Search, Eye, X } from 'lucide-react';

export default function BillHistory() {
  const { bills } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  const filteredBills = bills.filter(b => 
    b.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bill History</h2>
          <p className="text-slate-500 text-sm mt-1">View and manage past invoices.</p>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4 flex-shrink-0">
        <Search size={20} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by customer name..." 
          className="flex-1 py-2 focus:outline-none text-slate-700 placeholder:text-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1 h-full overflow-y-auto">
          {bills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
              <div className="bg-slate-50 p-4 rounded-full mb-3 text-slate-400">
                <FileText size={32} />
              </div>
              <p className="font-medium text-slate-600 text-lg">No bills generated</p>
              <p className="text-sm mt-1">Your bill history will appear here.</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-12">
              <p>No bills match your search.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-sm">
                  <th className="py-4 px-6 font-medium">Bill No.</th>
                  <th className="py-4 px-6 font-medium">Customer Name</th>
                  <th className="py-4 px-6 font-medium">Date</th>
                  <th className="py-4 px-6 font-medium">Items</th>
                  <th className="py-4 px-6 font-medium text-right">Total Amount</th>
                  <th className="py-4 px-6 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill, index) => (
                  <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                     <td className="py-4 px-6 text-slate-500 font-medium whitespace-nowrap">#{bills.length - index}</td>
                     <td className="py-4 px-6 text-slate-800 font-medium">{bill.customerName}</td>
                     <td className="py-4 px-6 text-slate-600">
                       {new Date(bill.date).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(bill.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </td>
                     <td className="py-4 px-6 text-slate-600">
                       <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                         {bill.items.reduce((sum, item) => sum + item.quantity, 0)} items
                       </span>
                     </td>
                     <td className="py-4 px-6 text-slate-800 font-bold text-right">₹{(bill.grandTotal || bill.total || 0).toFixed(2)}</td>
                     <td className="py-4 px-6 text-center">
                        <button onClick={() => setSelectedBill(bill)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block tooltip-trigger" title="View details">
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
                <div className="bg-indigo-100 p-1.5 rounded-lg">
                  <FileText size={18} className="text-indigo-600" />
                </div>
                Receipt Details
              </h3>
              <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-white" id="receipt-content">
              <div className="text-center mb-8 pb-6 border-b border-slate-100/80 border-dashed">
                 <h2 className="text-3xl font-bold text-indigo-600 mb-1 tracking-tight">SmartBill</h2>
                 <p className="text-slate-500 text-sm">Thank you for your business</p>
              </div>

              <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100/80 border-dashed">
                <div>
                  <p className="text-xs text-slate-400 font-bold mb-1 tracking-wider uppercase">Billed To</p>
                  <p className="font-bold text-slate-800 text-lg">{selectedBill.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold mb-1 tracking-wider uppercase">Date & Time</p>
                  <p className="font-medium text-slate-800">{new Date(selectedBill.date).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-500">{new Date(selectedBill.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>

              <table className="w-full text-left mb-8">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100/80 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Item</th>
                    <th className="pb-3 font-semibold text-center">Qty</th>
                    <th className="pb-3 font-semibold text-right">Price</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {selectedBill.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3.5 text-slate-800 text-sm font-medium">{item.name}</td>
                      <td className="py-3.5 text-slate-600 text-sm text-center">{item.quantity}</td>
                      <td className="py-3.5 text-slate-600 text-sm text-right">₹{item.price.toFixed(2)}</td>
                      <td className="py-3.5 text-slate-800 text-sm font-bold text-right">₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center text-slate-500 text-sm">
                  <span>Subtotal</span>
                  <span>₹{(selectedBill.subTotal || selectedBill.total || 0).toFixed(2)}</span>
                </div>
                {selectedBill.gstEnabled && (
                  <div className="flex justify-between items-center text-slate-500 text-sm">
                    <span>GST ({selectedBill.gstRate}%)</span>
                    <span>₹{((selectedBill.cgst || 0) + (selectedBill.sgst || 0)).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-slate-700">Total Billed</span>
                  <span className="text-2xl font-black text-indigo-600">₹{(selectedBill.grandTotal || selectedBill.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end flex-shrink-0 gap-3">
               <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-colors hidden sm:block">
                 Print
               </button>
               <button onClick={() => setSelectedBill(null)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
