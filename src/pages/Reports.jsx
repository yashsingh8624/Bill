import React, { useState, useRef } from 'react';
import { useBills } from '../context/BillContext';
import { useCustomers } from '../context/CustomerContext';
import { useSettings } from '../context/SettingsContext';
import { BarChart3, Download, FileSpreadsheet, Send, Filter, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Reports() {
  const { bills } = useBills();
  const { customers } = useCustomers();
  const { userSettings } = useSettings();
  
  const [reportType, setReportType] = useState('SALES'); // SALES, GST, OUTSTANDING
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, TODAY, MONTH, CUSTOM
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const reportRef = useRef(null);

  // Filter bills by time
  const getFilteredBills = () => {
    let filtered = [...bills];
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7); // YYYY-MM

    if (timeFilter === 'TODAY') {
      filtered = filtered.filter(b => b.date.startsWith(todayStr));
    } else if (timeFilter === 'MONTH') {
      filtered = filtered.filter(b => b.date.startsWith(thisMonthStr));
    } else if (timeFilter === 'CUSTOM' && customRange.start && customRange.end) {
      filtered = filtered.filter(b => {
         const d = b.date.split('T')[0];
         return d >= customRange.start && d <= customRange.end;
      });
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

  const handleExportExcel = () => {
    if (reportType === 'SALES') {
      const data = filteredBills.map(b => ({
        'Invoice No': b.invoiceNo || b.id.slice(-4),
        'Date': new Date(b.date).toLocaleDateString(),
        'Customer': b.customerName,
        'Subtotal': b.subTotal || 0,
        'Total Amount': b.grandTotal || b.total || 0,
        'Amount Paid': b.amountPaid || 0,
        'Outstanding': b.outstanding || 0,
        'Payment Mode': b.paymentMode || 'Cash'
      }));
      exportToExcel(data, `Sales_Report_${timeFilter}`);
    } else if (reportType === 'GST') {
      const data = gstBills.map(b => ({
         'Invoice No': b.invoiceNo || b.id.slice(-4),
         'Date': new Date(b.date).toLocaleDateString(),
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

  const handleExportPDF = async () => {
     if (!reportRef.current) return;
     try {
       const canvas = await html2canvas(reportRef.current, { scale: 2 });
       const imgData = canvas.toDataURL('image/png');
       const pdf = new jsPDF('p', 'mm', 'a4');
       const pdfWidth = pdf.internal.pageSize.getWidth();
       const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
       pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
       pdf.save(`${reportType}_Report.pdf`);
     } catch (err) {
       console.error("PDF Export failed", err);
       alert("Failed to export PDF.");
     }
  };

  const handleSendAllReminders = () => {
    if (outstandingCustomers.length === 0) {
      alert("No outstanding customers found.");
      return;
    }
    
    if(window.confirm("This will attempt to open WhatsApp for each customer sequentially. Please allow popups. Proceed?")) {
      outstandingCustomers.forEach((c, i) => {
        if(c.phone) {
           setTimeout(() => {
             const phone = c.phone.startsWith('+91') ? c.phone : `+91${c.phone}`;
             const message = `Dear ${c.name}, aapka pending balance ₹${c.balance.toFixed(2)} hai. Kripya jald clear karein.\n- ${userSettings.ownerName} | ${userSettings.businessName}`;
             const url = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
             window.open(url, '_blank');
           }, i * 1500);
        }
      });
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col relative w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Smart Reports</h2>
          <p className="text-slate-500 text-sm mt-1">Generate sales, tax, and ledger reports.</p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {reportType === 'OUTSTANDING' && (
             <button onClick={handleSendAllReminders} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl transition-all font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap text-sm">
               <Send size={16} /> Send Reminders
             </button>
          )}
          <button onClick={handleExportPDF} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap text-sm">
            <FileText size={16} /> PDF
          </button>
          <button onClick={handleExportExcel} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 shadow-sm whitespace-nowrap text-sm">
            <FileSpreadsheet size={16} /> Excel
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 flex-shrink-0 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Report Type</label>
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button onClick={() => setReportType('SALES')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${reportType === 'SALES' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Sales</button>
             <button onClick={() => setReportType('GST')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${reportType === 'GST' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>GST / Tax</button>
             <button onClick={() => setReportType('OUTSTANDING')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${reportType === 'OUTSTANDING' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>Outstanding</button>
          </div>
        </div>
        {reportType !== 'OUTSTANDING' && (
           <div className="w-full md:w-auto flex gap-3">
             <div className="flex-1 md:w-48">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Time Period</label>
               <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="ALL">All Time</option>
                  <option value="MONTH">This Month</option>
                  <option value="TODAY">Today</option>
                  <option value="CUSTOM">Custom Range</option>
               </select>
             </div>
             {timeFilter === 'CUSTOM' && (
               <div className="flex gap-2 flex-1 md:w-[280px]">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start</label>
                   <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="w-full border border-slate-200 px-2 py-2 rounded-lg text-sm font-medium" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">End</label>
                   <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="w-full border border-slate-200 px-2 py-2 rounded-lg text-sm font-medium" />
                 </div>
               </div>
             )}
           </div>
        )}
      </div>

      {/* Dynamic Content (Exportable View) */}
      <div className="flex-1 overflow-hidden flex flex-col gap-6 w-full min-h-0 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" ref={reportRef}>
         {/* Report Header (Visible mainly for PDF export) */}
         <div className="flex justify-between items-center pb-4 border-b border-slate-100 flex-shrink-0">
           <div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-wider">{reportType} REPORT</h3>
             <p className="text-sm font-medium text-slate-500 mt-1">{reportType !== 'OUTSTANDING' ? `Period: ${timeFilter === 'CUSTOM' ? `${customRange.start} to ${customRange.end}` : timeFilter}` : `As of ${new Date().toLocaleDateString()}`}</p>
           </div>
           <div className="text-right">
              <h4 className="font-bold text-slate-800">{userSettings.businessName}</h4>
              <p className="text-sm text-slate-500">{userSettings.phone}</p>
           </div>
         </div>

         {/* Report Content */}
         <div className="flex-1 overflow-auto flex flex-col gap-6 w-full min-h-0 pt-2">
            {reportType === 'SALES' && (
               <div className="flex flex-col h-full animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 flex-shrink-0">
                     <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                       <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-1">Total Sales</p>
                       <h3 className="text-2xl font-black text-indigo-700">₹{totalSales.toFixed(2)}</h3>
                     </div>
                     <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                       <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1">Collections</p>
                       <h3 className="text-2xl font-black text-emerald-700">₹{totalPaid.toFixed(2)}</h3>
                     </div>
                     <div className="bg-red-50 p-5 rounded-xl border border-red-100">
                       <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1">Credit Given</p>
                       <h3 className="text-2xl font-black text-red-600">₹{totalDuesThisPeriod.toFixed(2)}</h3>
                     </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden min-h-0">
                     <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                           <tr className="text-xs uppercase text-slate-500 tracking-wider">
                              <th className="py-3 px-6 font-bold">Date</th>
                              <th className="py-3 px-6 font-bold">Invoice</th>
                              <th className="py-3 px-6 font-bold text-right">Amount</th>
                              <th className="py-3 px-6 font-bold text-right">Paid</th>
                              <th className="py-3 px-6 font-bold text-center">Mode</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {filteredBills.map(b => (
                              <tr key={b.id} className="hover:bg-slate-50">
                                <td className="py-3 px-6 text-sm text-slate-600 font-medium">{new Date(b.date).toLocaleDateString()}</td>
                                <td className="py-3 px-6 text-sm font-bold text-slate-800">#{b.invoiceNo || b.id.slice(-4)}</td>
                                <td className="py-3 px-6 text-sm font-black text-right text-slate-800">₹{(b.grandTotal||b.total||0).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm font-black text-right text-emerald-600 bg-emerald-50/30">₹{(b.amountPaid||0).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm text-center">
                                   <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-black shadow-sm border border-slate-200">
                                     {b.paymentMode || 'Cash'}
                                   </span>
                                </td>
                              </tr>
                           ))}
                           {filteredBills.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-500 font-medium">No sales data for this period.</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {reportType === 'GST' && (
               <div className="flex flex-col h-full animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 flex-shrink-0">
                     <div className="bg-slate-800 p-5 rounded-xl shadow-md">
                       <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total GST Collected</p>
                       <h3 className="text-2xl font-black text-white">₹{totalGstCollected.toFixed(2)}</h3>
                     </div>
                     <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                       <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total CGST</p>
                       <h3 className="text-2xl font-black text-slate-800">₹{totalCgst.toFixed(2)}</h3>
                     </div>
                     <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                       <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total SGST</p>
                       <h3 className="text-2xl font-black text-slate-800">₹{totalSgst.toFixed(2)}</h3>
                     </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden min-h-0">
                     <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                           <tr className="text-xs uppercase text-slate-500 tracking-wider">
                              <th className="py-3 px-6 font-bold">Date</th>
                              <th className="py-3 px-6 font-bold">Invoice</th>
                              <th className="py-3 px-6 font-bold text-right">Subtotal</th>
                              <th className="py-3 px-6 font-bold text-center">GST %</th>
                              <th className="py-3 px-6 font-bold text-right">Tax Amt.</th>
                              <th className="py-3 px-6 font-bold text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {gstBills.map(b => (
                              <tr key={b.id} className="hover:bg-slate-50">
                                <td className="py-3 px-6 text-sm text-slate-600 font-medium">{new Date(b.date).toLocaleDateString()}</td>
                                <td className="py-3 px-6 text-sm font-bold text-slate-800">#{b.invoiceNo || b.id.slice(-4)}</td>
                                <td className="py-3 px-6 text-sm text-right font-bold text-slate-600">₹{(b.subTotal||0).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm text-center font-black text-indigo-700 bg-indigo-50/50">{b.gstRate}%</td>
                                <td className="py-3 px-6 text-sm font-black text-right text-slate-800">₹{((b.cgst||0)+(b.sgst||0)).toFixed(2)}</td>
                                <td className="py-3 px-6 text-sm font-black text-right text-emerald-600 bg-emerald-50/30">₹{(b.grandTotal||0).toFixed(2)}</td>
                              </tr>
                           ))}
                           {gstBills.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-500 font-medium">No GST billed invoices for this period.</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {reportType === 'OUTSTANDING' && (
               <div className="flex flex-col h-full animate-in fade-in duration-300">
                  <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm mb-6 flex-shrink-0 flex items-center justify-between">
                     <div>
                       <p className="text-red-600 text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Filter size={14}/> Total Market Outstanding</p>
                       <h3 className="text-4xl font-black text-red-700">₹{aggregateOutstanding.toFixed(2)}</h3>
                     </div>
                     <div className="text-right bg-white px-4 py-2 rounded-lg border border-red-100 shadow-sm">
                       <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-0.5">Affected</p>
                       <h3 className="text-xl font-black text-red-600">{outstandingCustomers.length} Customers</h3>
                     </div>
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden min-h-0">
                     <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                           <tr className="text-xs uppercase text-slate-500 tracking-wider">
                              <th className="py-3 px-6 font-bold">Customer Name</th>
                              <th className="py-3 px-6 font-bold">Phone Contact</th>
                              <th className="py-3 px-6 font-bold text-right text-red-500 bg-red-50/30">Pending Amount</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {outstandingCustomers.map(c => (
                              <tr key={c.id} className="hover:bg-red-50/30 transition-colors">
                                <td className="py-4 px-6 text-sm font-bold text-slate-800 uppercase tracking-wide">{c.name}</td>
                                <td className="py-4 px-6 text-sm text-slate-600 font-medium">{c.phone || '-'}</td>
                                <td className="py-4 px-6 text-sm font-black text-right text-red-600 bg-red-50/10">₹{(c.balance||0).toFixed(2)}</td>
                              </tr>
                           ))}
                           {outstandingCustomers.length === 0 && <tr><td colSpan="3" className="text-center py-12 text-emerald-600 font-bold bg-emerald-50/30">Amazing! All customer invoices are fully paid. 🎉</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
