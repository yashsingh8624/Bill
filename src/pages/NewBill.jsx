import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, IndianRupee, Save, Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function NewBill() {
  const { products, addBill, generateBillNumber, userSettings, customers, addCustomer } = useAppContext();
  const navigate = useNavigate();
  const printRef = useRef();

  // Bill Details
  const [invoiceNo] = useState(generateBillNumber());
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

  // Handle Customer Selection
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust) {
        setCustomerName(cust.name);
        setCustomerPhone(cust.phone || '');
      }
    }
  }, [selectedCustomerId, customers]);

  // Handle Product Selection
  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        setManualItemName(prod.name);
        setManualPrice(prod.sellingPrice || prod.price || '');
      }
    } else {
      setManualItemName('');
      setManualPrice('');
    }
  }, [selectedProductId, products]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!manualItemName || !quantity || !manualPrice) return;

    const priceNum = parseFloat(manualPrice);
    const qtyNum = parseInt(quantity, 10);
    
    setItems([...items, {
      productId: selectedProductId || null,
      name: manualItemName,
      price: priceNum,
      quantity: qtyNum,
      amount: priceNum * qtyNum
    }]);
    
    setSelectedProductId('');
    setManualItemName('');
    setManualPrice('');
    setQuantity(1);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = gstEnabled ? (subTotal * gstRate) / 100 : 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grandTotal = subTotal + gstAmount;
  
  // Amount paid logic
  const amountPaid = amountPaidInput === '' 
    ? (paymentMode === 'Credit' ? 0 : grandTotal) 
    : parseFloat(amountPaidInput) || 0;
  const outstanding = Math.max(0, grandTotal - amountPaid);

  const handleSaveBill = () => {
    if (!customerName || items.length === 0) return;
    
    // Check if we need to create a new customer
    let custId = selectedCustomerId;
    if (!custId) {
      // Look for existing by exact name & phone
      const existing = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase() && c.phone === customerPhone);
      if (existing) {
        custId = existing.id;
      } else {
        // Create new
        custId = Date.now().toString() + '-cust';
        addCustomer({
          id: custId,
          name: customerName,
          phone: customerPhone,
          createdAt: new Date().toISOString()
        });
      }
    }

    addBill({
      invoiceNo,
      date,
      customerId: custId,
      customerName,
      customerPhone,
      items,
      subTotal,
      gstEnabled,
      gstRate,
      cgst,
      sgst,
      total: grandTotal, // for backwards compatibility
      grandTotal,
      paymentMode,
      amountPaid,
      outstanding
    });
    
    navigate('/bills');
  };

  const generatePDF = async () => {
    const element = printRef.current;
    if (!element) return;
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Bill_${invoiceNo}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Create New Bill</h2>
          <p className="text-slate-500 text-sm mt-1">Invoice #{invoiceNo}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={generatePDF}
            disabled={items.length === 0}
            className="px-4 py-2 bg-white text-slate-700 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl font-medium flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Download size={18} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Bill Details */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Customer & Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Existing Customer (Optional)</label>
                <select 
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white"
                >
                  <option value="">-- New Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Name</label>
                <input 
                  type="text" required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="9876543210"
                />
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Add Items</h3>
            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-500 mb-1">From Inventory</label>
                <select 
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 bg-white text-sm"
                >
                  <option value="">-- Custom/Manual --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stk: {p.quantity || p.stockQty})</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-slate-500 mb-1">Item Name</label>
                <input 
                  type="text" required
                  value={manualItemName}
                  onChange={(e) => setManualItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  placeholder="Item description"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Rate (₹)</label>
                <input 
                  type="number" required min="0" step="0.01"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                <input 
                  type="number" required min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/50 text-sm"
                />
              </div>
              <div className="md:col-span-1">
                <button type="submit" className="w-full h-[38px] bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center justify-center transition-colors">
                  <Plus size={18} />
                </button>
              </div>
            </form>
          </div>
          
          {/* Item List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-800">Bill Items</h3>
            </div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No items added yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4 text-right">Rate</th>
                      <th className="py-3 px-4 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-800 text-sm font-medium">{item.name}</td>
                        <td className="py-3 px-4 text-slate-600 text-sm text-right">₹{item.price.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-800 text-sm font-medium text-center">{item.quantity}</td>
                        <td className="py-3 px-4 text-slate-800 text-sm font-bold text-right">₹{item.amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
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

        {/* Right Column - Setup & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Billing Options</h3>
            
            {/* GST Toggle */}
            <div className="mb-5 pb-5 border-b border-slate-100">
              <label className="flex items-center justify-between cursor-pointer mb-3">
                <span className="text-sm font-medium text-slate-700">Apply GST</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${gstEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${gstEnabled ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>
              {gstEnabled && (
                <div className="flex gap-2 mt-2">
                  {[5, 12, 18, 28].map(rate => (
                    <button 
                      key={rate} type="button" 
                      onClick={() => setGstRate(rate)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md border ${gstRate === rate ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Mode */}
            <div className="mb-5 pb-5 border-b border-slate-100">
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {['Cash', 'UPI', 'Credit'].map(mode => (
                  <button 
                    key={mode} type="button" 
                    onClick={() => { setPaymentMode(mode); if(mode==='Credit') setAmountPaidInput(0); }}
                    className={`py-2 text-sm font-medium rounded-lg border ${paymentMode === mode ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Amount Paid (₹)</span>
                {paymentMode === 'Credit' ? (
                   <input type="number" value={amountPaid} readOnly className="w-24 px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-medium" />
                ) : (
                   <input 
                     type="number" min="0" step="0.01" 
                     value={amountPaidInput} 
                     onChange={(e) => setAmountPaidInput(e.target.value)} 
                     placeholder={grandTotal.toFixed(2)}
                     className="w-24 px-2 py-1 text-right bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 font-medium shadow-inner" 
                   />
                )}
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Outstanding Balance</span>
                <span className={`font-bold ${outstanding > 0 ? 'text-red-500' : 'text-emerald-500'}`}>₹{outstanding.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Grand Summary */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 text-white">
            <h3 className="text-sm font-bold text-slate-300 uppercase letter-spacing-wider mb-4 border-b border-slate-700 pb-2">Final Summary</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-300 text-sm">
                <span>Subtotal</span>
                <span className="font-medium text-white">₹{subTotal.toFixed(2)}</span>
              </div>
              {gstEnabled && (
                <>
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>CGST ({gstRate/2}%)</span>
                    <span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-xs">
                    <span>SGST ({gstRate/2}%)</span>
                    <span>₹{sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="pt-3 border-t border-slate-600 flex justify-between items-center text-lg font-bold">
                <span>Grand Total</span>
                <span className="text-2xl text-emerald-400">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <button 
              onClick={handleSaveBill}
              disabled={!customerName || items.length === 0}
              className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              <Save size={20} /> Save Bill
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Print Wrapper for PDF */}
      <div className="hidden">
        <div ref={printRef} className="bg-white p-10 w-[800px] text-slate-800 border-2 border-slate-900 mx-auto font-sans">
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{userSettings.businessName}</h1>
              <p className="text-slate-600 mt-1 flex items-center gap-2">WhatsApp: <span className="font-medium">{userSettings.ownerPhone}</span></p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-400 uppercase">Invoice</h2>
              <p className="font-medium mt-1 text-slate-800"><span className="text-slate-500">Invoice No:</span> {invoiceNo}</p>
              <p className="font-medium text-slate-800"><span className="text-slate-500">Date:</span> {new Date(date).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Billed To:</h3>
            <p className="text-lg font-bold text-slate-900">{customerName}</p>
            {customerPhone && <p className="text-slate-700 font-medium">Phone: {customerPhone}</p>}
          </div>

          <table className="w-full mb-8 border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="py-3 px-4 text-left font-bold uppercase text-sm border border-slate-800">Item Description</th>
                <th className="py-3 px-4 text-right font-bold uppercase text-sm border border-slate-800 w-24">Rate</th>
                <th className="py-3 px-4 text-center font-bold uppercase text-sm border border-slate-800 w-20">Qty</th>
                <th className="py-3 px-4 text-right font-bold uppercase text-sm border border-slate-800 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="py-3 px-4 font-medium border-x border-slate-200">{item.name}</td>
                  <td className="py-3 px-4 text-right border-x border-slate-200">₹{item.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center border-x border-slate-200">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-bold border-x border-slate-200">₹{item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <div className="w-80">
              <div className="flex justify-between py-2 border-b border-slate-200 text-slate-700">
                <span className="font-bold">SubTotal</span>
                <span className="font-bold">₹{subTotal.toFixed(2)}</span>
              </div>
              {gstEnabled && (
                <>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600 text-sm">
                    <span>CGST ({gstRate/2}%)</span><span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-200 text-slate-600 text-sm">
                    <span>SGST ({gstRate/2}%)</span><span>₹{sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-3 text-xl font-black text-slate-900 border-b-2 border-slate-800">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Payment Mode</span>
                  <span className="font-bold">{paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Amount Paid</span>
                  <span className="font-bold text-emerald-600">₹{amountPaid.toFixed(2)}</span>
                </div>
                {outstanding > 0 && (
                  <div className="flex justify-between text-base border-t border-slate-100 pt-2 mt-2">
                    <span className="text-slate-600 font-bold">Outstanding Balance</span>
                    <span className="font-black text-red-600">₹{outstanding.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-16 text-center text-slate-400 text-sm font-medium border-t border-slate-200 pt-6">
            Thank you for your business!
          </div>
        </div>
      </div>
    </div>
  );
}
