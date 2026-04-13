import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowDown, Activity, Clock, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useParties } from '../context/PartiesContext';
import { getCollectionData } from '../utils/firestoreService';

export default function AllTransactions() {
  const navigate = useNavigate();
  const { isReady } = useAuth();
  const { customers = [], suppliers = [] } = useParties() || {};
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const getPartyName = (tx) => {
    // Always use party_name if available
    if (tx.party_name && tx.party_name !== 'Unknown' && tx.party_name !== 'Customer') {
      return tx.party_name;
    }

    // Fallback to fetching from parties data
    const partyId = tx.party_id || tx.customer_id || tx.supplier_id;
    const isCustomer = tx.party_type === 'customer' || tx.type === 'Sale' || tx.type === 'Payment In';

    if (isCustomer) {
      const customer = customers.find(c => c.id === partyId);
      return customer ? customer.name : 'Customer';
    } else {
      const supplier = suppliers.find(s => s.id === partyId);
      return supplier ? supplier.name : 'Supplier';
    }
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!isReady) return;
      setLoading(true);
      try {
        let data = [];

        // Read from Firestore unified ledger collection
        console.log('[AllTransactions] Reading from Firestore unified ledger...');
        const ledgerData = await getCollectionData('ledger/all_transactions');
        // Map ledger entries to transaction format
        data = ledgerData
          .filter(entry => !entry.is_void || entry.is_void === 'FALSE')
          .map(entry => ({
            id: entry.id || entry._docId,
            date: entry.date,
            party_name: entry.party_name || entry.description || '',
            party_id: entry.party_id || '',
            party_type: entry.party_type || '',
            type: mapLedgerType(entry.type),
            amount: entry.amount,
            description: entry.description || ''
          }));
        console.log(`[AllTransactions] Got ${data.length} transactions from unified ledger`);

        const filtered = data.filter(tx => {
          const type = String(tx.type).toLowerCase();
          return type.includes("sale") || type.includes("payment") || type.includes("purchase");
        });
        const sorted = filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
        setTransactions(sorted);
      } catch (err) {
        console.error('Failed to load transactions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [isReady, refreshTrigger]);

  // Map Firestore ledger types to display types
  const mapLedgerType = (type) => {
    const map = {
      'SALE': 'Sale',
      'PAYMENT': 'Payment In',
      'PAYMENT_MADE': 'Payment Out',
      'PURCHASE': 'Purchase',
      'SUPPLIER_OPENING': 'Opening Balance'
    };
    return map[type] || type || 'Unknown';
  };

  return (
    <div className="page-animate max-w-4xl mx-auto pb-10 space-y-6 flex flex-col pt-2 sm:pt-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
             <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
               All Transactions 
               <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Feed</span>
            </h1>
            <p className="text-sm font-bold text-slate-500">Chronological history of Sales and Payments</p>
          </div>
          <button 
            onClick={() => setRefreshTrigger(t => t + 1)}
            disabled={loading}
            className="p-2 sm:px-4 sm:py-2 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors font-bold text-sm shadow-sm border border-slate-200 disabled:opacity-50"
          >
             <Clock size={16} className={loading ? "animate-spin" : ""} />
             <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="card p-0 flex flex-col shadow-sm border-slate-200">
         {loading ? (
           <div className="p-12 flex flex-col items-center justify-center">
             <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <p className="text-sm font-bold text-slate-400">Loading feed...</p>
           </div>
         ) : transactions.length === 0 ? (
           <div className="p-16 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
               <Activity size={32} />
             </div>
             <h3 className="text-base font-black text-slate-700 mb-1">No Transactions Yet</h3>
             <p className="text-sm font-bold text-slate-400">Your sales and payments will appear here.</p>
           </div>
         ) : (
           <div className="flex flex-col divide-y divide-slate-100">
              {transactions.map((txn, idx) => {
               const typeLower = (txn.type || '').toLowerCase();
               const isPaymentIn = typeLower === 'payment in' || typeLower === 'payment_in';
               const isPaymentOut = typeLower === 'payment out' || typeLower === 'payment_out';
               
               let iconColor, bgColor, textColor, Icon, sign, labelColor, displayType;
               
               if (isPaymentIn) {
                 displayType = 'Payment In';
                 iconColor = 'text-emerald-700';
                 bgColor = 'bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-200';
                 textColor = 'text-emerald-600';
                 labelColor = 'bg-emerald-50 text-emerald-600';
                 Icon = <ArrowDown strokeWidth={3} className="pt-1" />;
                 sign = '+';
               } else if (isPaymentOut) {
                 displayType = 'Payment Out';
                 iconColor = 'text-rose-700';
                 bgColor = 'bg-gradient-to-br from-rose-100 to-rose-200 border-rose-200';
                 textColor = 'text-rose-600';
                 labelColor = 'bg-rose-50 text-rose-600';
                 Icon = <ArrowDown strokeWidth={3} className="pt-1 rotate-180" />; 
                 sign = '-';
               } else { // Sale
                 displayType = txn.type || 'Sale';
                 iconColor = 'text-indigo-700';
                 bgColor = 'bg-gradient-to-br from-indigo-100 to-blue-200 border-indigo-200';
                 textColor = 'text-slate-800';
                 labelColor = 'bg-indigo-50 text-indigo-600';
                 Icon = <ShoppingCart strokeWidth={2.5} size={20} />;
                 sign = ''; 
               }

                const partyName = getPartyName(txn);

                return (
                 <div key={txn.id || idx} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-default">
                    
                    {/* Left: Icon & Details */}
                     <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${bgColor} ${iconColor}`}>
                          {Icon}
                       </div>
                       
                       <div className="flex flex-col">
                         <h3 className="font-black text-slate-800 text-base tracking-tight truncate max-w-[160px] sm:max-w-full">
                           {partyName} – <span className="font-bold opacity-90">{displayType}</span>
                         </h3>
                         <div className="flex items-center gap-2 mt-0.5">
                           {txn.invoice_id && (
                             <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                               #{txn.invoice_id}
                             </span>
                           )}
                           <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                             <Clock size={10} />
                             {new Date(txn.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                           </span>
                         </div>
                       </div>
                    </div>

                    {/* Right: Amount */}
                    <div className="text-right flex flex-col justify-center">
                       <div className={`font-black text-lg max-sm:text-base flex items-baseline justify-end gap-0.5 tracking-tight ${textColor}`}>
                         <span className="text-[12px] font-bold opacity-80">{sign}₹</span>
                         {parseFloat(txn.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
