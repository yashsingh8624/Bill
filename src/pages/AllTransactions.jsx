import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDown, Activity, Clock, ShoppingCart, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useParties } from '../context/PartiesContext';
import { useBills } from '../context/BillContext';
import { getSheetData, ensureAllTransactionsSheet } from '../utils/sheetsService';
import { subscribeToCollection } from '../utils/firestoreService';

export default function AllTransactions() {
  const navigate = useNavigate();
  const { spreadsheetId, isReady, useFirebase, firebaseUid } = useAuth();
  const { customers = [], suppliers = [] } = useParties() || {};
  const { ledger = [] } = useBills() || {};
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef(null);

  const getPartyName = (tx) => {
    if (tx.party_name && tx.party_name !== 'Unknown') return tx.party_name;
    
    const partyId = tx.party_id || tx.customer_id || tx.supplier_id || tx.supplierId || tx.customerId;
    const isCustomer = tx.party_type === 'customer' || tx.type === 'SALE' || tx.type === 'Payment In';
    const isSupplier = tx.party_type === 'supplier' || tx.type === 'PURCHASE' || tx.type === 'Payment Out';

    if (partyId) {
      if (isCustomer) {
        const c = customers.find(x => String(x.id) === String(partyId));
        if (c) return c.name || c.businessName;
      }
      if (isSupplier) {
        const s = suppliers.find(x => String(x.id) === String(partyId));
        if (s) return s.name || s.businessName;
      }
      
      // Fallback if type is not strictly defined
      const c = customers.find(x => String(x.id) === String(partyId));
      if (c) return c.name || c.businessName;
      const s = suppliers.find(x => String(x.id) === String(partyId));
      if (s) return s.name || s.businessName;
    }
    
    let nameFromSheet = tx.customer_name || tx.customerName || tx.customer || tx.supplier_name || tx.supplierName;
    if (nameFromSheet && nameFromSheet !== 'Unknown') return nameFromSheet;
    
    return "Unknown";
  };

  // Map Firestore ledger types to display types
  const mapLedgerType = (type) => {
    const map = {
      'SALE': 'Sale',
      'PAYMENT': 'Payment In',
      'PAYMENT_MADE': 'Payment Out',
      'PAYMENT_OUT': 'Payment Out',
      'PURCHASE': 'Purchase',
      'SUPPLIER_OPENING': 'Opening Balance',
      'OPENING': 'Opening Balance'
    };
    return map[type] || type || 'Unknown';
  };

  

  // ===== FIREBASconst processLedgerData = (data) => {
    const mapped = data
      .filter(entry => {
        if (entry.is_void === true || entry.is_void === 'TRUE') return false;
        return true;
      })
      .map(entry => ({
        id: entry.id || entry._docId,
        date: entry.date,
        party_name: entry.party_name || entry.description || '',
        customer_id: entry.customer_id || '',
        supplier_id: entry.supplier_id || '',
        party_id: entry.party_id || entry.customer_id || entry.supplier_id || '',
        party_type: entry.party_type || '',
        type: mapLedgerType(entry.type),
        rawType: entry.type,
        amount: entry.amount,
        invoice_id: entry.invoice_id || '',
        description: entry.description || ''
      }));

    const openingTxns = [];
    if (customers && customers.length > 0) {
      customers.forEach(c => {
        const openingBal = parseFloat(c.openingBalance || c.previous_balance || 0);
        if (openingBal > 0) {
          const hasOpening = mapped.some(tx => String(tx.party_id) === String(c.id) && String(tx.type).toLowerCase().includes('opening'));
          if (!hasOpening) {
             openingTxns.push({
               id: `opening-cust-${c.id}`,
               date: c.created_at || c.createdAt || new Date('2000-01-01').toISOString(),
               party_name: c.name || c.businessName || 'Unknown',
               customer_id: c.id,
               party_id: c.id,
               party_type: 'customer',
               type: 'Opening Balance',
               rawType: 'OPENING',
               amount: openingBal,
               description: 'Opening Balance'
             });
          }
        }
      });
    }

    if (suppliers && suppliers.length > 0) {
      suppliers.forEach(s => {
        const openingBal = parseFloat(s.openingBalance || s.previous_balance || 0);
        if (openingBal > 0) {
          const hasOpening = mapped.some(tx => String(tx.party_id) === String(s.id) && String(tx.type).toLowerCase().includes('opening'));
          if (!hasOpening) {
             openingTxns.push({
               id: `opening-sup-${s.id}`,
               date: s.created_at || s.createdAt || new Date('2000-01-01').toISOString(),
               party_name: s.name || s.businessName || 'Unknown',
               supplier_id: s.id,
               party_id: s.id,
               party_type: 'supplier',
               type: 'Opening Balance',
               rawType: 'SUPPLIER_OPENING',
               amount: openingBal,
               description: 'Opening Balance'
             });
          }
        }
      });
    }

    const combined = [...mapped, ...openingTxns];

    // Filter to only show relevant transaction types
    const filtered = combined.filter(tx => {
      const type = String(tx.type).toLowerCase();
      return type.includes("sale") || type.includes("payment") || type.includes("purchase") || type.includes("opening");
    });

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };E: Use ledger from BillContext (real-time) =====
  useEffect(() => {
    if (!isReady || !useFirebase) return;

    console.log('[AllTransactions] 🔴 Using real-time ledger data from BillContext');
    const processed = processLedgerData(ledger);
    setTransactions(processed);
    setLoading(false);
  }, [isReady, useFirebase, ledger, customers, suppliers]);

  // ===== SHEETS: one-time fetch =====
  useEffect(() => {
    if (!isReady || useFirebase) return;

    const fetchTransactions = async () => {
      if (!spreadsheetId) return;
      setLoading(true);
      try {
        await ensureAllTransactionsSheet(spreadsheetId);
        const data = await getSheetData(spreadsheetId, 'ALL_TRANSACTIONS');
        const processed = processLedgerData(data);
        setTransactions(processed);
      } catch (err) {
        console.error('Failed to load transactions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [isReady, spreadsheetId, useFirebase]);

  const handleRefresh = () => {
    setLoading(true);
    // Re-process ledger data
    setTimeout(() => {
      if (useFirebase) {
        const processed = processLedgerData(ledger);
        setTransactions(processed);
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="page-animate w-full max-w-sm mx-auto md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 sm:px-8 pb-24 sm:pb-10 space-y-6 flex flex-col pt-2 sm:pt-4 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
             <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
               All Transactions 
               <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                 {useFirebase ? 'Live' : 'Feed'}
               </span>
            </h1>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Chronological history of Sales and Payments</p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-all shadow-sm disabled:opacity-50 active:scale-95"
            title="Refresh"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="card p-0 flex flex-col shadow-sm border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
         {loading ? (
           <div className="p-12 flex flex-col items-center justify-center">
             <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <p className="text-sm font-bold text-slate-400">Loading feed...</p>
           </div>
         ) : transactions.length === 0 ? (
           <div className="p-16 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-500">
               <Activity size={32} />
             </div>
             <h3 className="text-base font-black text-slate-700 dark:text-slate-100 mb-1">No Transactions Yet</h3>
             <p className="text-sm font-bold text-slate-400">Your sales and payments will appear here.</p>
           </div>
         ) : (
           <div className="flex flex-col divide-y divide-slate-100">
              {transactions.map((txn, idx) => {
               const typeLower = (txn.type || '').toLowerCase();
               const isPaymentIn = typeLower === 'payment in' || typeLower === 'payment_in';
               const isPaymentOut = typeLower === 'payment out' || typeLower === 'payment_out';
               
               let iconColor, bgColor, textColor, Icon, sign, displayType;
               
               if (isPaymentIn) {
                 displayType = 'Payment In';
                 iconColor = 'text-emerald-700';
                 bgColor = 'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-200';
                 textColor = 'text-emerald-600';
                 Icon = <ArrowDown strokeWidth={3} className="pt-1" />;
                 sign = '+';
               } else if (isPaymentOut) {
                 displayType = 'Payment Out';
                 iconColor = 'text-rose-700';
                 bgColor = 'bg-gradient-to-br from-rose-100 to-rose-200 border-rose-200';
                 textColor = 'text-rose-600';
                 Icon = <ArrowDown strokeWidth={3} className="pt-1 rotate-180" />; 
                 sign = '-';
               } else { // Sale / Purchase / Opening
                 displayType = txn.type || 'Sale';
                 iconColor = 'text-indigo-700';
                 bgColor = 'bg-gradient-to-br from-indigo-100 to-blue-200 border-indigo-200';
                 textColor = 'text-slate-800 dark:text-slate-100';
                 Icon = <ShoppingCart strokeWidth={2.5} size={20} />;
                 sign = ''; 
               }

                const partyName = getPartyName(txn);

                 return (
                 <div key={txn.id || idx} className="p-4 sm:p-5 flex items-center justify-between gap-2 sm:gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-default border-b border-slate-100 dark:border-slate-700/50 last:border-0">
               {/* Left: Icon & Details */}
                     <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 pr-2">
                       <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm border mt-0.5 sm:mt-0 ${bgColor} ${iconColor}`}> 
                            {Icon}
                       </div>
                       
                       <div className="flex flex-col flex-1 min-w-0">
                         <h3 className="font-black text-slate-800 dark:text-slate-100 text-[14px] sm:text-base tracking-tight leading-snug w-full break-words">
                           {partyName}
                         </h3>
                         <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:mt-0.5 min-w-0 w-full text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400">
                           <span className="shrink-0 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">{displayType}</span>
                           <span className="flex items-center gap-1 shrink-0 whitespace-nowrap bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                             <Clock size={10} className="shrink-0" />
                             <span>{new Date(txn.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                           </span>
                           {txn.invoice_id && (
                             <span className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0 break-all max-w-full">
                               #{txn.invoice_id}
                             </span>
                           )}
                         </div>
                       </div>
                    </div>

                   {/* Right: Amount */}
                    <div className="text-right flex flex-col justify-start sm:justify-center shrink-0 pl-2">
                       <div className={`font-black text-[15px] sm:text-lg flex items-baseline justify-end gap-0.5 tracking-tight whitespace-nowrap ${textColor}`}>
                         <span className="text-[11px] sm:text-[12px] font-bold opacity-80 shrink-0 pt-[1px]">{sign}₹</span>
                         <span>{parseFloat(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                       </div>
                    </div>
                 </div>
               );
             })}
           </div>
         )}
      </div>
    </div>
  );
}
