import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, CheckCircle, Download, Upload, Database, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Settings() {
  const context = useAppContext();
  const { userSettings, updateSettings } = context;
  
  const [formData, setformData] = useState(userSettings);
  const [savedStatus, setSavedStatus] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  // Full System Export to Excel
  const exportAllToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Products
    const productsWs = XLSX.utils.json_to_sheet(context.products);
    XLSX.utils.book_append_sheet(wb, productsWs, "Products");
    
    // 2. Customers
    const customersData = context.customers.map(c => ({
      ID: c.id, Name: c.name, Phone: c.phone, Balance: c.balance, CreatedAt: c.createdAt
    }));
    const customersWs = XLSX.utils.json_to_sheet(customersData);
    XLSX.utils.book_append_sheet(wb, customersWs, "Customers");

    // 3. Suppliers
    const suppliersData = context.suppliers.map(s => ({
      ID: s.id, Name: s.name, Business: s.businessName, Phone: s.phone, Balance: s.balance, CreatedAt: s.createdAt
    }));
    const suppliersWs = XLSX.utils.json_to_sheet(suppliersData);
    XLSX.utils.book_append_sheet(wb, suppliersWs, "Suppliers");

    // 4. Bills
    const billsData = context.bills.map(b => ({
      Invoice: b.invoiceNo, Date: b.date, Customer: b.customerName, Phone: b.customerPhone, Total: b.grandTotal||b.total||0, Paid: b.amountPaid, Outstanding: b.outstanding, PaymentMode: b.paymentMode
    }));
    const billsWs = XLSX.utils.json_to_sheet(billsData);
    XLSX.utils.book_append_sheet(wb, billsWs, "Bills");

    XLSX.writeFile(wb, `SmartBill_Complete_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Backup System to JSON
  const downloadBackup = () => {
    const backupData = {
      settings: localStorage.getItem('smartbill_settings'),
      auth: localStorage.getItem('smartbill_auth'),
      products: localStorage.getItem('smartbill_products'),
      bills: localStorage.getItem('smartbill_bills'),
      customers: localStorage.getItem('smartbill_customers'),
      suppliers: localStorage.getItem('smartbill_suppliers')
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `SmartBill_Backup_${new Date().getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Restore from JSON Backup
  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.products && data.settings) {
          if(window.confirm("WARNING: This will overwrite ALL your current data. Are you sure you want to restore?")) {
             localStorage.setItem('smartbill_settings', data.settings);
             localStorage.setItem('smartbill_auth', data.auth || 'true');
             localStorage.setItem('smartbill_products', data.products);
             localStorage.setItem('smartbill_bills', data.bills || '[]');
             localStorage.setItem('smartbill_customers', data.customers || '[]');
             localStorage.setItem('smartbill_suppliers', data.suppliers || '[]');
             
             alert("Backup restored successfully! Application will now reload.");
             window.location.reload();
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Error reading backup file.");
      }
    };
    reader.readAsText(file);
    // resetting input
    e.target.value = null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Settings & Data Management</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your business profile, app preferences, and database.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Business Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name</label>
                <input 
                  type="text" required
                  value={formData.businessName}
                  onChange={e => setformData({...formData, businessName: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-800 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner / Contact Name</label>
                <input 
                  type="text" required
                  value={formData.ownerName}
                  onChange={e => setformData({...formData, ownerName: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-800 shadow-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner WhatsApp Number (for reminders)</label>
                <input 
                  type="text" required
                  placeholder="e.g. 919876543210 (include country code)"
                  value={formData.ownerPhone}
                  onChange={e => setformData({...formData, ownerPhone: e.target.value.replace(/\D/g, '')})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-slate-800 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            {savedStatus && (
              <span className="text-emerald-600 flex items-center gap-1.5 font-medium text-sm animate-in fade-in">
                 <CheckCircle size={16} /> Preferences saved
              </span>
            )}
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Save size={18} /> Save Details
            </button>
          </div>
        </form>
      </div>

      {/* Data Management Section */}
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 pt-4">
         <Database size={20} className="text-indigo-600" /> Data Management
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full mb-4">
            <FileSpreadsheet size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Export to Excel</h4>
          <p className="text-sm text-slate-500 mb-6 flex-1">Generate a comprehensive Excel workbook (.xlsx) containing all Products, Customers, Bills, and Suppliers.</p>
          <button onClick={exportAllToExcel} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
            <Download size={18} /> Export Excel
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-full mb-4">
            <Download size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Backup Data</h4>
          <p className="text-sm text-slate-500 mb-6 flex-1">Download a secure JSON backup of your offline database to save your data safely on your device.</p>
          <button onClick={downloadBackup} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
            <Download size={18} /> Download Backup
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-full mb-4">
            <Upload size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Restore Backup</h4>
          <p className="text-sm text-slate-500 mb-6 flex-1">Restore your system state from a previously saved JSON backup file. <br/><span className="text-red-500 font-medium">Overwrites current data.</span></p>
          
          <input 
             type="file" accept=".json"
             ref={fileInputRef} onChange={handleRestore} className="hidden"
          />
          <button onClick={() => fileInputRef.current.click()} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
            <Upload size={18} /> Restore Backup
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 border-t border-red-100 pt-8">
        <h3 className="text-xl font-bold text-red-600 flex items-center gap-2 mb-4">
           Danger Zone
        </h3>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
             <h4 className="font-bold text-red-800">Factory Reset Application</h4>
             <p className="text-sm text-red-600 mt-1">Permanently deletes all products, bills, customers, settings, and logs you out. This action cannot be undone.</p>
           </div>
           <button onClick={() => {
              if(window.confirm("CRITICAL WARNING: This will permanently delete ALL data. Are you absolutely sure?")) {
                 localStorage.clear();
                 sessionStorage.clear();
                 window.location.href = '/login';
              }
           }} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold whitespace-nowrap shadow-sm transition-colors">
              Reset All Data
           </button>
        </div>
      </div>
    </div>
  );
}
