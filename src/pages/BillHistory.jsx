import React, { useState } from 'react';
import { useBills } from '../context/BillContext';
import { useCustomers } from '../context/PartiesContext';
import { FileText, Search, Eye, X, ArrowUpRight, Filter, FileSpreadsheet, Calendar, ExternalLink, Share2, MessageCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { calculateCustomerBalance } from '../utils/ledger';
import { getWhatsAppLink } from '../utils/whatsapp';

export default function BillHistory() {
  const billsRes = useBills() || {};
  const bills = Array.isArray(billsRes.bills) ? billsRes.bills : [];
  const ledger = Array.isArray(billsRes.ledger) ? billsRes.ledger : [];
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
      'Total Amount': Array.isArray(b.items) && b.items.length > 0 
        ? b.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) 
        : ((parseFloat(b.subTotal) || 0) + (parseFloat(b.cgst) || 0) + (parseFloat(b.sgst) || 0)),
      'Paid': b.amountPaid || 0,
      'Outstanding': b.outstanding || 0,
      'Mode': b.paymentMode,
      'Month': b.month || (new Date(b.date).getMonth() + 1),
      'Year': b.year || new Date(b.date).getFullYear()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bills");
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 flex flex-col w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-8 pt-2 sm:pt-4 page-animate min-w-0" style={{ minHeight: 'calc(100vh - 10rem)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Bill History</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">View and manage past invoices.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          disabled={filteredBills.length === 0}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-5 py-2.5 rounded-[12px] transition-all font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <FileSpreadsheet size={18} /> Export Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
        <div className="md:col-span-2 bg-white dark:bg-slate-800 p-2 rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-600 flex items-center gap-3 px-4 transition-all focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-purple-300">
          <Search size={20} className="text-purple-400" />
          <input 
            type="text" 
            placeholder="Search by customer or invoice..." 
            className="bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 flex-1 py-1 focus:outline-none placeholder: font-medium shadow-none px-0 rounded-none border-none focus:ring-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="md:col-span-2 flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
          {[
            { id: 'ALL', label: 'All Time', icon: Calendar },
            { id: 'TODAY', label: 'Today', icon: Filter },
            { id: 'YESTERDAY', label: 'Yesterday', icon: Filter },
            { id: 'MONTH', label: 'This Month', icon: Filter }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${dateFilter === f.id ? 'bg-white dark:bg-slate-800 transition-colors duration-300 text-purple-600 shadow-sm' : 'text-slate-500 dark:text-slate-500 transition-colors duration-300 hover:text-slate-700 dark:text-slate-300 transition-colors duration-300'}`}
            >
              <f.icon size={14} className={dateFilter === f.id ? 'text-purple-500' : ''} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 space-y-6">
        <div className="overflow-x-auto flex-1 h-full overflow-y-auto custom-scrollbar">
          {bills.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-[16px] shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500 transition-colors duration-300 p-12 h-full">
              <div className="bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 p-6 rounded-full mb-4 text-slate-300">
                <FileText size={48} />
              </div>
              <p className="font-bold text-slate-700 dark:text-slate-300 transition-colors duration-300 text-xl">No bills generated</p>
              <p className="text-sm mt-2 font-medium">Your bill history will appear here.</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-[16px] shadow-sm border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 flex flex-col items-center justify-center text-slate-500 dark:text-slate-500 transition-colors duration-300 p-12 h-full">
              <p className="font-bold">No bills match your filters.</p>
            </div>
          ) : (
            <div className="space-y-8">
               {(!searchTerm && dateFilter === 'ALL' && filteredBills.length > 5) && (
                 <div className="bg-white dark:bg-slate-800 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-600 min-w-0">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                       <h3 className="font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300">Recent Bills</h3>
                    </div>
                     <>
                        {/* Desktop Table View */}
                        <div className="hidden sm:block table-wrapper">
                         <table className="w-full text-left border-collapse min-w-full max-w-sm">
                           <thead className="bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200 dark:border-slate-600">
                             <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                               <th className="py-4 px-6">Bill No.</th>
                               <th className="py-4 px-6">Customer</th>
                               <th className="py-4 px-6">Date</th>
                               <th className="py-4 px-6 text-right">Total</th>
                               <th className="py-4 px-6 text-right">Paid</th>
                               <th className="py-4 px-6 text-right">Remaining</th>
                               <th className="py-4 px-6 text-center w-24">Action</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                             {filteredBills.slice(0, 5).map((bill) => (
                                <tr key={bill?.id || Math.random()} className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/50 transition-colors group">
                                  <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">#{bill?.invoiceNo || (bill?.id && String(bill.id).slice(-4)) || '????'}</td>
                                  <td className="py-4 px-6">
                                     <p className="text-slate-800 dark:text-slate-100 transition-colors duration-300 font-bold">{bill.customerName || 'Unnamed Customer'}</p>
                                  </td>
                                  <td className="py-4 px-6 text-slate-500 dark:text-slate-500 transition-colors duration-300 text-sm font-medium">
                                    {bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A')}
                                  </td>
                                  <td className="py-4 px-6 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-black text-right">
                                    ₹{parseFloat(bill?.grandTotal || bill?.total || 0).toFixed(2)}
                                  </td>
                                  <td className="py-4 px-6 text-emerald-600 font-black text-right">₹{parseFloat(bill?.amountPaid || bill?.paidAmount || 0).toFixed(2)}</td>
                                  <td className="py-4 px-6 text-red-500 font-black text-right">₹{parseFloat(bill?.outstanding || bill?.finalOutstanding || 0).toFixed(2)}</td>
                                  <td className="py-4 px-6 text-center">
                                     <button onClick={() => setSelectedBill(bill)} className="p-2 text-slate-400 group-hover:text-purple-600 hover:bg-white dark:bg-slate-800 transition-colors duration-300 rounded-lg transition-all border border-transparent group-hover:border-purple-100 group-hover:shadow-sm">
                                       <Eye size={18} />
                                     </button>
                                  </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                       
                       {/* Mobile Card View */}
                       <div className="block sm:hidden p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/10">
                         {filteredBills.slice(0, 5).map((bill) => (
                            <div 
                              key={bill?.id || Math.random()} 
                              onClick={() => setSelectedBill(bill)}
                              className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 rounded-xl p-4 shadow-sm active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors cursor-pointer"
                            >
                              <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700/50 transition-colors duration-300 pb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                      #{bill?.invoiceNo || (bill?.id && String(bill.id).slice(-4)) || '????'}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">{bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A')}</span>
                                  </div>
                                  <p className="font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300 text-sm truncate max-w-full max-w-sm">{bill.customerName || 'Unnamed Customer'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 text-lg leading-tight tracking-tight">₹{parseFloat(bill?.grandTotal || bill?.total || 0).toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50 transition-colors duration-300/50">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Paid</span>
                                  <span className="text-emerald-600 font-black text-sm">₹{parseFloat(bill?.amountPaid || bill?.paidAmount || 0).toFixed(2)}</span>
                                </div>
                                <div className="w-px h-6 bg-slate-200"></div>
                                <div className="flex flex-col text-right">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Due</span>
                                  <span className="text-red-500 font-black text-sm">₹{parseFloat(bill?.outstanding || bill?.finalOutstanding || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                         ))}
                       </div>
                     </>
                 </div>
               )}

                <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-700/50 transition-colors duration-300/50 min-w-0">
                  {(!searchTerm && dateFilter === 'ALL' && filteredBills.length > 5) && (
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 transition-colors duration-300 bg-slate-50/50 flex justify-between items-center">
                       <h3 className="font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300">All Bills</h3>
                    </div>
                  )}
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden sm:block table-wrapper">
                      <table className="w-full text-left border-collapse min-w-full max-w-sm">
                        <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-sm z-10 border-b border-slate-200 dark:border-slate-600">
                          <tr className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                            <th className="py-4 px-6">Bill No.</th>
                            <th className="py-4 px-6">Customer</th>
                            <th className="py-4 px-6">Date</th>
                            <th className="py-4 px-6 text-right">Total</th>
                            <th className="py-4 px-6 text-right">Paid</th>
                            <th className="py-4 px-6 text-right">Remaining</th>
                            <th className="py-4 px-6 text-center w-24">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {((!searchTerm && dateFilter === 'ALL' && filteredBills.length > 5) ? filteredBills.slice(5) : filteredBills).map((bill) => (
                             <tr key={bill?.id || Math.random()} className="hover:bg-indigo-50/30 transition-colors group">
                               <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300 transition-colors duration-300">#{bill?.invoiceNo || (bill?.id && String(bill.id).slice(-4)) || '????'}</td>
                               <td className="py-4 px-6">
                                  <p className="text-slate-800 dark:text-slate-100 transition-colors duration-300 font-bold">{bill.customerName || 'Unnamed Customer'}</p>
                               </td>
                               <td className="py-4 px-6 text-slate-500 dark:text-slate-500 transition-colors duration-300 text-sm font-medium">
                                 {bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A')}
                               </td>
                               <td className="py-4 px-6 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-black text-right">
                                 ₹{parseFloat(bill?.grandTotal || bill?.total || 0).toFixed(2)}
                               </td>
                               <td className="py-4 px-6 text-emerald-600 font-black text-right">₹{parseFloat(bill?.amountPaid || bill?.paidAmount || 0).toFixed(2)}</td>
                               <td className="py-4 px-6 text-red-500 font-black text-right">₹{parseFloat(bill?.outstanding || bill?.finalOutstanding || 0).toFixed(2)}</td>
                               <td className="py-4 px-6 text-center">
                                  <button onClick={() => setSelectedBill(bill)} className="p-2 text-slate-400 group-hover:text-purple-600 hover:bg-white dark:bg-slate-800 transition-colors duration-300 rounded-lg transition-all border border-transparent group-hover:border-purple-100 group-hover:shadow-sm">
                                    <Eye size={18} />
                                  </button>
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="block sm:hidden p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/10">
                      {((!searchTerm && dateFilter === 'ALL' && filteredBills.length > 5) ? filteredBills.slice(5) : filteredBills).map((bill) => (
                         <div 
                           key={bill?.id || Math.random()} 
                           onClick={() => setSelectedBill(bill)}
                           className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-600 rounded-xl p-4 shadow-sm active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors cursor-pointer"
                         >
                           <div className="flex justify-between items-start mb-3 border-b border-slate-100 dark:border-slate-700/50 transition-colors duration-300 pb-3">
                             <div>
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                   #{bill?.invoiceNo || (bill?.id && String(bill.id).slice(-4)) || '????'}
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-400">{bill.readableDate || (bill.date ? new Date(bill.date).toLocaleDateString() : 'N/A')}</span>
                               </div>
                               <p className="font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300 text-sm truncate max-w-full max-w-sm">{bill.customerName || 'Unnamed Customer'}</p>
                             </div>
                             <div className="text-right">
                               <p className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 text-lg leading-tight tracking-tight">₹{parseFloat(bill?.grandTotal || bill?.total || 0).toFixed(2)}</p>
                             </div>
                           </div>
                           <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50 transition-colors duration-300/50">
                             <div className="flex flex-col">
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Paid</span>
                               <span className="text-emerald-600 font-black text-sm">₹{parseFloat(bill?.amountPaid || bill?.paidAmount || 0).toFixed(2)}</span>
                             </div>
                             <div className="w-px h-6 bg-slate-200"></div>
                             <div className="flex flex-col text-right">
                               <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Due</span>
                               <span className="text-red-500 font-black text-sm">₹{parseFloat(bill?.outstanding || bill?.finalOutstanding || 0).toFixed(2)}</span>
                             </div>
                           </div>
                         </div>
                      ))}
                    </div>
                  </>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* View Bill Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 transition-colors duration-300 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] w-full max-w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-700/50 transition-colors duration-300/80">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 transition-colors duration-300 flex justify-between items-center bg-white dark:bg-slate-800 transition-colors duration-300 flex-shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full pointer-events-none"></div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300 flex items-center gap-3 relative z-10">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2 rounded-[10px] shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                  <FileText size={20} />
                </div>
                Invoice Details
              </h3>
              <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors duration-300 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white dark:bg-slate-800 transition-colors duration-300 custom-scrollbar" id="receipt-content">
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100 dark:border-slate-700/50 transition-colors duration-300 shadow-sm rounded-b-xl p-4 bg-slate-50/50">
                <div>
                  <p className="text-[10px] text-slate-400 font-black mb-1 tracking-widest uppercase">Bill To</p>
                  <p className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 text-xl uppercase">{selectedBill.customerName}</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-500 transition-colors duration-300 mt-1">{selectedBill.customerPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-black mb-1 tracking-widest uppercase">Invoice Info</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300">#{selectedBill.invoiceNo}</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-500 transition-colors duration-300 mt-1">{selectedBill.readableDate || new Date(selectedBill.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-8 bg-slate-50/50 p-2 rounded-[20px] border border-slate-100 dark:border-slate-700/50 transition-colors duration-300/50">
                <div className="px-4 py-1 flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  <span>Purchased Items</span>
                  <span>Amount</span>
                </div>
                {(selectedBill?.items || []).map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 transition-colors duration-300 p-4 rounded-[16px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 flex items-center justify-between transition-all hover:border-indigo-100 hover:shadow-md animate-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300 text-[15px] leading-tight uppercase tracking-tight">{item?.name || 'Unknown Item'}</h4>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400 transition-colors duration-300 font-semibold text-xs bg-slate-100 px-2.5 py-1 rounded-[8px]">
                          {item?.quantity || 0} × ₹{parseFloat(item?.rate || item?.price || ((item?.amount || 0) / (item?.quantity || 1)) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-800 dark:text-slate-100 transition-colors duration-300 text-lg block leading-none">₹{parseFloat(item?.amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 flex flex-col gap-3 shadow-inner">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-500 transition-colors duration-300 text-sm font-bold">
                  <span>Subtotal</span>
                  <span>₹{(selectedBill.subTotal || selectedBill.total || 0).toFixed(2)}</span>
                </div>
                {selectedBill.gstEnabled && userSettings.uiMode === 'advanced' && (
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-500 transition-colors duration-300 text-sm font-bold">
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
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
                  <span className="font-black text-slate-700 dark:text-slate-300 transition-colors duration-300 uppercase tracking-wider text-xs">Final Net Total</span>
                  <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tighter">₹{parseFloat(selectedBill.grandTotal || selectedBill.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
                  <span className="font-bold text-slate-600 dark:text-slate-400 transition-colors duration-300 text-sm">Amount Paid</span>
                  <span className="font-black text-emerald-600 text-lg">₹{parseFloat(selectedBill.amountPaid || 0).toFixed(2)}</span>
                </div>
                {(selectedBill.outstanding || 0) > 0 && (
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
                    <span className="font-bold text-slate-600 dark:text-slate-400 transition-colors duration-300 text-sm">Outstanding Balance</span>
                    <span className="font-black text-red-600 text-lg">₹{parseFloat(selectedBill.outstanding || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 transition-colors duration-300 bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 flex flex-wrap gap-2 sm:gap-3 flex-shrink-0">
               <button 
                 onClick={() => {
                   if(window.confirm('Are you sure you want to delete this bill? This will reverse stock and customer balance.')) {
                     deleteBill(selectedBill.id);
                     showToast(`Bill #${selectedBill.invoiceNo} Deleted`, 'success');
                     setSelectedBill(null);
                   }
                 }} 
                 className="px-4 py-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold rounded-[12px] transition-all text-sm"
               >
                 Delete
               </button>
                  {selectedBill.pdf_link && (
                    <a
                      href={selectedBill.pdf_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-sm"
                    >
                      <ArrowUpRight size={16} /> Drive
                    </a>
                  )}
                  <a
                    href={getWhatsAppLink(selectedBill, userSettings?.businessName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-sm"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                  <button 
                    onClick={async () => {
                      try {
                        const custId = selectedBill.customerId || selectedBill.customer_id;
                        const filteredLedger = ledger.filter(e => e.invoice_id !== selectedBill.invoiceNo);
                        const calculatedPrevBalance = calculateCustomerBalance(filteredLedger, custId, (customers || []).find(c => c.id === custId));
                        const pdfPayload = { ...selectedBill, prevBalanceIncluded: calculatedPrevBalance };
                        const { doc, fileName } = await generateInvoicePDF(pdfPayload, userSettings);
                        const blob = doc.output('blob');
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        if (navigator.share) {
                          try {
                            const file = new File([blob], fileName, { type: 'application/pdf' });
                            await navigator.share({ title: 'Invoice', files: [file] });
                          } catch (shareErr) { /* user cancelled share */ }
                        }
                        showToast('Invoice PDF opened for preview', 'success');
                      } catch (err) {
                        console.error('PDF manual generate failed:', err);
                        showToast('Failed to generate PDF', 'error');
                      }
                    }} 
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 transition-colors duration-300 border border-slate-200 dark:border-slate-700 transition-colors duration-300 hover:border-purple-300 hover:bg-purple-50 text-purple-700 font-bold rounded-[12px] transition-all shadow-sm flex items-center gap-1.5 text-sm"
                  >
                    <ExternalLink size={16} /> Preview
                  </button>
                 <button onClick={() => setSelectedBill(null)} className="px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-bold rounded-[12px] transition-all shadow-sm text-sm ml-auto">
                   Close
                 </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
