import { useState } from 'react';

const mockBill = {
  invoiceNo: 'INV-2026-001',
  readableDate: '19-May-2026',
  paymentMode: 'UPI',
  customerName: 'Rohit Sharma',
  customerPhone: '+91 9876543210',
  customerAddress: '123, Retail Market, New Delhi - 110001',
  items: [
    { name: 'Cotton Shirt - Blue', quantity: 10, rate: 450.00, gstRate: 5, amount: 4500.00 },
    { name: 'Formal Trousers - Black', quantity: 5, rate: 850.00, gstRate: 5, amount: 4250.00 },
    { name: 'Hosiery Innerwear Set', quantity: 20, rate: 150.00, gstRate: 5, amount: 3000.00 }
  ],
  subTotal: 11750.00,
  totalDiscount: 250.00,
  cgst: 287.50,
  sgst: 287.50,
  grandTotal: 12075.00,
  amountPaid: 5000.00,
  dueAmount: 7075.00
};

const mockSettings = {
  businessName: 'SHARMA TEXTILES & HOSIERY',
  businessAddress: 'Shop No. 45, Wholesale Cloth Market, Chandni Chowk, Delhi',
  ownerPhone: '+91 9123456780',
  email: 'contact@sharmat.in',
  gstNumber: '07AAACA1234A1Z5',
  bankName: 'State Bank of India',
  bankAccount: '31234567890',
  bankIFSC: 'SBIN0001234',
  termsAndConditions: '1. Goods once sold will not be taken back.\n2. Subject to Delhi Jurisdiction.',
  qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay',
  logo: 'https://placehold.co/100x100?text=LOGO'
};

const A4_CONTAINER = "w-[794px] min-h-[1123px] bg-white text-black shrink-0 relative flex flex-col";

const Style1 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-8 shadow-xl mx-auto bg-white mb-20`}>
    <div className="border border-black h-full flex flex-col">
      <div className="text-center font-bold text-lg border-b border-black py-1 tracking-widest">TAX INVOICE</div>
      <div className="text-center py-4 border-b border-black bg-neutral-50">
        <h1 className="text-3xl font-black uppercase">{settings.businessName}</h1>
        <p className="text-sm mt-1">{settings.businessAddress}</p>
        <p className="text-sm mt-1">Mob: {settings.ownerPhone} | Email: {settings.email}</p>
        <p className="font-semibold mt-1">GSTIN: {settings.gstNumber}</p>
      </div>
      
      <div className="flex border-b border-black">
        <div className="w-1/2 border-r border-black p-3 bg-white">
          <p className="font-bold border-b border-black pb-1 mb-2">BILL TO:</p>
          <p className="font-bold uppercase text-lg">{bill.customerName}</p>
          <p className="text-sm">Phone: {bill.customerPhone}</p>
          <p className="text-sm">{bill.customerAddress}</p>
        </div>
        <div className="w-1/2 p-3 bg-white">
          <div className="flex justify-between mb-1 text-sm border-b border-neutral-200 pb-1">
            <span className="font-bold">Invoice No:</span><span>{bill.invoiceNo}</span>
          </div>
          <div className="flex justify-between mb-1 text-sm border-b border-neutral-200 pb-1">
            <span className="font-bold">Date:</span><span>{bill.readableDate}</span>
          </div>
          <div className="flex justify-between text-sm py-1 border-b border-neutral-200">
            <span className="font-bold">Payment Mode:</span><span>{bill.paymentMode}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 border-b border-black flex flex-col">
        <table className="w-full text-sm text-left">
          <thead className="border-b-2 border-black">
            <tr>
              <th className="py-2 px-3 border-r border-black w-12 text-center bg-neutral-100">SR</th>
              <th className="py-2 px-3 border-r border-black bg-neutral-100">ITEM NAME</th>
              <th className="py-2 px-3 border-r border-black text-center w-20 bg-neutral-100">QTY</th>
              <th className="py-2 px-3 border-r border-black text-right w-24 bg-neutral-100">RATE</th>
              <th className="py-2 px-3 border-r border-black text-center w-20 bg-neutral-100">GST</th>
              <th className="py-2 px-3 text-right w-32 bg-neutral-100">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item: any, idx: number) => (
              <tr key={idx} className="">
                <td className="py-2 px-3 border-r border-black text-center border-b border-neutral-200">{idx + 1}</td>
                <td className="py-2 px-3 border-r border-black border-b border-neutral-200 font-medium">{item.name}</td>
                <td className="py-2 px-3 border-r border-black text-center border-b border-neutral-200">{item.quantity}</td>
                <td className="py-2 px-3 border-r border-black text-right border-b border-neutral-200">{item.rate.toFixed(2)}</td>
                <td className="py-2 px-3 border-r border-black text-center border-b border-neutral-200">{item.gstRate}%</td>
                <td className="py-2 px-3 text-right border-b border-neutral-200 font-bold">{item.amount.toFixed(2)}</td>
              </tr>
            ))}
            <tr className="flex-1"><td colSpan={6} className="h-48 border-b border-transparent"></td></tr>
          </tbody>
        </table>
      </div>

      <div className="flex h-56">
        <div className="w-2/3 border-r border-black flex flex-col justify-between">
          <div className="flex p-3 gap-4 border-b border-black">
             <img src={settings.qrImage} alt="QR" className="w-24 h-24" />
             <div className="text-sm">
                <p className="font-bold border-b border-black pb-1 mb-1">Bank Details:</p>
                <p>Bank: {settings.bankName}</p>
                <p>A/c No: {settings.bankAccount}</p>
                <p>IFSC: {settings.bankIFSC}</p>
             </div>
          </div>
          <div className="p-3 mt-auto">
            <p className="font-bold mb-1 underline">Terms & Conditions:</p>
            <pre className="font-sans whitespace-pre-wrap text-xs">{settings.termsAndConditions}</pre>
          </div>
        </div>
        <div className="w-1/3 flex flex-col bg-neutral-50">
          <div className="flex justify-between px-3 py-2 text-sm border-b border-neutral-300"><span className="font-bold">Subtotal:</span><span>{bill.subTotal.toFixed(2)}</span></div>
          <div className="flex justify-between px-3 py-2 text-sm border-b border-neutral-300"><span className="font-bold">Discount:</span><span>-{bill.totalDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between px-3 py-2 text-sm border-b border-neutral-300"><span className="font-bold">Total Taxes:</span><span>{(bill.cgst + bill.sgst).toFixed(2)}</span></div>
          <div className="border-y-2 border-black flex justify-between px-3 py-3 text-lg font-bold bg-neutral-200">
            <span>Grand Total:</span><span>Rs {bill.grandTotal.toFixed(2)}</span>
          </div>
          <div className="mt-auto text-center p-3 text-sm font-bold border-t-2 border-black">
            <p className="mb-10 font-normal text-xs text-right">For {settings.businessName}</p>
            <p className="text-right">Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Style2 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-10 mx-auto font-sans bg-white shadow-xl text-slate-800 mb-20`}>
    <div className="flex justify-between items-center pb-6 border-b border-slate-200 mb-8 mt-4">
      <div className="flex items-center gap-4">
         {settings.logo && <img src={settings.logo} alt="Logo" className="w-16 h-16 rounded shadow-sm" />}
         <div>
            <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wide">{settings.businessName}</h1>
            <p className="text-sm text-slate-500 mt-1">GSTIN: <span className="font-bold text-slate-700">{settings.gstNumber}</span></p>
         </div>
      </div>
      <div className="text-right">
        <h2 className="text-4xl font-light text-indigo-700 uppercase tracking-widest leading-none">Tax Invoice</h2>
      </div>
    </div>

    <div className="flex justify-between bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100">
       <div className="w-1/2">
         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invoice To</p>
         <h3 className="text-xl font-bold text-slate-900">{bill.customerName}</h3>
         <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-sm">{bill.customerAddress}</p>
         <p className="text-sm text-slate-600 mt-1">{bill.customerPhone}</p>
       </div>
       <div className="w-1/3 text-right flex flex-col justify-center">
         <div className="mb-4">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No</p>
           <p className="font-bold text-slate-900 text-lg">{bill.invoiceNo}</p>
         </div>
         <div>
           <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Issue</p>
           <p className="font-bold text-slate-900 leading-tight">{bill.readableDate}</p>
         </div>
       </div>
    </div>

    <table className="w-full text-sm mb-8">
      <thead>
        <tr className="bg-indigo-50/80 text-indigo-900">
          <th className="py-3 px-4 text-left font-bold rounded-l-lg">Item Summary</th>
          <th className="py-3 px-4 text-center font-bold">Qty</th>
          <th className="py-3 px-4 text-right font-bold">Rate</th>
          <th className="py-3 px-4 text-center font-bold">Tax</th>
          <th className="py-3 px-4 text-right font-bold rounded-r-lg">Total</th>
        </tr>
      </thead>
      <tbody>
         {bill.items.map((item: any, idx: number) => (
           <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
              <td className="py-4 px-4 font-semibold text-slate-800">{item.name}</td>
              <td className="py-4 px-4 text-center text-slate-600 font-medium">{item.quantity}</td>
              <td className="py-4 px-4 text-right text-slate-600">₹ {item.rate.toFixed(2)}</td>
              <td className="py-4 px-4 text-center text-slate-500">
                 <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{item.gstRate}%</span>
              </td>
              <td className="py-4 px-4 text-right font-bold text-slate-800">₹ {item.amount.toFixed(2)}</td>
           </tr>
         ))}
      </tbody>
    </table>

    <div className="flex gap-8 mb-8 mt-12">
       <div className="w-1/2">
         <p className="font-bold text-slate-700 mb-2">Payment Details</p>
         <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
           {settings.qrImage ? (
             <div className="flex gap-4 items-center">
               <img src={settings.qrImage} className="w-20 h-20 rounded shadow" alt="QR" />
               <div className="text-sm">
                  <p className="font-bold text-lg mb-1">{settings.bankName}</p>
                  <p className="text-slate-600 font-mono text-sm">Ac: {settings.bankAccount}</p>
                  <p className="text-slate-600 font-mono text-sm">IFSC: {settings.bankIFSC}</p>
               </div>
             </div>
           ) : null}
         </div>
       </div>

       <div className="w-1/2">
          <div className="bg-indigo-50/40 rounded-xl p-6 border border-indigo-100/50">
             <div className="flex justify-between py-2 text-sm border-b border-indigo-100/50"><span className="text-slate-600">Subtotal</span><span className="font-medium text-slate-900">₹ {bill.subTotal.toFixed(2)}</span></div>
             <div className="flex justify-between py-2 text-sm border-b border-indigo-100/50"><span className="text-slate-600">Discount</span><span className="font-medium text-emerald-600">- ₹ {bill.totalDiscount.toFixed(2)}</span></div>
             <div className="flex justify-between py-2 text-sm"><span className="text-slate-600">Total Tax (GST)</span><span className="font-medium text-slate-900">₹ {(bill.cgst + bill.sgst).toFixed(2)}</span></div>
             <div className="border-t-2 border-indigo-200 my-4"></div>
             <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-bold text-indigo-900">Grand Total</span>
                <span className="text-3xl font-black text-indigo-700">₹ {bill.grandTotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-end text-sm mt-1 mb-1">
                 <span className="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">Amount Paid: ₹ {bill.amountPaid.toFixed(2)}</span>
             </div>
             <div className="flex justify-end text-sm">
                 <span className="text-rose-700 bg-rose-100 font-bold px-2 py-0.5 rounded">Balance Due: ₹ {bill.dueAmount.toFixed(2)}</span>
             </div>
          </div>
       </div>
    </div>

    <div className="mt-auto border-t border-slate-200 pt-6 flex justify-between absolute bottom-10 left-10 right-10">
      <div>
         <p className="font-bold text-sm text-slate-700 mb-1">Terms & Conditions</p>
         <pre className="font-sans text-xs text-slate-500 whitespace-pre-wrap">{settings.termsAndConditions}</pre>
      </div>
      <div className="text-center pt-8">
        <div className="w-48 border-b-2 border-slate-300 mb-2 mx-auto"></div>
        <p className="text-sm font-bold text-slate-800 mt-2">Authorised Signatory</p>
      </div>
    </div>
  </div>
);

const Style3 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-8 shadow-xl mx-auto font-sans mb-20 bg-white`}>
    <h2 className="text-center text-2xl font-bold mb-4 text-sky-900 border-b-2 border-sky-900 pb-2 tracking-[0.2em] uppercase">Tax Invoice</h2>
    
    <div className="grid grid-cols-2 gap-4 mb-4">
       <div className="border-2 border-sky-900 p-4 rounded-tl-lg">
         <h1 className="text-2xl font-black text-sky-900 uppercase mb-2">{settings.businessName}</h1>
         <p className="text-sm">{settings.businessAddress}</p>
         <p className="text-sm mt-2 font-bold text-sky-900">GSTIN: {settings.gstNumber}</p>
         <p className="text-sm">Mob: {settings.ownerPhone}</p>
       </div>
       <div className="border-2 border-sky-900 p-4 rounded-tr-lg flex flex-col justify-center">
         <div className="grid grid-cols-2 gap-y-3">
             <span className="font-bold text-sky-800 border-r border-sky-200">Invoice No:</span>
             <span className="font-bold text-right text-lg">{bill.invoiceNo}</span>
             <span className="font-bold text-sky-800 border-r border-sky-200">Issue Date:</span>
             <span className="font-bold text-right text-lg">{bill.readableDate}</span>
             <span className="font-bold text-sky-800 border-r border-sky-200">Payment Terms:</span>
             <span className="font-bold text-right uppercase text-lg">{bill.paymentMode}</span>
         </div>
       </div>
    </div>

    <div className="border-2 border-sky-900 p-4 mb-4 bg-sky-50">
         <p className="text-sm font-bold text-sky-800 uppercase mb-2 border-b border-sky-200 pb-1">Billed To Details</p>
         <p className="font-black text-xl text-slate-800">{bill.customerName}</p>
         <p className="text-sm">{bill.customerAddress}</p>
         <p className="text-sm font-medium mt-1 uppercase text-slate-700">Contact: {bill.customerPhone}</p>
    </div>

    <table className="w-full text-sm mb-4 border-2 border-sky-900 rounded border-separate border-spacing-0 overflow-hidden">
      <thead className="bg-sky-900 text-white">
        <tr>
          <th className="py-2 px-3 text-center border-r border-sky-700 w-12">#</th>
          <th className="py-2 px-3 text-left border-r border-sky-700">Description of Goods</th>
          <th className="py-2 px-3 text-center border-r border-sky-700 w-20">Qty</th>
          <th className="py-2 px-3 text-right border-r border-sky-700 w-28">Rate</th>
          <th className="py-2 px-3 text-center border-r border-sky-700 w-20">Tax</th>
          <th className="py-2 px-3 text-right w-32">Amount</th>
        </tr>
      </thead>
      <tbody>
         {bill.items.map((item: any, idx: number) => (
           <tr key={idx} className="border-b border-sky-100 last:border-0 even:bg-neutral-50">
             <td className="py-2 px-3 text-center border-r border-sky-200 font-bold">{idx + 1}</td>
             <td className="py-2 px-3 border-r border-sky-200 font-bold">{item.name}</td>
             <td className="py-2 px-3 text-center border-r border-sky-200 font-medium">{item.quantity}</td>
             <td className="py-2 px-3 text-right border-r border-sky-200">{item.rate.toFixed(2)}</td>
             <td className="py-2 px-3 text-center border-r border-sky-200 bg-sky-50 font-medium">{item.gstRate}%</td>
             <td className="py-2 px-3 text-right font-bold">{item.amount.toFixed(2)}</td>
           </tr>
         ))}
      </tbody>
    </table>

    <div className="flex gap-4 h-48">
       <div className="w-2/3 border-2 border-sky-900 p-4 flex flex-col justify-between rounded-bl-lg">
         <div className="flex gap-4 items-center">
            {settings.qrImage && (
              <img src={settings.qrImage} alt="QR" className="w-20 h-20 border border-slate-300 p-0.5" />
            )}
            <div>
               <p className="font-bold text-sky-900 mb-1 border-b border-sky-200 pb-1">Bank Information</p>
               <div className="grid grid-cols-[80px_1fr] text-sm"><span className="font-medium text-slate-500">Bank:</span><span className="font-bold">{settings.bankName}</span></div>
               <div className="grid grid-cols-[80px_1fr] text-sm"><span className="font-medium text-slate-500">A/c No:</span><span className="font-mono font-bold">{settings.bankAccount}</span></div>
               <div className="grid grid-cols-[80px_1fr] text-sm"><span className="font-medium text-slate-500">IFSC:</span><span className="font-mono font-bold">{settings.bankIFSC}</span></div>
            </div>
         </div>
         <div className="mt-4 border-t border-sky-200 pt-2">
            <p className="font-bold text-[10px] text-sky-800 uppercase mb-1">Terms & Conditions</p>
            <pre className="font-sans text-[10px] text-slate-600 whitespace-pre-wrap">{settings.termsAndConditions}</pre>
         </div>
       </div>

       <div className="w-1/3 border-2 top-border border-sky-900 rounded-br-lg flex flex-col pt-0">
          <div className="flex justify-between px-4 py-2 text-sm border-b border-sky-200 bg-neutral-50"><span className="text-slate-600 font-bold">Subtotal</span><span className="font-bold">₹ {bill.subTotal.toFixed(2)}</span></div>
          <div className="flex justify-between px-4 py-2 text-sm border-b border-sky-200"><span className="text-slate-600 font-bold">Total Discount</span><span className="font-bold text-red-600">-₹ {bill.totalDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between px-4 py-2 text-sm border-b border-sky-200 bg-neutral-50"><span className="text-slate-600 font-bold">Total Tax</span><span className="font-bold">₹ {(bill.cgst + bill.sgst).toFixed(2)}</span></div>
          
          <div className="flex justify-between px-4 py-3 text-xl font-black text-white bg-sky-900">
             <span>TOTAL</span>
             <span>₹ {bill.grandTotal.toFixed(2)}</span>
          </div>
          
          <div className="mt-auto px-4 py-3 text-center">
            <p className="font-bold text-xs text-sky-900 pt-8 border-t border-dashed border-sky-400">Authorised Signatory</p>
          </div>
       </div>
    </div>
  </div>
);

const Style4 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-12 shadow-2xl mx-auto font-sans bg-zinc-50 text-zinc-800 mb-20`}>
    <header className="flex justify-between items-end border-b-4 border-zinc-900 pb-8 mb-12">
      <div>
        <h1 className="text-[40px] font-black text-zinc-900 tracking-tighter leading-none mb-3">{settings.businessName}</h1>
        <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest">{settings.businessAddress}</p>
        <p className="text-sm font-medium text-zinc-500 tracking-wider mt-1">{settings.ownerPhone} / GST: {settings.gstNumber}</p>
      </div>
      <div className="text-right">
        <h2 className="text-5xl font-black text-zinc-200 tracking-tighter uppercase leading-none right-align drop-shadow-sm">INVOICE</h2>
      </div>
    </header>

    <div className="grid grid-cols-2 gap-12 mb-12">
       <div>
         <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-3">Invoice To</p>
         <p className="text-2xl font-black text-zinc-900 uppercase">{bill.customerName}</p>
         <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{bill.customerAddress}</p>
         <p className="text-sm font-bold text-zinc-800 mt-2">{bill.customerPhone}</p>
       </div>
       <div className="text-right flex flex-col items-end">
         <div className="grid grid-cols-2 gap-x-8 gap-y-4 max-w-xs text-left">
  <div className="text-right"><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-1 text-right">Invoice No</p><p className="font-black text-lg text-zinc-900">{bill.invoiceNo}</p></div>
             <div className="text-right"><p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-1 text-right">Date</p><p className="font-black text-lg text-zinc-900">{bill.readableDate}</p></div>
         </div>
       </div>
    </div>

    <table className="w-full text-sm mb-12 border-y-2 border-zinc-900">
      <thead>
        <tr className="text-zinc-900">
          <th className="py-4 text-left font-black uppercase tracking-wider text-[11px] border-b-2 border-zinc-900">Item Description</th>
          <th className="py-4 text-center font-black uppercase tracking-wider text-[11px] border-b-2 border-zinc-900 w-24">Qty</th>
          <th className="py-4 text-right font-black uppercase tracking-wider text-[11px] border-b-2 border-zinc-900 w-32">Rate</th>
          <th className="py-4 text-center font-black uppercase tracking-wider text-[11px] border-b-2 border-zinc-900 w-24">GST</th>
          <th className="py-4 text-right font-black uppercase tracking-wider text-[11px] border-b-2 border-zinc-900 w-40">Total</th>
        </tr>
      </thead>
      <tbody className="text-zinc-800">
        {bill.items.map((item: any, idx: number) => (
          <tr key={idx} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-100/50">
            <td className="py-5 font-bold uppercase text-[13px]">{item.name}</td>
            <td className="py-5 text-center font-medium">{item.quantity}</td>
            <td className="py-5 text-right font-mono">₹ {item.rate.toFixed(2)}</td>
            <td className="py-5 text-center font-bold text-zinc-400 bg-zinc-50 border-x border-zinc-50">{item.gstRate}%</td>
            <td className="py-5 text-right font-black text-zinc-900 text-base">₹ {item.amount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex justify-end mb-12">
      <div className="w-1/2 p-6 bg-white border border-zinc-200">
        <div className="flex justify-between py-2 text-sm mb-2">
          <span className="text-zinc-500 font-bold uppercase text-[11px] tracking-wider">Subtotal</span>
          <span className="font-bold text-zinc-900 font-mono text-base">₹ {bill.subTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-2 text-sm mb-2">
          <span className="text-zinc-500 font-bold uppercase text-[11px] tracking-wider">Discount</span>
          <span className="font-bold text-green-600 font-mono text-base">- ₹ {bill.totalDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-2 text-sm mb-4">
          <span className="text-zinc-500 font-bold uppercase text-[11px] tracking-wider">Taxes</span>
          <span className="font-bold text-zinc-900 font-mono text-base">₹ {(bill.cgst + bill.sgst).toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-4 text-2xl font-black text-zinc-900 border-t-4 border-zinc-900 items-center">
          <span className="uppercase text-sm tracking-widest pl-2">Total Due</span>
          <span>₹ {bill.dueAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div className="absolute bottom-12 left-12 right-12 grid grid-cols-2 gap-12 font-sans">
      <div>
         <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-2">Bank Details</p>
         <p className="text-sm font-bold">{settings.bankName}</p>
         <p className="text-sm text-zinc-600 font-mono mt-1">A/c: {settings.bankAccount}</p>
         <p className="text-sm text-zinc-600 font-mono mt-1">IFSC: {settings.bankIFSC}</p>
      </div>
      <div className="flex justify-end items-center gap-6">
         {settings.qrImage && (
           <img src={settings.qrImage} alt="QR Code" className="w-24 h-24 border-2 border-zinc-900 p-1 bg-white" />
         )}
         <div className="text-right pt-6">
           <p className="font-black text-zinc-900 border-t-2 border-zinc-300 pt-2 w-48 text-sm">AUTHORISED SIGN</p>
         </div>
      </div>
    </div>
  </div>
);

const Style5 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-8 mx-auto font-sans bg-white shadow-xl mb-20`}>
    <div className="border-[3px] border-slate-800 p-1 h-full flex flex-col relative">
      <div className="border border-slate-800 h-full flex flex-col">
        {/* Header Block */}
        <div className="border-b border-slate-800 p-5 text-center bg-slate-100 relative">
          <h2 className="absolute top-2 left-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 py-1 bg-white border border-slate-300">GST Invoice</h2>
          <h2 className="absolute top-2 right-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Original for Recipient</h2>
          <h1 className="text-4xl font-black uppercase text-slate-900 tracking-tight mt-4 mb-2">{settings.businessName}</h1>
          <p className="text-sm mt-1 font-semibold text-slate-700 max-w-2xl mx-auto">{settings.businessAddress}</p>
          <div className="flex justify-center items-center gap-4 mt-3 text-sm font-bold text-slate-800">
             <span className="bg-white px-2 py-1 border border-slate-300">GSTIN: {settings.gstNumber}</span>
             <span>Ph: {settings.ownerPhone}</span>
             {settings.email && <span>Email: {settings.email}</span>}
          </div>
        </div>

        {/* Info Block */}
        <div className="flex border-b border-slate-800 bg-white">
          <div className="w-[55%] border-r border-slate-800 p-4">
             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">Details of Receiver (Billed To)</p>
             <p className="font-black text-xl text-slate-900 uppercase">{bill.customerName}</p>
             <p className="text-sm mt-1 font-medium">{bill.customerAddress}</p>
             <p className="text-sm font-bold mt-2 text-slate-700">Ph: {bill.customerPhone}</p>
          </div>
          <div className="w-[45%] p-4 flex flex-col justify-center bg-slate-50">
             <div className="grid grid-cols-[120px_1fr] gap-y-3 text-sm">
                <span className="font-bold text-slate-600">Invoice No:</span>
                <span className="font-black text-right text-slate-900 text-lg">{bill.invoiceNo}</span>
                <span className="font-bold text-slate-600">Invoice Date:</span>
                <span className="font-bold text-right text-slate-900">{bill.readableDate}</span>
                <span className="font-bold text-slate-600">Payment Mode:</span>
                <span className="font-bold text-right text-slate-900 uppercase">{bill.paymentMode}</span>
             </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 border-b border-slate-800 bg-white">
           <table className="w-full text-sm">
             <thead className="bg-slate-200 border-b-2 border-slate-800 text-slate-900 shadow-sm">
               <tr>
                 <th className="py-3 px-2 border-r border-slate-800 text-center w-12 font-black">S.N.</th>
                 <th className="py-3 px-3 border-r border-slate-800 text-left font-black">Description of Goods</th>
                 <th className="py-3 px-2 border-r border-slate-800 text-center w-16 font-black text-xs">HSN/SAC</th>
                 <th className="py-3 px-2 border-r border-slate-800 text-center w-16 font-black">Qty</th>
                 <th className="py-3 px-3 border-r border-slate-800 text-right w-24 font-black">Rate</th>
                 <th className="py-3 px-2 border-r border-slate-800 text-center w-16 font-black">GST</th>
                 <th className="py-3 px-3 text-right w-32 font-black">Amount</th>
               </tr>
             </thead>
             <tbody>
               {bill.items.map((item: any, idx: number) => (
                 <tr key={idx} className="border-b border-slate-300">
                    <td className="py-3 px-2 border-r border-slate-800 text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="py-3 px-3 border-r border-slate-800 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-2 border-r border-slate-800 text-center font-mono text-xs text-slate-400">6201</td>
                    <td className="py-3 px-2 border-r border-slate-800 text-center font-bold text-slate-800 bg-slate-50">{item.quantity}</td>
                    <td className="py-3 px-3 border-r border-slate-800 text-right font-medium">{item.rate.toFixed(2)}</td>
                    <td className="py-3 px-2 border-r border-slate-800 text-center font-bold text-slate-600">{item.gstRate}%</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{item.amount.toFixed(2)}</td>
                 </tr>
               ))}
               <tr className="flex-1"><td colSpan={7} className="h-40 border-r border-slate-800 last:border-0 border-b border-transparent"></td></tr>
             </tbody>
           </table>
        </div>

        {/* Tax Summary & Totals */}
        <div className="flex border-b border-slate-800 bg-white h-36">
           <div className="w-[55%] border-r border-slate-800 p-4 flex flex-col justify-between">
             <div>
               <p className="font-bold text-[10px] uppercase tracking-wider mb-2 border-b border-slate-300 pb-1 text-slate-500">Amount in Words:</p>
               <p className="font-black text-slate-900 italic text-sm">Rupees {bill.grandTotal} Only.</p>
             </div>
             <div>
                <p className="font-bold text-[10px] uppercase tracking-wider mb-1 text-slate-500">Terms & Conditions:</p>
                <p className="text-[10px] font-medium text-slate-700 leading-tight">1. Goods once sold will not be taken back.<br/>2. Subject to local Jurisdiction only.</p>
             </div>
           </div>
           <div className="w-[45%] bg-slate-50">
             <table className="w-full h-full text-sm">
               <tbody>
                  <tr>
                    <td className="py-1 px-4 border-b border-slate-300 font-bold text-slate-600 text-xs uppercase">Taxable Value</td>
                    <td className="py-1 px-4 border-b border-slate-300 text-right font-black">₹ {bill.subTotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-4 border-b border-slate-300 font-bold text-slate-600 text-xs uppercase">Discount</td>
                    <td className="py-1 px-4 border-b border-slate-300 text-right font-black text-rose-600">- ₹ {bill.totalDiscount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-4 border-b border-slate-800 font-bold text-slate-600 text-xs uppercase bg-white">Tax (CGST + SGST)</td>
                    <td className="py-1 px-4 border-b border-slate-800 text-right font-black bg-white">₹ {(bill.cgst + bill.sgst).toFixed(2)}</td>
                  </tr>
                  <tr className="bg-slate-800 text-white">
                    <td className="py-3 px-4 font-black uppercase text-sm tracking-widest">Total Invoice Value</td>
                    <td className="py-3 px-4 text-right font-black text-xl">₹ {bill.grandTotal.toFixed(2)}</td>
                  </tr>
               </tbody>
             </table>
           </div>
        </div>

        {/* Footer */}
        <div className="flex p-4 bg-white items-end justify-between">
           <div className="min-w-[250px] border border-slate-300 p-3 bg-slate-50 rounded">
             <p className="font-black text-[11px] uppercase tracking-wider mb-2 text-slate-800 pb-1 border-b border-slate-200">Company Bank Details</p>
<div className="grid grid-cols-[80px_1fr] text-xs mb-1"><span className="font-bold text-slate-500">Bank:</span><span className="font-bold text-slate-900">{settings.bankName}</span></div>
             <div className="grid grid-cols-[80px_1fr] text-xs mb-1"><span className="font-bold text-slate-500">A/c No:</span><span className="font-mono font-bold text-slate-900">{settings.bankAccount}</span></div>
             <div className="grid grid-cols-[80px_1fr] text-xs mb-1"><span className="font-bold text-slate-500">IFSC Code:</span><span className="font-mono font-bold text-slate-900">{settings.bankIFSC}</span></div>
           </div>
           
           <div className="flex items-end gap-8">
              {settings.qrImage ? <img src={settings.qrImage} alt="QR" className="w-20 h-20 border border-slate-300 p-1" /> : null}
              <div className="flex flex-col items-center">
                 <p className="font-bold text-[10px] uppercase text-slate-500 mb-8 italic">For {settings.businessName}</p>
                 <p className="font-black text-xs text-slate-900 border-t-2 border-slate-800 pt-1 w-48 text-center uppercase">Authorised Signatory</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  </div>
);

const Style6 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-8 mx-auto font-sans bg-white shadow-xl mb-20`}>
    <div className="border border-black h-full flex flex-col text-sm">
       <div className="text-center font-bold border-b border-black py-1">TAX INVOICE</div>
       
       <div className="flex border-b border-black">
          <div className="w-1/2 border-r border-black p-2 flex flex-col gap-1">
             <span className="font-bold">{settings.businessName}</span>
             <span className="text-xs">{settings.businessAddress}</span>
             <span className="text-xs">GSTIN/UIN: <strong>{settings.gstNumber}</strong></span>
             <span className="text-xs">E-Mail: {settings.email}</span>
          </div>
          <div className="w-1/2 flex flex-col">
             <div className="flex border-b border-black h-1/2">
                <div className="w-1/2 border-r border-black p-2">
                   <p className="text-[10px] text-slate-600 leading-tight">Invoice No.</p>
                   <p className="font-bold whitespace-nowrap">{bill.invoiceNo}</p>
                </div>
                <div className="w-1/2 p-2">
                   <p className="text-[10px] text-slate-600 leading-tight">Dated</p>
                   <p className="font-bold">{bill.readableDate}</p>
                </div>
             </div>
             <div className="flex h-1/2">
                <div className="w-1/2 border-r border-black p-2">
                   <p className="text-[10px] text-slate-600 leading-tight">Mode/Terms of Payment</p>
                   <p className="font-bold">{bill.paymentMode}</p>
                </div>
                <div className="w-1/2 p-2"></div>
             </div>
          </div>
       </div>

       <div className="flex border-b border-black">
          <div className="w-1/2 border-r border-black p-2 flex flex-col gap-1">
             <span className="text-[10px] text-slate-600 leading-tight">Buyer (Bill to)</span>
             <span className="font-bold">{bill.customerName}</span>
             <span className="text-xs">{bill.customerAddress}</span>
             <span className="text-xs">Phone: {bill.customerPhone}</span>
          </div>
          <div className="w-1/2 p-2 relative"></div>
       </div>

       <div className="flex-1 flex flex-col border-b border-black relative">
          <table className="w-full text-xs h-full table-fixed">
            <thead className="border-b border-black">
              <tr>
                 <th className="py-1 border-r border-black w-8">Sl<br/>No.</th>
                 <th className="py-1 border-r border-black">Description of Goods</th>
                 <th className="py-1 border-r border-black w-24">Quantity</th>
                 <th className="py-1 border-r border-black w-20">Rate</th>
                 <th className="py-1 border-r border-black w-12">per</th>
                 <th className="py-1 text-center w-28 text-right pr-2">Amount</th>
              </tr>
            </thead>
            <tbody className="align-top relative h-[400px]">
              {bill.items.map((item: any, idx: number) => (
                <tr key={idx} className="">
                   <td className="py-2 px-1 text-center border-r border-black h-10 border-b border-transparent">{idx + 1}</td>
                   <td className="py-2 px-2 font-bold border-r border-black border-b border-transparent">{item.name}</td>
                   <td className="py-2 px-1 text-right font-bold border-r border-black border-b border-transparent">{item.quantity} Nos</td>
                   <td className="py-2 px-1 text-right border-r border-black border-b border-transparent">{item.rate.toFixed(2)}</td>
                   <td className="py-2 px-1 text-center border-r border-black border-b border-transparent">Nos</td>
                   <td className="py-2 px-2 text-right font-bold border-b border-transparent border-r-0">{item.amount.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="flex-1 h-full">
                 <td className="border-r border-black"></td>
                 <td className="border-r border-black text-right pr-4 pt-4 tracking-tighter">
                   <div className="mb-2 italic text-slate-700">Less: Discount</div>
                   <div className="mb-2 italic text-slate-700">Add: CGST @ {(bill.items[0]?.gstRate / 2).toFixed(1)}%</div>
                   <div className="mb-2 italic text-slate-700">Add: SGST @ {(bill.items[0]?.gstRate / 2).toFixed(1)}%</div>
                 </td>
                 <td className="border-r border-black font-bold text-slate-700 pt-4 text-center"></td>
                 <td className="border-r border-black text-right pt-4 px-1 italic">
                    <div className="mb-2">-</div>
                    <div className="mb-2">{(bill.items[0]?.gstRate).toFixed(1)}%</div>
                 </td>
                 <td className="border-r border-black"></td>
                 <td className="text-right px-2 pt-4">
                   <div className="mb-2 text-rose-600 font-bold">- {bill.totalDiscount.toFixed(2)}</div>
                   <div className="mb-2">{bill.cgst.toFixed(2)}</div>
                   <div className="mb-2">{bill.sgst.toFixed(2)}</div>
                 </td>
              </tr>
            </tbody>
          </table>
       </div>
       <div className="flex border-b border-black font-bold">
          <div className="text-right py-1 px-4 border-r border-black w-[calc(100%-112px)]">Total</div>
          <div className="py-1 px-2 text-right w-28">₹ {bill.grandTotal.toFixed(2)}</div>
       </div>
       <div className="border-b border-black p-2 bg-slate-50 min-h-16">
          <span className="text-[10px] text-slate-600">Amount Chargeable (in words)</span>
          <p className="font-bold leading-tight mt-1">INR {bill.grandTotal} Only</p>
       </div>
       <div className="flex min-h-32">
          <div className="w-1/2 p-2 border-r border-black">
             <p className="text-[10px] underline mb-1">Company's Bank Details</p>
             <p className="text-[10px] font-bold">Bank Name: {settings.bankName}</p>
             <p className="text-[10px] font-bold">A/c No.: {settings.bankAccount}</p>
             <p className="text-[10px] font-bold mb-3">Branch & IFS Code: {settings.bankIFSC}</p>
             <p className="text-[10px] underline mb-1">Declaration</p>
             <p className="text-[10px]">{settings.termsAndConditions}</p>
          </div>
          <div className="w-1/2 flex flex-col justify-end p-2 text-sm text-right">
             <p className="text-xs font-bold w-full text-right mb-16">for {settings.businessName}</p>
             <p className="text-[10px] pt-1 text-right">Authorised Signatory</p>
          </div>
       </div>
    </div>
  </div>
);

const Style7 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-10 mx-auto font-sans bg-white shadow-xl mb-20`}>
    <div className="text-center mb-6">
       <h1 className="text-3xl font-black text-emerald-800 uppercase tracking-wide">{settings.businessName}</h1>
       <p className="text-sm font-semibold">{settings.businessAddress}</p>
       <p className="text-sm">GSTIN: {settings.gstNumber} | Ph: {settings.ownerPhone}</p>
    </div>
    
    <div className="bg-emerald-800 text-white text-center py-1 font-bold tracking-[0.3em] uppercase mb-6">
       Tax Invoice
    </div>

    <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
       <div className="border border-emerald-800 p-4 rounded bg-emerald-50/30">
          <p className="text-emerald-700 font-bold uppercase mb-1 text-xs">Customer Details</p>
          <p className="text-xl font-bold text-slate-800">{bill.customerName}</p>
          <p className="text-slate-600 mt-1">{bill.customerAddress}</p>
          <p className="text-slate-600 mt-1">{bill.customerPhone}</p>
       </div>
       <div className="border border-emerald-800 p-4 rounded flex flex-col justify-center">
          <p className="flex justify-between border-b border-emerald-100 py-1"><span className="text-emerald-700 font-bold">Invoice Number:</span> <span className="font-black text-lg">{bill.invoiceNo}</span></p>
          <p className="flex justify-between border-b border-emerald-100 py-1"><span className="text-emerald-700 font-bold">Invoice Date:</span> <span className="font-bold">{bill.readableDate}</span></p>
          <p className="flex justify-between py-1"><span className="text-emerald-700 font-bold">Mode of Payment:</span> <span className="font-bold uppercase">{bill.paymentMode}</span></p>
       </div>
    </div>

    <table className="w-full text-xs mb-6 border border-emerald-800">
      <thead className="bg-emerald-800 text-white">
        <tr>
          <th className="py-2 px-1 border-r border-emerald-700" rowSpan={2}>S.N.</th>
          <th className="py-2 px-2 border-r border-emerald-700 text-left" rowSpan={2}>Item Description</th>
          <th className="py-2 px-1 border-r border-emerald-700" rowSpan={2}>Qty</th>
          <th className="py-2 px-2 border-r border-emerald-700" rowSpan={2}>Rate</th>
          <th className="py-2 px-2 border-r border-emerald-700" rowSpan={2}>Taxable</th>
          <th className="py-1 border-r border-emerald-700 border-b border-emerald-700" colSpan={2}>CGST</th>
          <th className="py-1 border-r border-emerald-700 border-b border-emerald-700" colSpan={2}>SGST</th>
          <th className="py-2 px-2 text-right" rowSpan={2}>Total</th>
        </tr>
        <tr>
          <th className="py-1 px-1 border-r border-emerald-700">%</th>
<th className="py-1 px-2 border-r border-emerald-700">Amt</th>
          <th className="py-1 px-1 border-r border-emerald-700">%</th>
          <th className="py-1 px-2 border-r border-emerald-700">Amt</th>
        </tr>
      </thead>
      <tbody>
        {bill.items.map((item: any, idx: number) => {
           const cgstAmt = (item.amount * (item.gstRate / 2)) / 100;
           return (
             <tr key={idx} className="border-b border-emerald-100 text-center">
               <td className="py-3 px-1 border-r border-emerald-100 font-bold">{idx + 1}</td>
               <td className="py-3 px-2 border-r border-emerald-100 text-left font-bold text-slate-800">{item.name}</td>
               <td className="py-3 px-1 border-r border-emerald-100 font-medium">{item.quantity}</td>
               <td className="py-3 px-2 border-r border-emerald-100 text-right">{item.rate.toFixed(2)}</td>
               <td className="py-3 px-2 border-r border-emerald-100 text-right">{item.amount.toFixed(2)}</td>
               <td className="py-3 px-1 border-r border-emerald-100 text-emerald-700">{item.gstRate / 2}%</td>
               <td className="py-3 px-2 border-r border-emerald-100 text-right text-emerald-700">{cgstAmt.toFixed(2)}</td>
               <td className="py-3 px-1 border-r border-emerald-100 text-emerald-700">{item.gstRate / 2}%</td>
               <td className="py-3 px-2 border-r border-emerald-100 text-right text-emerald-700">{cgstAmt.toFixed(2)}</td>
               <td className="py-3 px-2 text-right font-bold text-slate-900 bg-emerald-50">{(item.amount + cgstAmt * 2).toFixed(2)}</td>
             </tr>
           )
        })}
      </tbody>
    </table>

    <div className="flex justify-between items-start">
       <div className="w-[55%]">
         <div className="border border-emerald-800 rounded p-4 mb-4 text-sm font-medium">
             <p className="text-emerald-700 font-bold uppercase mb-2">Terms & Conditions</p>
             <pre className="font-sans text-xs whitespace-pre-wrap">{settings.termsAndConditions}</pre>
         </div>
         {settings.qrImage && (
           <div className="flex gap-4 items-center">
              <img src={settings.qrImage} className="w-16 h-16 border rounded" alt="Pay" />
              <div className="text-xs">
                <p className="font-bold">Scan to Pay via UPI</p>
                <p>Or NEFT/RTGS to: {settings.bankName}</p>
                <p>A/c: {settings.bankAccount} | IFSC: {settings.bankIFSC}</p>
              </div>
           </div>
         )}
       </div>
       <div className="w-[40%] border-2 border-emerald-800 rounded-lg p-4 bg-emerald-50">
          <div className="flex justify-between py-1 text-sm"><span className="text-emerald-800 font-bold">Subtotal</span><span className="font-mono">₹ {bill.subTotal.toFixed(2)}</span></div>
          <div className="flex justify-between py-1 text-sm"><span className="text-emerald-800 font-bold">Discount</span><span className="font-mono text-emerald-600">-₹ {bill.totalDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between py-1 text-sm"><span className="text-emerald-800 font-bold">CGST</span><span className="font-mono">₹ {bill.cgst.toFixed(2)}</span></div>
          <div className="flex justify-between py-1 text-sm border-b border-emerald-200 mb-2 pb-2"><span className="text-emerald-800 font-bold">SGST</span><span className="font-mono">₹ {bill.sgst.toFixed(2)}</span></div>
          <div className="flex justify-between items-center text-xl font-black text-emerald-900">
             <span>GRAND TOTAL</span>
             <span>₹ {bill.grandTotal.toFixed(2)}</span>
          </div>
          <div className="mt-8 text-center pt-8 border-t border-emerald-800 border-dashed">
            <p className="text-xs font-bold text-emerald-800">Authorised Signatory</p>
          </div>
       </div>
    </div>
  </div>
);

const Style8 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-10 mx-auto font-sans bg-white shadow-xl mb-20 text-slate-900`}>
    <div className="flex border-b-4 border-slate-900 pb-4 mb-4">
      <div className="w-2/3">
         <h1 className="text-4xl font-black uppercase text-slate-900 leading-none">{settings.businessName}</h1>
         <p className="text-sm font-bold text-slate-500 uppercase mt-2">{settings.businessAddress}</p>
         <p className="text-sm font-bold text-slate-800 mt-1 uppercase">GSTIN: {settings.gstNumber} | Phone: {settings.ownerPhone}</p>
      </div>
      <div className="w-1/3 text-right">
         <div className="bg-slate-900 text-white font-black text-2xl uppercase tracking-widest py-2 px-4 inline-block mb-3">INVOICE</div>
         <p className="font-bold text-lg">#{bill.invoiceNo}</p>
         <p className="font-bold text-slate-600 uppercase">{bill.readableDate}</p>
      </div>
    </div>

    <div className="flex gap-4 mb-6">
       <div className="w-1/2 border-2 border-slate-900 p-4">
          <p className="bg-slate-900 text-white font-bold inline-block px-2 py-0.5 text-xs mb-3">BILLED TO</p>
          <p className="text-2xl font-black uppercase">{bill.customerName}</p>
          <p className="text-sm uppercase font-bold text-slate-600 mt-1">{bill.customerAddress}</p>
          <p className="text-sm uppercase font-black mt-2 text-slate-800">{bill.customerPhone}</p>
       </div>
       <div className="w-1/2 border-2 border-slate-900 p-4 flex flex-col justify-center">
          <p className="bg-slate-900 text-white font-bold inline-block px-2 py-0.5 text-xs mb-3 w-max">PAYMENT DETAILS</p>
          <div className="grid grid-cols-2 gap-2 text-sm font-bold uppercase">
             <span className="text-slate-500">Method</span><span className="text-right">{bill.paymentMode}</span>
             <span className="text-slate-500">Amount Paid</span><span className="text-right text-emerald-600">₹ {bill.amountPaid.toFixed(2)}</span>
             <span className="text-slate-500 border-t border-slate-300 pt-1">Balance Due</span>
             <span className="text-right border-t border-slate-300 pt-1 text-rose-600 text-lg">₹ {bill.dueAmount.toFixed(2)}</span>
          </div>
       </div>
    </div>

    <table className="w-full text-sm font-bold uppercase mb-6 border-b-4 border-slate-900">
      <thead>
        <tr className="bg-slate-900 text-white">
          <th className="py-3 px-3 text-left">Description</th>
          <th className="py-3 px-2 text-center w-20">Qty</th>
          <th className="py-3 px-2 text-right w-28">Rate</th>
          <th className="py-3 px-2 text-center w-20">Tax</th>
          <th className="py-3 px-3 text-right w-36">Total</th>
        </tr>
      </thead>
      <tbody>
        {bill.items.map((item: any, idx: number) => (
          <tr key={idx} className="border-b-2 border-slate-200">
            <td className="py-4 px-3 text-slate-800">{item.name}</td>
            <td className="py-4 px-2 text-center text-slate-600">{item.quantity}</td>
            <td className="py-4 px-2 text-right text-slate-600">{item.rate.toFixed(2)}</td>
            <td className="py-4 px-2 text-center text-slate-600">{item.gstRate}%</td>
            <td className="py-4 px-3 text-right text-lg">{item.amount.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex justify-end mb-8 relative">
       <div className="absolute top-0 left-0">
          {settings.qrImage && (
             <div className="border-2 border-slate-900 p-2 inline-block">
               <img src={settings.qrImage} className="w-24 h-24" alt="QR" />
             </div>
          )}
       </div>
       <div className="w-[45%] border-2 border-slate-900 font-bold uppercase flex flex-col pt-0">
          <div className="flex justify-between p-3 border-b-2 border-slate-200"><span className="text-slate-500">Subtotal</span><span className="text-lg">₹ {bill.subTotal.toFixed(2)}</span></div>
          <div className="flex justify-between p-3 border-b-2 border-slate-200"><span className="text-slate-500">Discount</span><span className="text-lg text-emerald-600">-₹ {bill.totalDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between p-3 border-b-2 border-slate-200"><span className="text-slate-500">GST Sum</span><span className="text-lg">₹ {(bill.cgst + bill.sgst).toFixed(2)}</span></div>
          <div className="flex justify-between p-4 bg-slate-900 text-white items-center">
             <span className="text-xl">Grand Total</span>
             <span className="text-3xl font-black">₹ {bill.grandTotal.toFixed(2)}</span>
          </div>
       </div>
    </div>

    <div className="mt-auto border-t-2 border-slate-900 pt-4 flex justify-between uppercase font-bold text-[10px] items-end absolute bottom-10 left-10 right-10">
      <div>
         <p className="text-slate-500 mb-1 tracking-widest text-xs">Bank Details</p>
         <p>Bank: {settings.bankName}</p>
         <p>A/C: {settings.bankAccount}</p>
         <p>IFSC: {settings.bankIFSC}</p>
      </div>
      <div className="text-right">
        <p className="text-slate-500 mb-6 tracking-widest text-xs">For {settings.businessName}</p>
        <p className="border-t-2 border-slate-900 pt-1 w-48 ml-auto text-center">Authorised Signatory</p>
      </div>
    </div>
  </div>
);

const Style9 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-8 mx-auto font-sans bg-white shadow-xl text-slate-800 mb-20`}>
    <header className="border-b-2 border-sky-400 pb-2 mb-4 text-center">
      <h1 className="text-2xl font-bold uppercase text-sky-700 tracking-wider flex items-center justify-center gap-3">
        <span className="bg-sky-500 text-white px-2 py-0.5 rounded text-sm shrink-0">℞</span>
        {settings.businessName}
      </h1>
      <p className="text-xs font-medium text-slate-500 mt-1">{settings.businessAddress}</p>
      <p className="text-xs mt-1 font-bold">DL No: <span className="font-normal text-slate-600">SampleDL-1234</span> | GSTIN: <span className="font-normal text-slate-600">{settings.gstNumber}</span></p>
      <p className="text-xs font-bold">Ph: <span className="font-normal text-slate-600">{settings.ownerPhone}</span></p>
    </header>

    <div className="flex justify-between items-start text-xs border border-slate-300 rounded p-3 bg-slate-50 mb-4">
      <div className="space-y-1">
         <p><span className="font-bold">Patient / Buyer:</span> {bill.customerName}</p>
         <p><span className="font-bold">Address:</span> {bill.customerAddress}</p>
         <p><span className="font-bold">Doctor:</span> Self</p>
      </div>
      <div className="space-y-1 text-right">
         <p><span className="font-bold">Bill No:</span> <span className="text-rose-600 font-bold text-sm tracking-wider">{bill.invoiceNo}</span></p>
         <p><span className="font-bold">Date:</span> {bill.readableDate}</p>
         <p><span className="font-bold">Pay Mode:</span> {bill.paymentMode}</p>
      </div>
    </div>

    <table className="w-full text-xs box-border mb-4">
      <thead className="bg-sky-100/50 border-y border-slate-300">
        <tr>
          <th className="py-2 px-2 text-left font-bold">Item Description</th>
          <th className="py-2 px-2 text-center font-bold">Batch</th>
          <th className="py-2 px-2 text-center font-bold">Exp</th>
<th className="py-2 px-2 text-center font-bold">Qty</th>
          <th className="py-2 px-2 text-right font-bold w-16">MRP</th>
          <th className="py-2 px-2 text-right font-bold w-16">Rate</th>
          <th className="py-2 px-2 text-center font-bold w-12">GST</th>
          <th className="py-2 px-2 text-right font-bold w-20">Amount</th>
        </tr>
      </thead>
      <tbody>
        {bill.items.map((item: any, idx: number) => (
          <tr key={idx} className="border-b border-slate-200">
            <td className="py-3 px-2 font-bold text-slate-900 leading-tight">{item.name}</td>
            <td className="py-3 px-2 text-center text-slate-500">T-10{idx}</td>
            <td className="py-3 px-2 text-center text-slate-500">12/28</td>
            <td className="py-3 px-2 text-center font-bold">{item.quantity}</td>
            <td className="py-3 px-2 text-right text-slate-500 text-[10px]">{(item.rate * 1.1).toFixed(2)}</td>
            <td className="py-3 px-2 text-right font-bold">{item.rate.toFixed(2)}</td>
            <td className="py-3 px-2 text-center text-slate-500 text-[10px]">{item.gstRate}%</td>
            <td className="py-3 px-2 text-right font-black">{(item.amount).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex justify-between items-start pt-2 border-t-2 border-slate-300 relative absolute bottom-32 left-8 right-8">
       <div className="w-[45%]">
         <p className="text-[10px] font-bold text-slate-500">Terms & Conditions</p>
         <ul className="text-[9px] text-slate-500 list-disc pl-3">
           <li>Medicines without batch info & expiry date will not be replaced.</li>
           <li>Subject to local Jurisdiction.</li>
         </ul>
         <div className="mt-4 flex items-center gap-3">
           {settings.qrImage && <img src={settings.qrImage} className="w-12 h-12 rounded border" alt="QR" />}
           <div className="text-[10px]">
              <p className="font-bold">Pay via UPI</p>
              <p>{settings.bankName} - {settings.bankAccount}</p>
           </div>
         </div>
       </div>

       <div className="w-[40%] text-sm bg-sky-50 rounded p-3 font-medium">
         <div className="flex justify-between border-b border-sky-200 py-1"><span className="text-slate-600">Subtotal</span><span>{bill.subTotal.toFixed(2)}</span></div>
         <div className="flex justify-between border-b border-sky-200 py-1"><span className="text-slate-600">Discount Saved</span><span className="text-emerald-600 font-bold">{bill.totalDiscount.toFixed(2)}</span></div>
         <div className="flex justify-between border-b border-sky-200 py-1"><span className="text-slate-600">Total GST</span><span>{(bill.cgst + bill.sgst).toFixed(2)}</span></div>
         <div className="flex justify-between pt-2 text-lg font-black text-sky-800">
             <span>Net Payable</span>
             <span>₹ {bill.grandTotal.toFixed(2)}</span>
         </div>
       </div>
    </div>
    
    <div className="absolute bottom-8 left-8 right-8 text-center border-t border-slate-300 pt-3 flex justify-between px-10 items-end">
       <p className="text-[10px] italic">WISHING YOU A SPEEDY RECOVERY!</p>
       <div className="text-center">
         <p className="text-[10px] font-bold">Authorised Pharmacist</p>
       </div>
    </div>
  </div>
);

const Style10 = ({ bill, settings }: any) => (
  <div className={`${A4_CONTAINER} p-14 mx-auto font-serif bg-[#fdfbf7] text-[#2c2b29] shadow-xl mb-20`}>
    <header className="text-center mb-16">
      <h1 className="text-4xl uppercase tracking-[0.25em] mb-4 font-light text-[#1a1a1a]">{settings.businessName}</h1>
      <p className="text-xs uppercase tracking-widest text-[#5c5c5c] font-sans">{settings.businessAddress}</p>
      <p className="text-[10px] uppercase tracking-widest font-sans mt-2 text-[#808080]">GSTIN . {settings.gstNumber} &nbsp;&nbsp;|&nbsp;&nbsp; Ph . {settings.ownerPhone}</p>
      <div className="mt-8 border-b border-[#e0ddcd] w-1/3 mx-auto"></div>
      <h2 className="mt-6 text-sm uppercase tracking-[0.3em] font-sans text-[#a39f90]">Tax Invoice</h2>
    </header>

    <div className="flex justify-between font-sans text-xs tracking-wider mb-12">
      <div className="flex flex-col gap-2">
         <span className="uppercase text-[#a39f90] text-[10px] font-bold">Billed To</span>
         <span className="text-sm uppercase tracking-widest text-[#1a1a1a]">{bill.customerName}</span>
         <span className="text-[#5c5c5c] max-w-[200px] leading-relaxed">{bill.customerAddress}</span>
      </div>
      <div className="text-right flex flex-col gap-2">
         <span className="uppercase text-[#a39f90] text-[10px] font-bold">Invoice Info</span>
         <span>No : &nbsp;&nbsp; <span className="font-bold">{bill.invoiceNo}</span></span>
         <span>Date : &nbsp;&nbsp; <span className="font-bold">{bill.readableDate}</span></span>
         <span>Terms : &nbsp;&nbsp; <span className="font-bold uppercase">{bill.paymentMode}</span></span>
      </div>
    </div>

    <div className="mb-12">
      <div className="flex text-[10px] uppercase tracking-widest font-sans border-y border-[#1a1a1a] py-3 text-[#5c5c5c] font-bold">
         <div className="flex-1">Description</div>
         <div className="w-16 text-center">Qty</div>
         <div className="w-24 text-right">Rate</div>
         <div className="w-32 text-right">Amount</div>
      </div>
      {bill.items.map((item: any, idx: number) => (
        <div key={idx} className="flex py-6 border-b border-[#e0ddcd] items-center text-sm">
           <div className="flex-1 font-sans italic text-[#1a1a1a] pr-4">{item.name}</div>
           <div className="w-16 text-center font-sans tracking-widest">{item.quantity}</div>
           <div className="w-24 text-right font-sans tracking-widest">₹{item.rate.toFixed(2)}</div>
           <div className="w-32 text-right font-sans tracking-widest font-medium">₹{item.amount.toFixed(2)}</div>
        </div>
      ))}
    </div>

    <div className="flex justify-end mb-16">
       <div className="w-64 flex flex-col gap-3 font-sans text-xs tracking-wider">
         <div className="flex justify-between text-[#808080]"><span>Subtotal</span><span>₹{bill.subTotal.toFixed(2)}</span></div>
         <div className="flex justify-between text-[#808080]"><span>Taxes Included</span><span>₹{(bill.cgst + bill.sgst).toFixed(2)}</span></div>
         {bill.totalDiscount > 0 && <div className="flex justify-between text-[#808080]"><span>Discount</span><span>-₹{bill.totalDiscount.toFixed(2)}</span></div>}
         <div className="flex justify-between border-t border-[#1a1a1a] pt-3 text-base text-[#1a1a1a] items-center mt-1">
           <span className="uppercase tracking-[0.2em] text-[11px] font-bold">Total</span>
           <span>₹{bill.grandTotal.toFixed(2)}</span>
         </div>
       </div>
    </div>

    <div className="absolute bottom-14 left-14 right-14 border-t border-[#e0ddcd] pt-6 flex justify-between items-end">
       <div className="font-sans text-[10px] tracking-widest text-[#5c5c5c]">
         <p className="uppercase font-bold mb-1">Bank Transfer Details</p>
         <p>{settings.bankName} &nbsp;|&nbsp; A/c: {settings.bankAccount} &nbsp;|&nbsp; IFSC: {settings.bankIFSC}</p>
       </div>
       <div className="text-right">
       </div>
       <div className="text-center w-40">
         <div className="border-b border-[#1a1a1a] mb-2"></div>
         <p className="font-sans text-[10px] uppercase tracking-widest text-[#5c5c5c]">Thank You</p>
       </div>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState(1);

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden">
      <header className="bg-slate-900 text-white p-4 shrink-0 flex items-center justify-between shadow-xl z-20">
         <div>
            <h1 className="text-xl font-bold">Invoice Layout Preview</h1>
            <p className="text-xs text-slate-300 mt-1">Select a layout from the tabs below before we generate the real PDF code.</p>
         </div>
      </header>
      
      <div className="bg-zinc-800 shrink-0 border-b border-zinc-700 p-2 overflow-x-auto shadow-md">
         <div className="flex gap-2 w-max mx-auto py-1 px-4">
             <button onClick={() => setActiveTab(1)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 1 ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>1. Traditional Indian</button>
             <button onClick={() => setActiveTab(2)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 2 ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>2. Premium Modern</button>
             <button onClick={() => setActiveTab(3)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 3 ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>3. Vyapar/Marg ERP</button>
             <button onClick={() => setActiveTab(4)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 4 ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>4. Luxury Dark</button>
             <button onClick={() => setActiveTab(5)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 5 ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>5. Retail Wholesale</button>
             <div className="w-px bg-zinc-600 mx-1"></div>
             <button onClick={() => setActiveTab(6)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 6 ? 'bg-rose-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>6. Tally ERP</button>
             <button onClick={() => setActiveTab(7)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 7 ? 'bg-rose-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>7. Detailed GST</button>
             <button onClick={() => setActiveTab(8)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 8 ? 'bg-rose-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>8. Hardware Shop</button>
             <button onClick={() => setActiveTab(9)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 9 ? 'bg-rose-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>9. Medical/Pharmacy</button>
             <button onClick={() => setActiveTab(10)} className={`px-3 py-1.5 text-xs rounded transition-all font-bold whitespace-nowrap ${activeTab === 10 ? 'bg-rose-500 text-white shadow-lg scale-105' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600'}`}>10. Elegant Boutique</button>
         </div>
      </div>
      
      <main className="flex-1 w-full overflow-y-auto p-4 sm:p-8 flex justify-center bg-zinc-200 custom-scrollbar style-container">
         <div style={{ transformOrigin: 'top center', transform: 'scale(0.85)' }} className="mb-24 transition-transform duration-500 ease-out">
           {activeTab === 1 && <Style1 bill={mockBill} settings={mockSettings} />}
           {activeTab === 2 && <Style2 bill={mockBill} settings={mockSettings} />}
           {activeTab === 3 && <Style3 bill={mockBill} settings={mockSettings} />}
           {activeTab === 4 && <Style4 bill={mockBill} settings={mockSettings} />}
           {activeTab === 5 && <Style5 bill={mockBill} settings={mockSettings} />}
           {activeTab === 6 && <Style6 bill={mockBill} settings={mockSettings} />}
           {activeTab === 7 && <Style7 bill={mockBill} settings={mockSettings} />}
           {activeTab === 8 && <Style8 bill={mockBill} settings={mockSettings} />}
           {activeTab === 9 && <Style9 bill={mockBill} settings={mockSettings} />}
           {activeTab === 10 && <Style10 bill={mockBill} settings={mockSettings} />}
         </div>
      </main>
      
      <footer className="bg-white border-t border-slate-200 p-4 shrink-0 text-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
         <p className="text-sm text-slate-800 font-bold mb-1">More styles added!</p>
         <p className="text-xs text-slate-500 max-w-lg mx-auto">Review styles 1-10 and let me know your favorite. Once selected, I'll translate it perfectly into precise <code className="bg-slate-100 text-rose-500 px-1 rounded">jsPDF</code> + <code className="bg-slate-100 text-rose-500 px-1 rounded">jspdf-autotable</code> code to power the actual PDF export.</p>
      </footer>
    </div>
  )
        }
