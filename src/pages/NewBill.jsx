import React, { useState, useEffect } from 'react';
import { useBills } from '../context/BillContext';
import { useInventory } from '../context/InventoryContext';
import { useCustomers } from '../context/CustomerContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Download, RefreshCw, Tag } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { useToast } from '../context/ToastContext';
import { calculateCustomerBalance } from '../utils/ledger';

const GST_RATES = [0, 5, 12, 18, 28];
const SIZES = ['N/A', 'Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const emptyItemForm = { name: '', hsn: '', size: 'N/A', rate: '', qty: 1, gstRate: 18, discount: 0 };

export default function NewBill() {
  const { billsRes = useBills() || {} } = {};
  const { addBill, generateBillNumber, ledger = [] } = billsRes.addBill ? billsRes : useBills();
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

  // Prev balance
  const [includePrevBalance, setIncludePrevBalance] = useState(false);
  const [prevBalance, setPrevBalance] = useState(0);

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Auto-match customer
  useEffect(() => {
    if (customerName && !selectedCustomerId) {
      const matched = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (matched) setSelectedCustomerId(matched.id);
    }
  }, [customerName, customers, selectedCustomerId]);

  // Load prev balance
  useEffect(() => {
    if (selectedCustomerId) {
      const bal = Math.max(0, parseFloat(calculateCustomerBalance(ledger, selectedCustomerId) || 0));
      setPrevBalance(bal);
      setIncludePrevBalance(bal > 0);
    } else {
      setPrevBalance(0);
      setIncludePrevBalance(false);
    }
  }, [selectedCustomerId]);

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
        hsn: matched.hsn || prev.hsn,
      }));
    } else {
      setSelectedProductId('');
    }
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    const { name, hsn, size, rate, qty, gstRate, discount } = itemForm;
    if (!name || !rate || !qty) return;

    const rateNum    = parseFloat(rate);
    const qtyNum     = parseInt(qty, 10);
    const discPct    = parseFloat(discount) || 0;
    const gstPct     = parseFloat(gstRate) || 0;

    const grossAmount   = rateNum * qtyNum;
    const discountAmt   = grossAmount * (discPct / 100);
    const taxableAmount = grossAmount - discountAmt;
    const gstAmt        = taxableAmount * (gstPct / 100);
    const totalAmount   = taxableAmount + gstAmt;

    // Profit (if linked to inventory product)
    let profit = taxableAmount;
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      const purchasePrice = parseFloat(prod?.purchasePrice) || 0;
      profit = (rateNum - purchasePrice) * qtyNum - discountAmt;
    }

    setItems(prev => [...prev, {
      productId: selectedProductId || null,
      name,
      hsn: hsn || '',
      size: size || 'N/A',
      rate: rateNum,
      quantity: qtyNum,
      discount: discPct,
      discountAmt: parseFloat(discountAmt.toFixed(2)),
      gstRate: gstPct,
      gstAmt: parseFloat(gstAmt.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      amount: parseFloat(totalAmount.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
    }]);

    setItemForm(emptyItemForm);
    setSelectedProductId('');
    setTimeout(() => document.getElementById('item-name-input')?.focus(), 10);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  // ----- Calculations -----
  const subTotal       = items.reduce((s, i) => s + i.taxableAmount, 0);
  const totalDiscount  = items.reduce((s, i) => s + i.discountAmt, 0);
  const totalGST       = items.reduce((s, i) => s + i.gstAmt, 0);
  const cgst           = totalGST / 2;
  const sgst           = totalGST / 2;
  const totalProfit    = items.reduce((s, i) => s + (i.profit || 0), 0);
  const itemsTotal     = subTotal + totalGST; // taxable + gst (discount already applied)
  const grandTotal     = itemsTotal + (includePrevBalance ? prevBalance : 0);

  const amountPaid = amountPaidInput === ''
    ? (paymentMode === 'Credit' ? 0 : grandTotal)
    : parseFloat(amountPaidInput) || 0;
  const outstanding = Math.max(0, grandTotal - amountPaid);

  // ----- Save -----
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

    const prevBal = includePrevBalance ? prevBalance : 0;
    const finalOut = Math.max(0, grandTotal - amountPaid);

    const billData = {
      invoiceNo, date,
      customerId: custId, customerName, customerPhone,
      items,
      subTotal,
      totalDiscount,
      cgst, sgst,
      gstEnabled: totalGST > 0,
      gstAmount: totalGST,
      profit: totalProfit,
      total: itemsTotal,
      grandTotal,
      totalAmount: itemsTotal,
      previousBalance: prevBal,
      prevBalanceIncluded: prevBal,
      paymentMode,
      paidAmount: amountPaid,
      amountPaid,
      outstanding: finalOut,
      finalOutstanding: finalOut,
    };

    addBill(billData);
    showToast(`Bill ${invoiceNo} Saved!`, 'success');
    setShowSuccessOverlay(true);
    setTimeout(() => setShowSuccessOverlay(false), 1500);

    if (isNew) {
      setInvoiceNo(generateBillNumber());
      setItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedCustomerId('');
      setAmountPaidInput('');
      setIncludePrevBalance(false);
      setPrevBalance(0);
    } else {
      navigate('/bills');
    }
  };

  const handleGeneratePDF = () => {
    if (items.length === 0) return;
    generateInvoicePDF({
      invoiceNo, date, customerName, customerPhone,
      items, subTotal, totalDiscount,
      cgst, sgst, gstEnabled: totalGST > 0, gstAmount: totalGST,
      grandTotal,
      prevBalanceIncluded: includePrevBalance ? prevBalance : 0,
      paymentMode, amountPaid, outstanding,
    }, userSettings);
    showToast('Invoice PDF Generated', 'success');
  };

  const recentCustomers = [...customers]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
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
        {/* ---- LEFT PANEL ---- */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Customer Details</h3>
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
                  onChange={e => { setCustomerName(e.target.value); setSelectedCustomerId(''); }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  placeholder="9876543210"
                />
              </div>
            </div>

            {selectedCustomerId && prevBalance > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-amber-800 font-bold text-sm">Previous Balance (Udhaar)</p>
                  <p className="text-amber-600 text-xs font-medium">Pending balance of ₹{prevBalance.toFixed(2)}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={includePrevBalance} onChange={e => setIncludePrevBalance(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  <span className="ml-3 text-sm font-bold text-slate-700">{includePrevBalance ? 'Included' : 'Add to Bill'}</span>
                </label>
              </div>
            )}
          </div>

          {/* Add Item Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Tag size={18} className="text-indigo-500" /> Add Items
            </h3>
            <datalist id="inventory-products">
              {products.map(p => <option key={p.id} value={p.name}>{p.name} - ₹{p.sellingPrice || p.price}</option>)}
            </datalist>

            <form onSubmit={handleAddItem} className="space-y-3">
              {/* Row 1: Name, HSN, Size */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Item Name *</label>
                  <input
                    id="item-name-input"
                    list="inventory-products"
                    type="text" required
                    value={itemForm.name}
                    onChange={handleItemNameChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    placeholder="Type to search..."
                    autoComplete="off"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={itemForm.hsn}
                    onChange={e => setItemForm(p => ({ ...p, hsn: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    placeholder="e.g. 6203"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Size</label>
                  <select
                    value={itemForm.size}
                    onChange={e => setItemForm(p => ({ ...p, size: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm bg-white"
                  >
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Rate, Qty, GST%, Discount, Add */}
              <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Rate (₹) *</label>
                  <input
                    type="number" required min="0" step="0.01"
                    value={itemForm.rate}
                    onChange={e => setItemForm(p => ({ ...p, rate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Qty *</label>
                  <input
                    type="number" required min="1"
                    value={itemForm.qty}
                    onChange={e => setItemForm(p => ({ ...p, qty: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">GST %</label>
                  <select
                    value={itemForm.gstRate}
                    onChange={e => setItemForm(p => ({ ...p, gstRate: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm bg-white"
                  >
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Discount %</label>
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={itemForm.discount}
                    onChange={e => setItemForm(p => ({ ...p, discount: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-3">
                  <button type="submit" className="w-full h-[42px] bg-indigo-600 text-white hover:bg-indigo-700 font-bold rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm shadow-indigo-600/30">
                    <Plus size={18} /> Add Item
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Bill Items</h3>
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No items added yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 text-center">HSN</th>
                      <th className="py-2.5 px-3 text-center">Size</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-center">GST%</th>
                      <th className="py-2.5 px-3 text-center">Disc%</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-2 px-3 text-slate-800 text-sm font-medium">{item.name}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs text-center">{item.hsn || '—'}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs text-center">{item.size || '—'}</td>
                        <td className="py-2 px-3 text-slate-600 text-sm text-right">₹{item.rate.toFixed(2)}</td>
                        <td className="py-2 px-3 text-slate-800 text-sm font-medium text-center">{item.quantity}</td>
                        <td className="py-2 px-3 text-center">
                          {item.gstRate > 0
                            ? <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">{item.gstRate}%</span>
                            : <span className="text-xs text-slate-400">0%</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.discount > 0
                            ? <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold">{item.discount}%</span>
                            : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-800 text-sm font-bold text-right">₹{item.amount.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">
                          <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                            <Trash2 size={15} />
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Payment Mode</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['Cash', 'UPI', 'Credit'].map(mode => (
                <button
                  key={mode} type="button"
                  onClick={() => { setPaymentMode(mode); if (mode === 'Credit') setAmountPaidInput(0); }}
                  className={`py-2 text-sm font-medium rounded-lg border transition-all ${paymentMode === mode ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Received (₹)</span>
                {paymentMode === 'Credit' ? (
                  <input type="number" value={0} readOnly className="w-24 px-2 py-1 text-right bg-transparent text-slate-800 font-bold" />
                ) : (
                  <input
                    type="number" min="0" step="0.01"
                    value={amountPaidInput}
                    onChange={e => setAmountPaidInput(e.target.value)}
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

          {/* Final Summary */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-bl-full pointer-events-none"></div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4 border-b border-slate-700 pb-2">Final Summary</h3>

            <div className="space-y-2.5 mb-6 relative z-10 text-sm">
              <div className="flex justify-between text-slate-300 font-medium">
                <span>Subtotal (Taxable)</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-amber-400 font-medium">
                  <span>Total Discount</span>
                  <span>− ₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
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
              {includePrevBalance && (
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Previous Udhaar</span>
                  <span>₹{prevBalance.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-600 flex justify-between items-center">
                <span className="text-lg">Grand Total</span>
                <span className="text-3xl font-black text-white tracking-tight">₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-700 space-y-2 mt-1">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-400">Amount Paid</span>
                  <span className="text-emerald-400">₹{amountPaid.toFixed(2)}</span>
                </div>
                {outstanding > 0 && (
                  <div className="flex justify-between items-center font-black">
                    <span className="text-slate-300">Outstanding</span>
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
                <RefreshCw size={18} /> Save &amp; New Bill
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-indigo-600/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Save size={48} className="text-indigo-600 animate-bounce" />
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">BILL SAVED!</h2>
            <p className="text-indigo-100 font-bold uppercase tracking-widest">Inventory &amp; Ledger Updated</p>
          </div>
        </div>
      )}
    </div>
  );
}
