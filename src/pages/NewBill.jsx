import React, { useState, useEffect, useMemo } from 'react';
import { useBills } from '../context/BillContext';
import { useInventory } from '../context/InventoryContext';
import { useCustomers } from '../context/PartiesContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Download, RefreshCw, Tag, MessageCircle, ArrowUpRight, X, FileText, Search as SearchIcon } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { useToast } from '../context/ToastContext';
import { calculateCustomerBalance } from '../utils/ledger';
import { generateReadableId } from '../utils/storage';
import { getWhatsAppLink } from '../utils/whatsapp';

const GST_RATES = [0, 5, 12, 18, 28];

const emptyItemForm = { name: '', rate: '', qty: 1, gstRate: 18, discount: 0 };

export default function NewBill() {
  const billsRes = useBills() || {};
  const addBill = billsRes.addBill || (() => {});
  const generateBillNumber = billsRes.generateBillNumber || (() => 'INV-Temp');
  const ledger = Array.isArray(billsRes.ledger) ? billsRes.ledger : [];
  const { products } = useInventory();
  const { customers, addCustomer } = useCustomers();
  const { userSettings } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Bill Details
  const [invoiceNo, setInvoiceNo] = useState(generateBillNumber());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // Item form
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Items list
  const [items, setItems] = useState([]);

  // Payment
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountPaidInput, setAmountPaidInput] = useState('');

  // Prev balance UI completely removed as requested
  const enablePrevBalance = false;
  const customerPrevBalance = 0;

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Auto-match customer
  useEffect(() => {
    if (customerName && !selectedCustomerId) {
      const matched = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (matched) setSelectedCustomerId(matched.id);
    }
  }, [customerName, customers, selectedCustomerId]);



  // Product search
  const handleItemNameChange = (e) => {
    const v = e.target.value;
    setItemForm(prev => ({ ...prev, name: v }));
    const matched = products.find(p => p.name.toLowerCase() === v.toLowerCase());
    if (matched) {
      setSelectedProductId(matched.id);
      setItemForm(prev => ({
        ...prev,
        name: matched.name,
        rate: matched.sellingPrice || matched.price || '',
      }));
    } else {
      setSelectedProductId('');
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const { name, rate, qty, gstRate, discount } = itemForm;
    if (!name || !rate || !qty) return;

    const rateNum    = parseFloat(rate) || 0;
    const qtyNum     = parseInt(qty, 10) || 1;
    const discPct    = parseFloat(discount) || 0;
    const gstPct     = parseFloat(gstRate) || 0;

    const grossAmount   = rateNum * qtyNum;
    const discountAmt   = grossAmount * (discPct / 100);
    const taxableAmount = grossAmount - discountAmt;
    const gstAmt        = taxableAmount * (gstPct / 100);
    const totalAmount   = Math.round((taxableAmount + gstAmt) * 100) / 100;

    // Profit (if linked to inventory product)
    let profit = taxableAmount;
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      const purchasePrice = parseFloat(prod?.purchasePrice || prod?.purchase_price) || 0;
      profit = (rateNum - purchasePrice) * qtyNum - discountAmt;
    }

    setItems(prev => [...prev, {
      productId: selectedProductId || null,
      name,
      rate: Math.round(rateNum * 100) / 100,
      quantity: qtyNum,
      discount: discPct,
      discountAmt: Math.round(discountAmt * 100) / 100,
      gstRate: gstPct,
      gstAmt: Math.round(gstAmt * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      amount: totalAmount,
      profit: Math.round(profit * 100) / 100,
    }]);

    setItemForm(emptyItemForm);
    setSelectedProductId('');
    setTimeout(() => document.getElementById('item-name-input')?.focus(), 10);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  // ----- Calculations -----
  const { subTotal, totalDiscount, taxableTotal, totalGST, cgst, sgst, totalProfit, grandTotal } = React.useMemo(() => {
    const sTotal       = Math.round(items.reduce((s, i) => s + (i.rate * i.quantity), 0) * 100) / 100;
    const tDiscount    = Math.round(items.reduce((s, i) => s + i.discountAmt, 0) * 100) / 100;
    const tTaxable     = Math.round((sTotal - tDiscount) * 100) / 100;
    const tGST         = Math.round(items.reduce((s, i) => s + i.gstAmt, 0) * 100) / 100;
    const cGST         = Math.round((tGST / 2) * 100) / 100;
    const sGST         = Math.round((tGST / 2) * 100) / 100;
    const tProfit      = Math.round(items.reduce((s, i) => s + (i.profit || 0), 0) * 100) / 100;
    const gTotal       = Math.round((tTaxable + tGST) * 100) / 100;

    return { subTotal: sTotal, totalDiscount: tDiscount, taxableTotal: tTaxable, totalGST: tGST, cgst: cGST, sgst: sGST, totalProfit: tProfit, grandTotal: gTotal };
  }, [items]);

  const amountPaid = amountPaidInput === ''
    ? (paymentMode === 'Credit' ? 0 : grandTotal)
    : parseFloat(amountPaidInput) || 0;
  const outstanding = Math.round(Math.max(0, grandTotal - amountPaid) * 100) / 100;

  // ----- Save -----
  const handleSaveBill = async (isNew = false) => {
    if (!customerName || items.length === 0 || isSaving) return;
    setIsSaving(true);

    let custId = selectedCustomerId;
    if (!custId) {
      const existing = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (existing) {
        custId = existing.id;
      } else {
        custId = generateReadableId('C', customers);
        addCustomer({ id: custId, name: customerName, phone: customerPhone });
      }
    }

    // calculate previousbalance using standard methods even if not in UI
    const calculatedPrevBalance = custId ? calculateCustomerBalance(ledger, custId, customers.find(c => c.id === custId)) : 0;

    console.log('[DEBUG] --- PDF/Save Generation ---');
    console.log('Customer Fetched:', custId, '(', customerName, ')');
    console.log('Previous Balance Calc:', calculatedPrevBalance);
    console.log('-----------------------------------');

    const finalOut = Math.max(0, grandTotal - amountPaid);
    const paymentStatus = amountPaid === 0 ? 'Pending' : (amountPaid >= grandTotal ? 'Paid' : 'Partial');

    const billData = {
      invoiceNo, date,
      customerId: custId, customerName, customerPhone,
      items,
      subTotal,
      totalDiscount,
      taxableTotal,
      cgst, sgst,
      gstEnabled: totalGST > 0,
      gstAmount: totalGST,
      profit: totalProfit,
      total: grandTotal,
      grandTotal: grandTotal,
      totalAmount: grandTotal,
      previousBalance: 0,
      prevBalanceIncluded: false,
      paymentMode,
      paymentStatus,
      paidAmount: amountPaid,
      amountPaid,
      outstanding: finalOut,
      finalOutstanding: finalOut,
      pdfCustomPrevBalance: calculatedPrevBalance,
    };

    const result = await addBill(billData);
    setIsSaving(false);
    
    if (!result) return; // addBill returns null on error
    
    // Store current bill for WhatsApp sharing
    setCurrentBillForSharing(billData);
    setShowSuccessOverlay(true);

    if (isNew) {
      // Reset form immediately for next bill
      setInvoiceNo(generateBillNumber());
      setItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedCustomerId('');
      setAmountPaidInput('');
    }

    // Auto-close overlay after 2 seconds
    setTimeout(() => {
      setShowSuccessOverlay(false);
      setCurrentBillForSharing(null);
      if (!isNew) {
        navigate('/bills');
      }
    }, 2000);
  };

  const [currentBillForSharing, setCurrentBillForSharing] = useState(null);

  const handleGeneratePDF = async () => {
    if (items.length === 0) return;

    let resolveCustId = selectedCustomerId;
    if (!resolveCustId) {
      const existing = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (existing) resolveCustId = existing.id;
    }

    const calculatedPrevBalance = resolveCustId ? calculateCustomerBalance(ledger, resolveCustId, customers.find(c => c.id === resolveCustId)) : 0;

    console.log('[DEBUG] --- Manual PDF Generation ---');
    console.log('Customer Fetched:', resolveCustId, '(', customerName, ')');
    console.log('Previous Balance Calc:', calculatedPrevBalance);
    console.log('-------------------------------------');

    try {
      const { doc, fileName } = await generateInvoicePDF({
        invoiceNo, date, customerName, customerPhone,
        items, subTotal, totalDiscount, taxableTotal,
        cgst, sgst, gstEnabled: totalGST > 0, gstAmount: totalGST,
        grandTotal,
        prevBalanceIncluded: calculatedPrevBalance,
        paymentMode, amountPaid, outstanding,
      }, userSettings);
      doc.save(fileName);
      showToast('Invoice PDF Downloaded', 'success');
    } catch (err) {
      console.error('PDF manual generate failed:', err);
      showToast('Failed to generate PDF', 'error');
    }
  };

  const recentCustomers = [...customers]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 min-w-0 pt-2 sm:pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Quick Billing</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
              <Tag size={14} /> {invoiceNo}
            </span>
            <input 
              type="date" 
              readOnly
              value={date} 
              className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 shadow-inner select-none outline-none" 
              title="System Date" 
            />
          </div>
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
        {/* ---- LEFT PANEL ---- */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-600 relative">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Customer Details</h3>
            </div>

            {/* Recent customer pills — only show when NOT typing */}
            {recentCustomers.length > 0 && !customerName && (
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold py-1 uppercase tracking-wider">Recent:</span>
                {recentCustomers.map(c => (
                  <button
                    key={c.id} type="button"
                    onClick={() => { setSelectedCustomerId(c.id); setCustomerName(c.name); setCustomerPhone(c.phone || ''); }}
                    className="text-xs px-3 py-1.5 rounded-[8px] bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-purple-50 hover:text-purple-700 font-bold transition-all"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
                <div className="relative search-wrapper">
                  <SearchIcon size={18} className="search-icon absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" required
                    id="customer-name-input"
                    value={customerName || ''}
                    onChange={e => { setCustomerName(e.target.value); setSelectedCustomerId(''); }}
                    className="search-clean w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-slate-800 dark:text-slate-100"
                    placeholder="Type to search customers..."
                    autoComplete="off"
                  />
                </div>

                {/* Real-time customer search dropdown */}
                {customerName && !selectedCustomerId && (() => {
                  const filtered = customers.filter(c =>
                    (c.name || '').toLowerCase().includes(customerName.toLowerCase())
                  ).slice(0, 8);
                  return filtered.length > 0 ? (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                      {filtered.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone || '');
                          }}
                          className="px-4 py-3 hover:bg-indigo-50 cursor-pointer flex items-center justify-between group border-b border-slate-50 last:border-0 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-700">{c.name}</span>
                            {c.phone && <span className="text-xs text-slate-400 ml-2">{c.phone}</span>}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase group-hover:bg-indigo-200 group-hover:text-indigo-700 transition-colors">Select</span>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone || ''}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-slate-800 dark:text-slate-100"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-600">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                <Tag size={18} />
              </div>
              Add Items
            </h3>
            <datalist id="inventory-products">
              {products.map(p => <option key={p.id} value={p.name}>{p.name} - ₹{p.sellingPrice || p.price}</option>)}
            </datalist>

            <form onSubmit={handleAddItem} className="space-y-3">
              {/* Row 1: Name */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-12">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Item Name *</label>
                <div className="relative search-wrapper">
                    <SearchIcon size={16} className="search-icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="item-name-input"
                      list="inventory-products"
                      type="text" required
                      value={itemForm.name}
                      onChange={handleItemNameChange}
                      className="search-clean w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 text-sm bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-100"
                      placeholder="Type to search..."
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Rate, Qty, GST%, Discount, Add */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Rate (₹) *</label>
                  <input
                    type="number" required min="0" step="0.01"
                    value={itemForm.rate || ''}
                    onChange={e => setItemForm(p => ({ ...p, rate: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-slate-800 dark:text-slate-100"
                    placeholder="Enter rate"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Qty *</label>
                  <input
                    type="number" required min="1"
                    value={itemForm.qty}
                    onChange={e => setItemForm(p => ({ ...p, qty: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
                {userSettings?.uiMode === 'advanced' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">GST %</label>
                    <select
                      value={itemForm.gstRate}
                      onChange={e => setItemForm(p => ({ ...p, gstRate: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500/50 text-sm bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-100"
                    >
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                )}
                <div className={userSettings?.uiMode === 'advanced' ? "md:col-span-2" : "md:col-span-4"}>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Discount %</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={itemForm.discount || ''}
                    onChange={e => setItemForm(p => ({ ...p, discount: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-slate-800 dark:text-slate-100"
                    placeholder="0%"
                  />
                </div>
                <div className="md:col-span-3">
                  <button type="submit" className="w-full h-[45px] btn-primary flex items-center justify-center gap-1.5">
                    <Plus size={20} strokeWidth={3} /> Add Item
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Items Table */}
          <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-600 overflow-hidden">
            <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <span className="bg-indigo-600 text-white text-xs font-black px-2 py-0.5 rounded-md">{items.length}</span>
                Bill Items
              </h3>
            </div>
            {items.length === 0 ? (
              <div className="p-10 text-center text-slate-400 font-medium">No items added yet.</div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-full max-w-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-y border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <th className="p-4 py-3 pl-5">Item</th>
                      <th className="p-4 py-3 text-center">Qty</th>
                      <th className="p-4 py-3 text-right">Rate</th>
                      <th className="p-4 py-3 text-right">Tax/Disc</th>
                      <th className="p-4 py-3 text-right pr-5">Amount</th>
                      <th className="w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 dark:divide-slate-700">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors animate-in fade-in duration-200">
                        <td className="p-4 pl-5">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[14px] leading-tight">{item.name}</h4>
                        </td>
                        <td className="p-4">
                          <div className="inline-flex items-center justify-center w-full">
                            <span className="text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-700 rounded-md px-2 py-0.5 text-sm">{item.quantity}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">₹{item.rate.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-[10px] font-bold text-slate-400 uppercase text-right tracking-wider">
                          <div className="flex flex-col items-end gap-0.5">
                            {item.discount > 0 && <span className="text-amber-500">-{item.discount}% Disc</span>}
                            {userSettings?.uiMode === 'advanced' && item.gstRate > 0 && <span className="text-indigo-400">+{item.gstRate}% GST</span>}
                            {item.discount === 0 && (userSettings?.uiMode !== 'advanced' || item.gstRate === 0) && <span>-</span>}
                          </div>
                        </td>
                        <td className="p-4 pt-5 pr-5 text-right w-[100px] flex items-center justify-end">
                          <span className="font-black text-slate-800 dark:text-slate-100 text-md">₹{item.amount.toFixed(2)}</span>
                        </td>
                        <td className="p-4 text-center pr-2">
                          <button type="button" onClick={(e) => { e.preventDefault(); removeItem(idx); }} className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors outline-none focus:ring-2 focus:ring-red-200">
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

        {/* ---- RIGHT PANEL ---- */}
        <div className="lg:col-span-1 space-y-6">

          {/* Payment Mode */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Payment Mode</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['Cash', 'UPI', 'Credit'].map(mode => (
                <button
                  key={mode} type="button"
                  onClick={() => { setPaymentMode(mode); if (mode === 'Credit') setAmountPaidInput(0); }}
                  className={`py-2 text-sm font-medium rounded-lg border transition-all ${paymentMode === mode ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Received (₹)</span>
                {paymentMode === 'Credit' ? (
                  <input type="number" value={0} readOnly className="w-24 px-2 py-1 text-right bg-transparent text-slate-800 dark:text-slate-100 font-bold" />
                ) : (
                  <input
                    type="number" min="0" step="0.01"
                    value={amountPaidInput || ''}
                    onChange={e => setAmountPaidInput(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter amount"
                    className="w-32 px-2 py-1.5 text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 outline-none rounded-md focus:ring-2 focus:ring-indigo-500 font-bold shadow-inner"
                  />
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Due Balance</span>
                <span className={`font-bold ${outstanding > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>₹{outstanding.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Final Summary */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-bl-full pointer-events-none"></div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-700 pb-2">Final Summary</h3>

            <div className="space-y-2.5 mb-6 relative z-10 text-sm">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Subtotal (Gross)</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-amber-400 font-medium">
                  <span>Total Discount</span>
                  <span>− ₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {userSettings?.uiMode === 'advanced' && (
                <>
                  <div className="flex justify-between text-indigo-300 font-semibold border-t border-slate-700/50 pt-1 mt-1">
                    <span>Taxable Amount</span>
                    <span>₹{taxableTotal.toFixed(2)}</span>
                  </div>
                  {totalGST > 0 && (
                    <>
                      <div className="flex justify-between text-slate-300 font-medium">
                        <span>CGST</span>
                        <span>₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-300 font-medium">
                        <span>SGST</span>
                        <span>₹{sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="pt-3 border-t border-slate-600 flex justify-between items-center">
                <span className="text-lg">Grand Total</span>
                <span className="text-3xl font-black text-white tracking-tight">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-700 space-y-2 mt-1">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-400">Current Amount Paid</span>
                  <span className="text-emerald-400">₹{amountPaid.toFixed(2)}</span>
                </div>
                {outstanding > 0 && (
                  <div className="flex justify-between items-center font-black">
                    <span className="text-slate-300">Current Outstanding</span>
                    <span className="text-rose-500">₹{outstanding.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              <button
                onClick={() => handleSaveBill(false)}
                disabled={!customerName || items.length === 0 || isSaving}
                className="w-full h-[56px] btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} /> {isSaving ? 'Saving...' : 'Save Bill'}
              </button>
              <button
                onClick={() => handleSaveBill(true)}
                disabled={!customerName || items.length === 0 || isSaving}
                className="w-full h-[50px] bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-[12px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]"
              >
                <RefreshCw size={18} /> {isSaving ? 'Saving...' : 'Save & New Bill'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-600/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-95 duration-300 p-8 max-w-sm w-full">
            <div className="w-24 h-24 bg-white dark:bg-slate-800 transition-colors duration-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Save size={48} className="text-indigo-600 animate-bounce" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">BILL SAVED!</h2>
            <p className="text-indigo-100 font-bold uppercase tracking-widest mb-8">Inventory &amp; Ledger Updated</p>
            
            <div className="space-y-3">
               <a 
                 href={getWhatsAppLink(currentBillForSharing, userSettings?.businessName)}
                 target="_blank" rel="noopener noreferrer"
                 className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 rounded-2xl font-black shadow-lg shadow-green-500/20 active:scale-95 transition-all text-lg"
               >
                 <MessageCircle size={24} /> Share on WhatsApp
               </a>
               <button 
                 onClick={() => { setShowSuccessOverlay(false); setCurrentBillForSharing(null); }}
                 className="w-full py-4 text-white/70 hover:text-white font-bold tracking-widest uppercase text-sm"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
