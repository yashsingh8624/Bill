import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart3, Download, FileSpreadsheet, Send } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Reports() {
  const { bills, customers, userSettings } = useAppContext();
  const [reportType, setReportType] = useState('SALES'); // SALES, GST, OUTSTANDING
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, TODAY, MONTH

  // Filter bills by time
  const getFilteredBills = () => {
    let filtered = [...bills];
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7); // YYYY-MM

    if (timeFilter === 'TODAY') {
      filtered = filtered.filter(b => b.date === todayStr);
    } else if (timeFilter === 'MONTH') {
      filtered = filtered.filter(b => b.date.startsWith(thisMonthStr));
    }
    return filtered;
  };

  const filteredBills = getFilteredBills();

  // Report 1: Sales Summary
  const totalSales = filteredBills.reduce((sum, b) => sum + (b.grandTotal || b.total || 0), 0);
  const totalPaid = filteredBills.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
  const totalDuesThisPeriod = filteredBills.reduce((sum, b) => sum + (b.outstanding || 0), 0);

  // Report 2: GST
  const gstBills = filteredBills.filter(b => b.gstEnabled);
  const totalGstCollected = gstBills.reduce((sum, b) => sum + ((b.cgst || 0) + (b.sgst || 0)), 0);
  const totalCgst = gstBills.reduce((sum, b) => sum + (b.cgst || 0), 0);
  const totalSgst = gstBills.reduce((sum, b) => sum + (b.sgst || 0), 0);

  // Report 3: Outstanding (All customers with pending amount)
  const outstandingCustomers = customers.filter(c => (c.balance || 0) > 0).sort((a,b) => b.balance - a.balance);
  const aggregateOutstanding = outstandingCustomers.reduce((sum, c) => sum + c.balance, 0);

  // EXPORT FUNCTIONS
  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handleExport = () => {
    if (reportType === 'SALES') {
      const data = filteredBills.map(b => ({
        'Invoice No': b.invoiceNo || b.id,
        'Date': b.date,
        'Customer': b.customerName,
        'Subtotal': b.subTotal || 0,
        'Total Amount': b.grandTotal || b.total || 0,
        'Amount Paid': b.amountPaid || 0,
        'Outstanding': b.outstanding || 0,
        'Payment Mode': b.paymentMode || 'N/A'
      }));
      exportToExcel(data, `Sales_Report_${timeFilter}`);
    } else if (reportType === 'GST') {
      const data = gstBills.map(b => ({
         'Invoice No': b.invoiceNo || b.id,
         'Date': b.date,
         'Customer': b.customerName,
         'Subtotal': b.subTotal || 0,
         'GST Rate': `${b.gstRate}%`,
         'CGST': b.cgst || 0,
         'SGST': b.sgst || 0,
         'Total Tax': (b.cgst || 0) + (b.sgst || 0),
         'Grand Total': b.grandTotal || 0
      }));
      exportToExcel(data, `GST_Report_${timeFilter}`);
    } else if (reportType === 'OUTSTANDING') {
      const data = outstandingCustomers.map(c => ({
        'Customer ID': c.id,
        'Name': c.name,
        'Phone': c.phone || 'N/A',
        'Total Outstanding': c.balance || 0
      }));
      exportToExcel(data, 'Outstanding_Report');
    }
  };

  const handleSendAllReminders = () => {
    // Collect all phones
    if (outstandingCustomers.length === 0) {
      alert("No outstanding customers found.");
      return;
    }
    
    // We can't automatically send messages in bulk directly via web links without user interaction for each
    // We will simulate it by telling user it opens WhatsApp Web sequentially
    if(window.confirm("This will attempt to open WhatsApp for each customer sequentially. Please allow popups. Proceed?")) {
      outstandingCustomers.forEach((c, i) => {
        if(c.phone) {
           setTimeout(() => {
             const phone = c.phone.startsWith('+91') ? c.phone : `+91${c.phone}`;
             const message = `Dear ${c.name}, aapka pending balance ₹${c.balance.toFixed(2)} hai. Kripya jald clear karein.\n- ${userSettings.ownerName} | ${userSettings.businessName}`;
             const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
             window.open(url, '_blank');
           }, i * 1500); // staggering
        }
      });
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col relative w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports Module</h2>
          <p className="text-slate-500 text-sm mt-1">Generate sales, tax, and ledger reports.</p>
        </div>
        <div className="flex gap-3">
          {reportType === 'OUTSTANDING' && (
             <button onClick={handleSendAllReminders} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl transition-all font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
               <Send size={18} /> Send All Reminders
             </button>
          )}
          <button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 flex-shrink-0">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Report Type</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button onClick={() => setReportType('SALES')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${reportType === 'SALES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Sales Summary</button>
             <button onClick={() => setReportType('GST')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${reportType === 'GST' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>GST Report</button>
             <button onClick={() => setReportType('OUTSTANDING')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${reportType === 'OUTSTANDING' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Outstanding</button>
          </div>
        </div>
        {reportType !== 'OUTSTANDING' && (
           <div className="sm:w-64">
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Time Period</label>
             <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500">
                <option value="ALL">All Time</option>
                <option value="MONTH">This Month</option>
                <option value="TODAY">Today</option>
             </select>
           </div>
        )}
      </div>

      {/* Dynamic Content */}
      <div className="flex-1 overflow-hidden flex flex-col gap-6 w-full min-h-0">
         {reportType === 'SALES' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 flex-shrink-0">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium mb-1">Total Sales Amount</p>
                    <h3 className="text-2xl font-black text-slate-800">₹{totalSales.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium mb-1">Total Collections</p>
                    <h3 className="text-2xl font-black text-emerald-600">₹{totalPaid.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium mb-1">New Credit Given</p>
                    <h3 className="text-2xl font-black text-red-500">₹{totalDuesThisPeriod.toFixed(2)}</h3>
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-800 flex items-center gap-2">
                     <BarChart3 size={18} className="text-indigo-600" /> Sales Transactions List
                  </div>
                  <div className="overflow-auto p-0 flex-1">
                     <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white border-b border-slate-200">
                           <tr className="text-xs uppercase text-slate-500">
                              <th className="py-3 px-6 font-semibold">Date</th>
                              <th className="py-3 px-6 font-semibold">Invoice</th>
                              <th className="py-3 px-6 font-semibold text-right">Amount</th>
                              <th className="py-3 px-6 font-semibold text-right">Paid</th>
                              <th className="py-3 px-6 font-semibold text-center">Mode</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {filteredBills.map(b => (
                              <tr key={b.id} className="hover:bg-slate-50">
                                <td className="py-3 px-6 text-sm text-slate-600">{new Date(b.date).toLocaleDateString()}</td>
                                <td className="py-3 px-6 text-sm font-bold text-slate-800">#{b.invoiceNo || b.id.slice(-4)}</td>
                                <td className="py-3 px-6 text-sm font-bold text-right text-slate-800">₹{(b.grandTotal||b.total||0).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm font-medium text-right text-emerald-600">₹{(b.amountPaid||0).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm text-center">
                                   <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                                     {b.paymentMode || 'Cash'}
                                   </span>
                                </td>
                              </tr>
                           ))}
                           {filteredBills.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-500">No sales data for this period.</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {reportType === 'GST' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 flex-shrink-0">
                  <div className="bg-indigo-900 p-5 rounded-2xl shadow-lg shadow-indigo-200">
                    <p className="text-indigo-200 text-sm font-medium mb-1">Total GST Collected</p>
                    <h3 className="text-2xl font-black text-white">₹{totalGstCollected.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium mb-1">Total CGST</p>
                    <h3 className="text-2xl font-black text-slate-800">₹{totalCgst.toFixed(2)}</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-medium mb-1">Total SGST</p>
                    <h3 className="text-2xl font-black text-slate-800">₹{totalSgst.toFixed(2)}</h3>
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-800 flex items-center gap-2">
                     <FileSpreadsheet size={18} className="text-indigo-600" /> Tax Transactions
                  </div>
                  <div className="overflow-auto p-0 flex-1">
                     <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white border-b border-slate-200">
                           <tr className="text-xs uppercase text-slate-500">
                              <th className="py-3 px-6 font-semibold">Date</th>
                              <th className="py-3 px-6 font-semibold">Invoice</th>
                              <th className="py-3 px-6 font-semibold text-right">Subtotal</th>
                              <th className="py-3 px-6 font-semibold text-center">GST %</th>
                              <th className="py-3 px-6 font-semibold text-right">Tax Amt.</th>
                              <th className="py-3 px-6 font-semibold text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {gstBills.map(b => (
                              <tr key={b.id} className="hover:bg-slate-50">
                                <td className="py-3 px-6 text-sm text-slate-600">{new Date(b.date).toLocaleDateString()}</td>
                                <td className="py-3 px-6 text-sm font-bold text-slate-800">#{b.invoiceNo || b.id.slice(-4)}</td>
                                <td className="py-3 px-6 text-sm text-right font-medium text-slate-600">₹{(b.subTotal||0).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm text-center font-bold text-indigo-700">{b.gstRate}%</td>
                                <td className="py-3 px-6 text-sm font-bold text-right text-slate-800">₹{((b.cgst||0)+(b.sgst||0)).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm font-bold text-right text-slate-800">₹{(b.grandTotal||0).toFixed(2)}</td>
                              </tr>
                           ))}
                           {gstBills.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-500">No GST billed invoices for this period.</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {reportType === 'OUTSTANDING' && (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
               <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm mb-6 flex-shrink-0 flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-sm font-bold uppercase mb-1">Total Market Outstanding</p>
                    <h3 className="text-3xl font-black text-red-700">₹{aggregateOutstanding.toFixed(2)}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-red-500 text-sm font-medium">From</p>
                    <h3 className="text-xl font-black text-red-600">{outstandingCustomers.length} Customers</h3>
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-800 flex items-center gap-2">
                     <FileSpreadsheet size={18} className="text-slate-500" /> Pending Balances Ledger
                  </div>
                  <div className="overflow-auto p-0 flex-1">
                     <table className="w-full text-left">
                        <thead className="sticky top-0 bg-white border-b border-slate-200">
                           <tr className="text-xs uppercase text-slate-500">
                              <th className="py-3 px-6 font-semibold">Customer Name</th>
                              <th className="py-3 px-6 font-semibold">Phone Contact</th>
                              <th className="py-3 px-6 font-semibold text-right">Pending Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {outstandingCustomers.map(c => (
                              <tr key={c.id} className="hover:bg-red-50/30">
                                <td className="py-4 px-6 text-sm font-bold text-slate-800">{c.name}</td>
                                <td className="py-4 px-6 text-sm text-slate-600 font-medium">{c.phone || 'N/A'}</td>
                                <td className="py-4 px-6 text-sm font-black text-right text-red-600">₹{(c.balance||0).toFixed(2)}</td>
                              </tr>
                           ))}
                           {outstandingCustomers.length === 0 && <tr><td colSpan="3" className="text-center py-8 text-slate-500">Amazing! All customer invoices are fully paid.</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
