import React, { useState, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useInventory } from '../context/InventoryContext';
import { useCustomers, useSuppliers } from '../context/PartiesContext';
import { useBills } from '../context/BillContext';
import { useAudit } from '../context/AuditContext';
import { Save, CheckCircle, Download, Upload, Database, FileSpreadsheet, Image as ImageIcon, Zap, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import * as XLSX from 'xlsx';
import { exportBackup, restoreBackup } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import { clearAllSheetData } from '../utils/sheetsService';

export default function Settings() {
  const { userSettings, updateSettings } = useSettings();
  const { products } = useInventory();
  const { customers } = useCustomers();
  const { suppliers } = useSuppliers();
  const { addLog } = useAudit();
  const { spreadsheetId, logout, user } = useAuth();
  const { showToast } = useToast();
  const { bills } = useBills();
  
  const [formData, setFormData] = useState({
    businessName: userSettings?.businessName || '',
    ownerName: userSettings?.ownerName || '',
    ownerPhone: userSettings?.ownerPhone || '',
    businessAddress: userSettings?.businessAddress || '',
    gstNumber: userSettings?.gstNumber || '',
    currency: userSettings?.currency || '₹',
    invoicePrefix: userSettings?.invoicePrefix || 'INV-',
    logo: userSettings?.logo || '',
    qrImage: userSettings?.qrImage || '',
    uiMode: userSettings?.uiMode || 'advanced',
    bankName: userSettings?.bankName || '',
    bankAccount: userSettings?.bankAccount || '',
    bankIFSC: userSettings?.bankIFSC || '',
    termsAndConditions: userSettings?.termsAndConditions || 'Goods once sold will not be taken back. Subject to local jurisdiction.'
  });
  
  const [savedStatus, setSavedStatus] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
    addLog('SETTINGS_CHANGE', 'SETTINGS', 'global', { businessName: formData.businessName, uiMode: formData.uiMode });
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 500) { // Limit to 500KB to prevent localStorage quota issues
        alert("Logo file is too large! Please upload smaller image (Max 500KB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: '' });
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 500) {
        alert("QR file is too large! Please upload smaller image (Max 500KB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, qrImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeQr = () => {
    setFormData({ ...formData, qrImage: '' });
  };

  // Full System Export to Excel
  const exportAllToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Products
    const productsWs = XLSX.utils.json_to_sheet(products);
    XLSX.utils.book_append_sheet(wb, productsWs, "Products");
    
    // 2. Customers
    const customersData = customers.map(c => ({
      ID: c.id, Name: c.name, Phone: c.phone, Balance: c.balance, CreatedAt: c.createdAt
    }));
    const customersWs = XLSX.utils.json_to_sheet(customersData);
    XLSX.utils.book_append_sheet(wb, customersWs, "Customers");

    // 3. Suppliers
    const suppliersData = suppliers.map(s => ({
      ID: s.id, Name: s.name, Business: s.businessName, Phone: s.phone, Balance: s.balance, CreatedAt: s.createdAt
    }));
    const suppliersWs = XLSX.utils.json_to_sheet(suppliersData);
    XLSX.utils.book_append_sheet(wb, suppliersWs, "Suppliers");

    // 4. Bills
    const billsData = bills.map(b => ({
      Invoice: b.invoiceNo, 
      Date: b.readableDate || new Date(b.date).toLocaleDateString(), 
      Customer: b.customerName, 
      Phone: b.customerPhone, 
      Total: b.grandTotal||b.total||0, 
      Paid: b.amountPaid, 
      Outstanding: b.outstanding, 
      PaymentMode: b.paymentMode,
      Month: b.month || (new Date(b.date).getMonth() + 1),
      Year: b.year || new Date(b.date).getFullYear()
    }));
    const billsWs = XLSX.utils.json_to_sheet(billsData);
    XLSX.utils.book_append_sheet(wb, billsWs, "Bills");

    XLSX.writeFile(wb, `${formData.businessName.replace(/\s+/g, '_')}_Master_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if(window.confirm("WARNING: This will overwrite ALL your current data. This action is irreversible. Are you sure?")) {
         const success = restoreBackup(event.target.result);
         if (success) {
           alert("Backup restored successfully! Application will now reload.");
           window.location.reload();
         } else {
           alert("Failed to restore backup. Invalid file format.");
         }
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">System Settings</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your business profile, print preferences, and database.</p>
        </div>
        {/* Logout Button - Prominent */}
        <button
          onClick={handleLogout}
          id="settings-logout-btn"
          className="flex items-center gap-2.5 px-6 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl border border-rose-200 transition-all active:scale-95 shadow-sm hover:shadow-md whitespace-nowrap"
        >
          <LogOut size={20} />
          Log Out
          {user && <span className="text-xs text-rose-400 font-medium hidden sm:inline">({user.email})</span>}
        </button>
      </div>

      {/* SECTION 1: Logo & QR Upload */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-6">Business Logo & Payment QR</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-bold text-slate-700 self-start">Business Logo</p>
              <div className="w-36 h-36 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden relative group">
                {formData.logo ? (
                  <>
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                      <button type="button" onClick={removeLogo} className="text-white text-xs font-bold bg-red-600 px-3 py-1.5 rounded-lg shadow-sm">Remove</button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon size={32} />
                    <span className="text-xs font-bold mt-2 uppercase tracking-wider">Upload Logo</span>
                  </div>
                )}
                <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Click to upload logo" />
              </div>
              <p className="text-[10px] text-slate-500 text-center font-medium max-w-[180px]">Square PNG/JPG under 500KB. Shows on PDF invoices.</p>
            </div>

            {/* QR Upload */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-bold text-slate-700 self-start">Payment QR Code</p>
              <div className="w-36 h-36 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden relative group">
                {formData.qrImage ? (
                  <>
                    <img src={formData.qrImage} alt="QR Code" className="w-full h-full object-contain p-2" />
                    <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                      <button type="button" onClick={removeQr} className="text-white text-xs font-bold bg-red-600 px-3 py-1.5 rounded-lg shadow-sm">Remove</button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon size={32} />
                    <span className="text-xs font-bold mt-2 uppercase tracking-wider">Upload QR</span>
                  </div>
                )}
                <input type="file" accept="image/png, image/jpeg" onChange={handleQrUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Click to upload QR code" />
              </div>
              <p className="text-[10px] text-slate-500 text-center font-medium max-w-[180px]">Upload your UPI / Payment QR. Prints on PDF bottom.</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Business Details Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Business Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Business Name *</label>
                <input type="text" required value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Owner / Contact Name *</label>
                <input type="text" required value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">WhatsApp Number</label>
                <input type="text" placeholder="Include country code (e.g. 919876543210)" value={formData.ownerPhone} onChange={e => setFormData({...formData, ownerPhone: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium transition-all" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">GST Number / Tax ID</label>
                <input type="text" value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-bold uppercase transition-all" placeholder="22AAAAA0000A1Z5" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Business Address (shown on invoice)</label>
                <textarea rows={2} value={formData.businessAddress} onChange={e => setFormData({...formData, businessAddress: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium transition-all resize-none" placeholder="Shop No. 12, Market Road, City - 400001" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Bank Details <span className="text-xs font-medium text-slate-400">(shown on PDF invoice footer)</span></h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Bank Name</label>
                  <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium transition-all" placeholder="State Bank of India" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Account Number</label>
                  <input type="text" value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium transition-all" placeholder="1234567890" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">IFSC Code</label>
                  <input type="text" value={formData.bankIFSC} onChange={e => setFormData({...formData, bankIFSC: e.target.value.toUpperCase()})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-bold uppercase transition-all" placeholder="SBIN0000123" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Terms &amp; Conditions</label>
                  <textarea rows={2} value={formData.termsAndConditions} onChange={e => setFormData({...formData, termsAndConditions: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-medium transition-all resize-none" placeholder="Goods once sold will not be returned..." />
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">App Experience</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div 
                  onClick={() => setFormData({...formData, uiMode: 'simple'})}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.uiMode === 'simple' ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-500/10' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                >
                   <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2.5 rounded-xl ${formData.uiMode === 'simple' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 text-slate-400'}`}>
                         <Zap size={20} />
                      </div>
                      <span className="font-black text-slate-800">Simple Mode</span>
                   </div>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">Hides GST, Profit, and complex modules. Optimized for speed and basic billing.</p>
                </div>
                <div 
                  onClick={() => setFormData({...formData, uiMode: 'advanced'})}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.uiMode === 'advanced' ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-500/10' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                >
                   <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2.5 rounded-xl ${formData.uiMode === 'advanced' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 text-slate-400'}`}>
                         <SettingsIcon size={20} />
                      </div>
                      <span className="font-black text-slate-800">Advanced Mode</span>
                   </div>
                   <p className="text-sm text-slate-500 font-medium leading-relaxed">Full business feature set. Includes GST, Profitable analysis, and Supplier management.</p>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Billing & Printing</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Currency Symbol</label>
                   <select value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-bold">
                      <option value="₹">₹ (INR)</option>
                      <option value="$">$ (USD)</option>
                      <option value="€">€ (EUR)</option>
                      <option value="£">£ (GBP)</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-1.5">Invoice Number Prefix</label>
                   <input type="text" value={formData.invoicePrefix} onChange={e => setFormData({...formData, invoicePrefix: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-slate-50 focus:bg-white text-slate-800 font-bold uppercase transition-all" placeholder="INV-" />
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            {savedStatus && (
              <span className="text-emerald-600 flex items-center gap-1.5 font-bold text-sm animate-in fade-in">
                 <CheckCircle size={18} /> Settings Applied
              </span>
            )}
            <button type="submit" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2">
              <Save size={18} /> Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Data Management Section */}
      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2 pt-4 border-t border-slate-100">
         <Database size={20} className="text-indigo-600" /> Database Utilities
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center hover:border-emerald-200 transition-colors group">
          <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <FileSpreadsheet size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Export Master Data</h4>
          <p className="text-sm text-slate-500 mb-6 flex-1 font-medium">Download a complete Excel workbook to view all records on your PC.</p>
          <button onClick={exportAllToExcel} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
            <FileSpreadsheet size={18} /> Export .XLSX
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center hover:border-blue-200 transition-colors group">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <Download size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Take Smart Backup</h4>
          <p className="text-sm text-slate-500 mb-6 flex-1 font-medium">Download an encrypted JSON backup file which can be restored anytime.</p>
          <button onClick={exportBackup} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
            <Download size={18} /> Save JSON Backup
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center flex flex-col items-center hover:border-amber-200 transition-colors group">
          <div className="bg-amber-50 text-amber-600 p-4 rounded-xl mb-4 group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-2">Restore App Data</h4>
          <p className="text-sm text-slate-500 mb-5 flex-1 font-medium">Restore everything from a previously downloaded .json backup file.</p>
          
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleRestore} className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2">
            <Upload size={18} /> Restore File
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8">
        <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100 flex flex-col sm:flex-row items-center justify-between gap-6">
           <div>
             <h4 className="font-black text-red-700 text-lg">Danger Zone: Factory Reset</h4>
             <p className="text-sm font-bold text-red-500 mt-1 max-w-lg">Permanently deletes all products, bills, customers, settings, and logs you out. You cannot undo this unless you have a backup.</p>
           </div>
           <button onClick={() => {
              if(window.confirm("CRITICAL WARNING: This will permanently delete ALL data. Are you absolutely sure?")) {
                 localStorage.clear();
                 sessionStorage.clear();
                 window.location.href = '/login';
              }
           }} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-black whitespace-nowrap shadow-lg shadow-red-600/30 transition-all">
              Initialize Reset
           </button>
        </div>
      </div>
    </div>
  );
}
