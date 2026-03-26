import React, { useState, useEffect } from 'react';
import { useBills } from '../context/BillContext';
import { useInventory } from '../context/InventoryContext';
import { useCustomers } from '../context/CustomerContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, IndianRupee, Save, Download, RefreshCw } from 'lucide-react';
import { safeGet } from '../utils/storage';
import jsPDF from 'jspdf';
import { useToast } from '../context/ToastContext';
import { generateInvoicePDF } from '../utils/pdfGenerator';

export default function NewBill() {
  const { addBill, generateBillNumber } = useBills();
  const { products } = useInventory();
  const { customers, addCustomer } = useCustomers();
  const { userSettings } = useSettings();
  const { showToast } = useToast();
  
  const navigate = useNavigate();

  // Bill Details
  const [invoiceNo, setInvoiceNo] = useState(generateBillNumber());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Items
  const [items, setItems] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [manualItemName, setManualItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [manualPrice, setManualPrice] = useState('');

  // GST & Payment
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(18); // 5, 12, 18, 28
  const [paymentMode, setPaymentMode] = useState('Cash'); // Cash, UPI, Credit
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Udhaar System
  const [includePrevBalance, setIncludePrevBalance] = useState(false);
  const [selectedCustomerPrevBalance, setSelectedCustomerPrevBalance] = useState(0);

  // Auto-select existing customer by name
  useEffect(() => {
    if (customerName && !selectedCustomerId) {
      const matched = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (matched) {
        setSelectedCustomerId(matched.id);
      }
    }
  }, [customerName, customers, selectedCustomerId]);

  // BUG 3 FIX: Fetch clear previous balance automatically
  useEffect(() => {
    if (selectedCustomerId) {
      // 1. Fetch FRESH customer data straight from localStorage to avoid stale closures
      const freshCustomers = safeGet('smartbill_customers', []);
      const cust = freshCustomers.find(c => c.id === selectedCustomerId);
      
      // 2. Safely read cleanly synced outstanding balance
      const outstanding = cust ? (cust.outstandingBalance || 0) : 0;
      
      // 3. Update UI state instantly
      setSelectedCustomerPrevBalance(outstanding);
      // Auto-fill and auto-toggle the previous balance inclusion
      setIncludePrevBalance(outstanding > 0);
    } else {
      setSelectedCustomerPrevBalance(0);
      setIncludePrevBalance(false);
    }
  }, [selectedCustomerId]);

  // Combined Product Search Handler
  const handleItemNameChange = (e) => {
    const v = e.target.value;
    setManualItemName(v);
    const matched = products.find(p => p.name.toLowerCase() === v.toLowerCase());
    if (matched) {
      setSelectedProductId(matched.id);
      setManualPrice(matched.sellingPrice || matched.price || '');
    } else {
      setSelectedProductId('');
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!manualItemName || !quantity || !manualPrice) return;

    const priceNum = parseFloat(manualPrice);
    const qtyNum = parseInt(quantity, 10);
    
    // Calculate profit
    let itemProfit = priceNum * qtyNum; 
    if (selectedProductId) {
       const prod = products.find(p => p.id === selectedProductId);
       const purPrice = parseFloat(prod?.purchasePrice) || 0;
       itemProfit = (priceNum - purPrice) * qtyNum;
    }
    
    setItems([...items, {
      productId: selectedProductId || null,
      name: manualItemName,
      price: priceNum,
      quantity: qtyNum,
      amount: priceNum * qtyNum,
      profit: parseFloat(itemProfit)
    }]);
    
    setSelectedProductId('');
    setManualItemName('');
    setManualPrice('');
    setQuantity(1);

    // Auto focus for rapid entry
    setTimeout(() => {
      document.getElementById('item-name-input')?.focus();
    }, 10);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  // Calculations
  const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalProfit = items.reduce((sum, item) => sum + (item.profit || 0), 0);
  
  const gstAmount = gstEnabled ? (subTotal * gstRate) / 100 : 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  
  // Grand Total considering Udhaar
  const itemsTotal = subTotal + gstAmount;
  const grandTotal = itemsTotal + (includePrevBalance ? selectedCustomerPrevBalance : 0);
  
  // Amount paid logic
  const amountPaid = amountPaidInput === '' 
    ? (paymentMode === 'Credit' ? 0 : grandTotal) 
    : parseFloat(amountPaidInput) || 0;
  
  // CORE LOGIC: finalOutstanding = (totalAmount + previousBalance) - paidAmount
  const outstanding = Math.max(0, grandTotal - amountPaid);

  const handleSaveBill = (isNew = false) => {
    if (!customerName || items.length === 0) return;
    
    let custId = selectedCustomerId;
    if (!custId) {
      const existing = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (existing) {
        custId = existing.id;
      } else {
        custId = Date.now().toString() + '-cust';
        addCustomer({ id: custId, name: customerName, phone: customerPhone, createdAt: new Date().toISOString() });
      }
    }

    const prevBalanceAmount = includePrevBalance ? selectedCustomerPrevBalance : 0;

    // BUG 4 FIX: Ensure save never fails and properly includes paid and outstanding.
    // Ensure all critical data is accurately mapped mathematically.
    // CORE LOGIC: finalOutstanding = (totalAmount + previousBalance) - paidAmount 
    const finalOut = Math.max(0, (itemsTotal + prevBalanceAmount) - amountPaid);

    const billData = {
      invoiceNo,
      date,
      customerId: custId,
      customerName,
      customerPhone,
      items,
      subTotal,
      profit: totalProfit,
      gstEnabled,
      gstRate,
      cgst,
      sgst,
      total: itemsTotal, // Base item logic
      grandTotal,
      totalAmount: itemsTotal,
      previousBalance: prevBalanceAmount,
      prevBalanceIncluded: prevBalanceAmount,
      paymentMode,
      paidAmount: amountPaid,
      amountPaid, // Kept for legacy compatibility
      outstanding: finalOut, // Kept for legacy compatibility
      finalOutstanding: finalOut
    };

    addBill(billData);
    showToast(`Bill ${invoiceNo} Saved!`, 'success');
    setShowSuccessOverlay(true);
    setTimeout(() => setShowSuccessOverlay(false), 1500);
    
    if (isNew) {
       // Generate fresh bill number from localStorage
       setInvoiceNo(generateBillNumber());
       setItems([]);
       setCustomerName('');
       setCustomerPhone('');
       setSelectedCustomerId('');
       setAmountPaidInput('');
       setIncludePrevBalance(false);
       setSelectedCustomerPrevBalance(0);
    } else {
       navigate('/bills');
    }
  };

  const handleGeneratePDF = () => {
    if (items.length === 0) return;
    generateInvoicePDF({
      invoiceNo,
      date,
      customerName,
      customerPhone,
      items,
      subTotal,
      gstEnabled,
      gstRate,
      cgst,
      sgst,
      grandTotal,
      prevBalanceIncluded: includePrevBalance ? selectedCustomerPrevBalance : 0,
      paymentMode,
      amountPaid,
      outstanding
    }, userSettings);
    showToast('Invoice PDF Generated', 'success');
  };

  const recentCustomers = [...customers].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quick Billing</h2>
          <p className="text-slate-500 text-sm mt-1">Invoice #{invoiceNo}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleGeneratePDF}
            disabled={items.length === 0}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Download size={18} /> Download Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Customer Details</h3>
            
            {/* Recent Customers Quick Select */}
            {recentCustomers.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 font-medium py-1">Recent:</span>
                {recentCustomers.map(c => (
                  <button 
                    key={c.id} type="button" 
                    onClick={() => { setSelectedCustomerId(c.id); setCustomerName(c.name); setCustomerPhone(c.phone || ''); }}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                <input 
                  type="text" required
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setSelectedCustomerId(''); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                 <input 
                   type="text" 
                   value={customerPhone}
                   onChange={(e) => setCustomerPhone(e.target.value)}
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                   placeholder="9876543210"
                 />
              </div>
            </div>

            {selectedCustomerId && selectedCustomerPrevBalance > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-amber-800 font-bold text-sm">Previous Balance (Udhaar)</p>
                  <p className="text-amber-600 text-xs font-medium">Customer has a pending balance of ₹{selectedCustomerPrevBalance.toFixed(2)}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={includePrevBalance}
                    onChange={(e) => setIncludePrevBalance(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-bold text-slate-700">{includePrevBalance ? 'Included' : 'Add to Bill'}</span>
                </label>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add Items (Press Enter to add)</h3>
            <datalist id="inventory-products">
              {products.map(p => <option key={p.id} value={p.name}>{p.name} - ₹{p.sellingPrice || p.price}</option>)}
            </datalist>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-slate-500 mb-1">Search/Type Item Name</label>
                <input 
                  id="item-name-input"
                  list="inventory-products"
                  type="text" required
                  value={manualItemName}
                  onChange={handleItemNameChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium"
                  placeholder="Type to search..."
                  autoComplete="off"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">Rate (₹)</label>
                <input 
                  type="number" required min="0" step="0.01"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                <input 
                  type="number" required min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="w-full h-[42px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 font-bold rounded-lg flex items-center justify-center transition-colors">
                  <Plus size={18} /> Add
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
               <h3 className="text-lg font-bold text-slate-800">Bill Items</h3>
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No items added yet. Search and press enter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">Item</th>
                      <th className="py-2.5 px-4 text-right">Rate</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right leading-tight">
                        Amount
                        {userSettings?.uiMode === 'advanced' && <><br/><span className="text-[9px] text-slate-400">Profit</span></>}
                      </th>
                      <th className="py-2.5 px-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-4 text-slate-800 text-sm font-medium">{item.name}</td>
                        <td className="py-2 px-4 text-slate-600 text-sm text-right">₹{item.price.toFixed(2)}</td>
                        <td className="py-2 px-4 text-slate-800 text-sm font-medium text-center">{item.quantity}</td>
                        <td className="py-2 px-4 text-slate-800 text-sm font-bold text-right leading-tight">
                          ₹{item.amount.toFixed(2)}
                          {userSettings?.uiMode === 'advanced' && (
                            <><br/><span className="text-[10px] text-emerald-500 font-normal ml-1">P: ₹{(item.profit||0).toFixed(2)}</span></>
                          )}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-800">Payment Modes</h3>
               {userSettings?.uiMode === 'advanced' && (
                 <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                   <label className="text-[10px] font-black text-slate-500 uppercase">GST</label>
                   <input 
                     type="checkbox" 
                     className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                     checked={gstEnabled} 
                     onChange={(e) => setGstEnabled(e.target.checked)} 
                   />
                 </div>
               )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['Cash', 'UPI', 'Credit'].map(mode => (
                <button 
                  key={mode} type="button" 
                  onClick={() => { setPaymentMode(mode); if(mode==='Credit') setAmountPaidInput(0); }}
                  className={`py-2 text-sm font-medium rounded-lg border transition-all ${paymentMode === mode ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Recieved (₹)</span>
                {paymentMode === 'Credit' ? (
                   <input type="number" value={amountPaid} readOnly className="w-24 px-2 py-1 text-right bg-transparent text-slate-800 font-bold" />
                ) : (
                   <input 
                     type="number" min="0" step="0.01" 
                     value={amountPaidInput} 
                     onChange={(e) => setAmountPaidInput(e.target.value)} 
                     placeholder={grandTotal.toFixed(2)}
                     className="w-24 px-2 py-1.5 text-right bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-bold shadow-inner" 
                   />
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Due Balance</span>
                <span className={`font-bold ${outstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>₹{outstanding.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-bl-full pointer-events-none"></div>
            
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-700 pb-2">Final Summary</h3>
            
            <div className="space-y-3 mb-6 relative z-10">
              <div className="flex justify-between text-slate-300 text-sm font-medium">
                <span>Items Cost</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              {userSettings?.uiMode === 'advanced' && gstEnabled && (
                <div className="flex justify-between text-slate-300 text-sm font-medium animate-in fade-in slide-in-from-right-2">
                  <span>GST ({gstRate}%)</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
              )}
              {includePrevBalance && (
                 <div className="flex justify-between text-amber-400 text-sm font-bold">
                    <span>Previous Udhaar</span>
                    <span>₹{selectedCustomerPrevBalance.toFixed(2)}</span>
                 </div>
              )}
              <div className="pt-3 border-t border-slate-600 flex justify-between items-center">
                <span className="text-lg">Grand Total</span>
                <span className="text-3xl font-black text-white tracking-tight">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-slate-700 space-y-2 mt-3">
                 <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-400">Amount Paid</span>
                    <span className="text-emerald-400">₹{amountPaid.toFixed(2)}</span>
                 </div>
                 {outstanding > 0 && (
                    <div className="flex justify-between items-center text-sm font-black">
                       <span className="text-slate-300">Outstanding Balance</span>
                       <span className="text-rose-500">₹{outstanding.toFixed(2)}</span>
                    </div>
                 )}
              </div>
            </div>
            
            <div className="space-y-3 relative z-10">
              <button 
                onClick={() => handleSaveBill(false)}
                disabled={!customerName || items.length === 0}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} /> Save Bill
              </button>
              
              <button 
                onClick={() => handleSaveBill(true)}
                disabled={!customerName || items.length === 0}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={18} /> Save & New Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Legacy Print Div Removed */}
      
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-600/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Save size={48} className="text-indigo-600 animate-bounce" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">BILL SAVED!</h2>
            <p className="text-indigo-100 font-bold uppercase tracking-widest">Inventory & Ledger Updated</p>
          </div>
        </div>
      )}
    </div>
  );
}
