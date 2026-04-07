import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { appendRow, getRows } from '../utils/sheetsService';
import { ensureBillingSheet } from '../utils/setupService';

// ─── Icons (inline SVG — no extra dep needed) ───────────────────────────────

const IconUser = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconPhone = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const IconMapPin = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconCurrency = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconLogout = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconAlert = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);
const IconSheet = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconSpinner = () => (
  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Sync Status Pill ────────────────────────────────────────────────────────

const SyncPill = ({ status, isOffline }) => {
  if (isOffline) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Offline
      </span>
    );
  }
  if (status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
        <span className="w-2 h-2 rounded-full bg-indigo-500 sync-pulse" />
        Syncing
      </span>
    );
  }
  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Saved
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        Sync Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <span className="w-2 h-2 rounded-full bg-slate-400" />
      Connected
    </span>
  );
};

// ─── Feedback Banner ─────────────────────────────────────────────────────────

const FeedbackBanner = ({ feedback }) => {
  if (!feedback) return null;
  const isSuccess = feedback.type === 'success';
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-semibold card-animate ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isSuccess ? <IconCheck /> : <IconAlert />}
      </span>
      {feedback.message}
    </div>
  );
};

// ─── Form Field ──────────────────────────────────────────────────────────────

const FormField = ({ label, name, type = 'text', value, onChange, placeholder, icon, inputMode, required, autoFocus }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={name} className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
      {label}
      {required && <span className="text-rose-400 text-xs">*</span>}
    </label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {icon}
      </span>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-medium text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
      />
    </div>
  </div>
);

// ─── Recent Entries Table ────────────────────────────────────────────────────

const RecentEntries = ({ entries, loading }) => {
  const totalAmount = entries.reduce((sum, row) => {
    const amt = parseFloat(row[3]) || 0;
    return sum + amt;
  }, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-indigo-600"><IconSheet /></span>
          <h2 className="text-base font-black text-slate-800">Recent Entries</h2>
        </div>
        {entries.length > 0 && (
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {entries.length} shown
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <IconSpinner />
            <p className="text-sm font-semibold">Loading entries...</p>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <IconSheet />
            </div>
            <p className="text-sm font-bold text-slate-500">No entries yet</p>
            <p className="text-xs text-slate-400 mt-1">Submit the form to see entries here</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm min-w-[360px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs font-black text-slate-500 uppercase tracking-wider px-4 py-3">Phone</th>
                <th className="text-right text-xs font-black text-slate-500 uppercase tracking-wider px-4 py-3">Amount</th>
                <th className="text-right text-xs font-black text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800 max-w-[120px] truncate">{row[0] || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{row[1] || '—'}</td>
                  <td className="px-4 py-3 text-right font-black text-indigo-700">
                    {row[3] ? `₹${Number(row[3]).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs hidden sm:table-cell">
                    {row[4] ? row[4].split(',')[0] : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length > 0 && (
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Total (shown)</span>
          <span className="text-base font-black text-indigo-700">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', phone: '', address: '', amount: '' };

export default function CustomerEntry() {
  const { user, spreadsheetId, logout, isOffline } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle');

  // Ensure the BILLING_ENTRIES tab exists once spreadsheetId is ready
  useEffect(() => {
    if (spreadsheetId && spreadsheetId !== 'LOCAL_MODE') {
      ensureBillingSheet(spreadsheetId);
    }
  }, [spreadsheetId]);

  // Load recent entries (last 10, newest first)
  const loadEntries = useCallback(async () => {
    if (!spreadsheetId) return;
    setLoadingEntries(true);
    try {
      const { rows } = await getRows(spreadsheetId, 'BILLING_ENTRIES');
      setRecentEntries(rows.slice(-10).reverse());
    } catch (err) {
      console.warn('[CustomerEntry] Could not load entries:', err);
    } finally {
      setLoadingEntries(false);
    }
  }, [spreadsheetId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Listen for background sync events
  useEffect(() => {
    const onSyncSuccess = () => {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    };
    const onSyncError = (e) => {
      setSyncStatus('error');
      setFeedback({ type: 'error', message: e.detail?.message || 'Sync failed. Data is saved locally and will retry.' });
    };
    window.addEventListener('sync-success', onSyncSuccess);
    window.addEventListener('sync-error', onSyncError);
    return () => {
      window.removeEventListener('sync-success', onSyncSuccess);
      window.removeEventListener('sync-error', onSyncError);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error feedback on edit
    if (feedback?.type === 'error') setFeedback(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.name.trim()) {
      setFeedback({ type: 'error', message: 'Customer name is required.' });
      return;
    }
    if (!form.phone.trim()) {
      setFeedback({ type: 'error', message: 'Phone number is required.' });
      return;
    }
    if (!form.amount.trim()) {
      setFeedback({ type: 'error', message: 'Amount is required.' });
      return;
    }
    if (isNaN(Number(form.amount)) || Number(form.amount) < 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid amount (e.g. 1500).' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setSyncStatus('syncing');

    try {
      const now = new Date();
      const date = now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      await appendRow(spreadsheetId, 'BILLING_ENTRIES', [
        form.name.trim(),
        form.phone.trim(),
        form.address.trim(),
        form.amount.trim(),
        date,
      ]);

      setFeedback({
        type: 'success',
        message: `Entry saved for ${form.name.trim()}! Amount: ₹${Number(form.amount).toLocaleString('en-IN')}`,
      });
      setForm(EMPTY_FORM);

      // Reload entries list
      await loadEntries();

      // Auto-clear success feedback
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      let msg = 'Failed to save entry. Please try again.';
      if (err.message === 'AUTH_EXPIRED') {
        msg = 'Your session has expired. Please sign out and sign in again.';
      } else if (err?.status === 403 || err?.result?.error?.code === 403) {
        msg = 'Permission denied. Make sure Google Sheets API access is granted.';
      } else if (err?.status === 401 || err?.result?.error?.code === 401) {
        msg = 'Authentication failure. Please sign out and sign in again.';
      } else if (err?.status === 429 || err?.result?.error?.code === 429) {
        msg = 'Too many requests. Please wait a few seconds and try again.';
      }
      setFeedback({ type: 'error', message: msg });
      setSyncStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const sheetUrl = spreadsheetId && spreadsheetId !== 'LOCAL_MODE'
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-600/20 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 leading-tight">BillBook</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Wholesale Billing</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncPill status={syncStatus} isOffline={isOffline} />

            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all border border-indigo-100"
              >
                <IconSheet />
                Open Sheet
              </a>
            )}

            {user && (
              <div className="flex items-center gap-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border-2 border-slate-200 shrink-0"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                    {user.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden md:block text-sm font-bold text-slate-700 max-w-[140px] truncate">
                  {user.name}
                </span>
              </div>
            )}

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3 py-2 rounded-lg transition-all border border-slate-200 hover:border-rose-200"
            >
              <IconLogout />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Entry Form Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden card-animate">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-700">
            <h2 className="text-lg font-black text-white">New Customer Entry</h2>
            <p className="text-indigo-200 text-sm font-medium mt-0.5">
              Fill in the details and tap Save
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="px-6 py-6 flex flex-col gap-5">

            <FormField
              label="Customer Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Ravi Sharma"
              icon={<IconUser />}
              required
              autoFocus
            />

            <FormField
              label="Phone Number"
              name="phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              icon={<IconPhone />}
              required
            />

            <FormField
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="e.g. Shop 12, Cloth Market, Surat"
              icon={<IconMapPin />}
            />

            <FormField
              label="Amount (₹)"
              name="amount"
              type="text"
              inputMode="decimal"
              value={form.amount}
              onChange={handleChange}
              placeholder="e.g. 15000"
              icon={<IconCurrency />}
              required
            />

            {/* Feedback banner */}
            <FeedbackBanner feedback={feedback} />

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black text-base rounded-xl shadow-md shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              {submitting ? (
                <>
                  <IconSpinner />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save to Google Sheets
                </>
              )}
            </button>

            {isOffline && (
              <p className="text-center text-xs text-amber-600 font-semibold -mt-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                Offline mode: data is saved locally and will sync when online.
              </p>
            )}
          </form>
        </div>

        {/* ── Recent Entries Card ── */}
        <div className="lg:sticky lg:top-[88px]" style={{ minHeight: 400 }}>
          <RecentEntries entries={recentEntries} loading={loadingEntries} />
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-4 text-xs text-slate-400 font-medium border-t border-slate-200 bg-white mt-auto">
        {sheetUrl ? (
          <span>
            Syncing to{' '}
            <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 font-bold">
              Google Sheet
            </a>
          </span>
        ) : (
          <span>Local mode — data stored in browser</span>
        )}
      </footer>
    </div>
  );
}
