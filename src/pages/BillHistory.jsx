import React, { useState } from 'react';
import { useBills } from '../context/BillContext';
import { useCustomers } from '../context/CustomerContext';
import { FileText, Search, Eye, X, ArrowUpRight, Filter, FileSpreadsheet, Calendar, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { generateInvoicePDF } from '../utils/pdfGenerator';

export default function BillHistory() {
  const billsRes = useBills() || {};
  const bills = Array.isArray(billsRes.bills) ? billsRes.bills : [];
  const { deleteBill } = billsRes;

  const customersRes = useCustomers() || {};
  const customers = Array.isArray(customersRes.customers) ? customersRes.customers : [];

  const { userSettings = {} } = useSettings() || {};
  const { showToast } = useToast() || { showToast: () => {} };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, YESTERDAY, MONTH

  const getFilteredBills = () => {
    let filtered = bills.filter(b => b && !b.isDeleted);
    
    // Name Search
    if (searchTerm) {
      filtered = filtered.filter(b => 
        (b.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.invoiceNo && b.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Date Filter
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const thisMonthStr = todayStr.slice(0, 7); // YYYY-MM

    if (dateFilter === 'TODAY') {
      filtered = filtered.filter(b => b.date && b.date.startsWith(todayStr));
    } else if (dateFilter === 'YESTERDAY') {
      filtered = filtered.filter(b => b.date && b.date.startsWith(yesterdayStr));
    } else if (dateFilter === 'MONTH') {
      filtered = filtered.filter(b => b.date && b.date.startsWith(thisMonthStr));
    }

    return filtered;
  };

  const filteredBills = getFilteredBills();

  const handleExportExcel = () => {
    const data = filteredBills.map(b => ({
      'Invoice No': b.invoiceNo,
      'Date': b.readableDate || new Date(b.date).toLocaleDateString(),
      'Customer': b.customerName,
      'Total Amount': b.grandTotal || b.total || 0,
      'Paid': b.amountPaid || 0,
      'Outstanding': b.outstanding || 0,
      'Mode': b.paymentMode,
      'Month': b.month || (new Date(b.date).getMonth() + 1),
      'Year': b.year || new Date(b.date).getFullYear()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    XLSX.writeFile(wb, `Bills_Export_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bill History</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">View and manage past invoices.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          disabled={filteredBills.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
        >
          <FileSpreadsheet size={18} /> Export Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="md:col-span-2 bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 px-4">
          <Search size={20} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by customer or invoice..." 
            className="flex-1 py-1 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:col-span-2 flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'ALL', label: 'All Time', icon: Calendar },
            { id: 'TODAY', label: 'Today', icon: Filter },
            { id: 'YESTERDAY', label: 'Yesterday', icon: Filter },
            { id: 'MONTH', label: 'This Month', icon: Filter }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${dateFilter === f.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <f.icon size={14} />
              {f.label}
            </button>
          ))}
        </div>
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
              <p className="font-bold">No bills match your filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="py-4 px-6">Bill No.</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Subtotal</th>
                  <th className="py-4 px-6 text-right">Paid</th>
                  <th className="py-4 px-6 text-right">Remaining</th>
                  <th className="py-4 px-6 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => (
                   <tr key={bill?.id || Math.random()} className="hover:bg-indigo-50/30 transition-colors group">
                     <td className="py-4 px-6 font-bold text-slate-700">#{bill?.invoiceNo || (bill?.id && String(bill.id).slice(-4)) || '????'}</td>
                     <td className="py-4 px-6">
                        <p className="text-slate-800 font-bold">{bill.customerName || 'Unnamed Customer'}</p>
                        {bill.previousBalance > 0 ? (
                           <p className="text-[11px] text-amber-600 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded-md inline-block border border-amber-100">
                             Prev. Balance: ₹{parseFloat(bill.previousBalance).toFixed(2)}
                           </p>
                        ) : (
                           bill.prevBalanceIncluded > 0 && (
                             <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-sm flex items-center w-fit mt-1">
                                <ArrowUpRight size={10} className="mr-0.5"/> Udhaar Incl.
                             </span>
                           )
                        )}
                     </td>
                     <td className="py-4 px-6 text-slate-500 text-sm font-medium">
                       {bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A')}
                     </td>
                     <td className="py-4 px-6 text-slate-800 font-black text-right">₹{((parseFloat(bill?.subTotal || 0) || parseFloat(bill?.total || 0) || 0) + parseFloat(bill?.cgst || 0) + parseFloat(bill?.sgst || 0)).toFixed(2)}</td>
                     <td className="py-4 px-6 text-emerald-600 font-black text-right">₹{parseFloat(bill?.amountPaid || 0).toFixed(2)}</td>
                     <td className="py-4 px-6 text-red-500 font-black text-right">₹{parseFloat(bill?.outstanding || 0).toFixed(2)}</td>
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
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedBill.readableDate || new Date(selectedBill.date).toLocaleDateString()}</p>
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
                    {(selectedBill?.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-3.5 px-2 text-slate-800 text-sm font-bold uppercase tracking-tight">{item?.name || 'Unknown Item'}</td>
                        <td className="py-3.5 px-2 text-slate-600 text-sm text-center font-bold">{item?.quantity || 0}</td>
                        <td className="py-3.5 px-2 text-slate-800 text-sm font-black text-right">₹{parseFloat(item?.amount || 0).toFixed(2)}</td>
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
                  <span className="text-3xl font-black text-indigo-700 tracking-tighter">₹{parseFloat(selectedBill.grandTotal || selectedBill.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-600 text-sm">Amount Paid</span>
                  <span className="font-black text-emerald-600 text-lg">₹{parseFloat(selectedBill.amountPaid || 0).toFixed(2)}</span>
                </div>
                {(selectedBill.outstanding || 0) > 0 && (
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-600 text-sm">Outstanding Balance</span>
                    <span className="font-black text-red-600 text-lg">₹{parseFloat(selectedBill.outstanding || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between flex-shrink-0 gap-3">
               <button 
                 onClick={() => {
                   if(window.confirm('Are you sure you want to delete this bill? This will reverse stock and customer balance.')) {
                     deleteBill(selectedBill.id);
                     showToast(`Bill #${selectedBill.invoiceNo} Deleted`, 'success');
                     setSelectedBill(null);
                   }
                 }} 
                 className="px-6 py-2.5 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-all"
               >
                 Delete Bill
               </button>
               <div className="flex gap-3">
                 <button 
                   onClick={() => {
                     generateInvoicePDF(selectedBill, userSettings);
                     showToast('Invoice PDF Generated', 'success');
                   }} 
                   className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                 >
                   <Download size={18} /> Download
                 </button>
                 <button onClick={() => setSelectedBill(null)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-800/20">
                   Close
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
