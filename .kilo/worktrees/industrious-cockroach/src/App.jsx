import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { useEffect } from 'react';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import NewBill from './pages/NewBill';
import BillHistory from './pages/BillHistory';
import Parties from './pages/Parties';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DayClosing from './pages/DayClosing';
import Expenses from './pages/Expenses';
import PaymentIn from './pages/PaymentIn';
import AllTransactions from './pages/AllTransactions';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import AddParty from './pages/AddParty';
import AddItem from './pages/AddItem';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="new-bill" element={<NewBill />} />
        <Route path="bills" element={<BillHistory />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="parties" element={<Navigate to="/customers" replace />} />
        <Route path="reports" element={<Reports />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="payment-in" element={<PaymentIn />} />
        <Route path="all-transactions" element={<AllTransactions />} />
        <Route path="add-party" element={<AddParty />} />
        <Route path="add-item" element={<AddItem />} />
        <Route path="day-closing" element={<DayClosing />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Auth Gate - shows loading/login/error states
const AuthGate = () => {
  const { status, error, retry, login, enterOfflineMode, user } = useAuth();

  if (status === 'initializing' || status === 'authenticating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">SmartBill Pro</h2>
          <p className="text-indigo-300/70 text-sm">
            {status === 'initializing' ? 'Starting up...' : 'Signing in with Google...'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'login_required') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-white/10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">SmartBill Pro</h2>
          <p className="text-white/50 text-sm mb-8">
            Sign in with your Google account to sync data with Firebase Firestore.
          </p>
          <button
            onClick={login}
            id="google-sign-in-btn"
            className="w-full py-3.5 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg mb-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          <button
            onClick={enterOfflineMode}
            id="offline-mode-btn"
            className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all active:scale-95 border border-white/10"
          >
            📱 Continue Offline (Local Storage)
          </button>
          <p className="text-white/30 text-xs mt-6">
            Offline mode saves data to your browser. No cloud sync.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'setting_up') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Setting up your workspace</h2>
          <p className="text-emerald-300/70 text-sm">
            {user ? `Welcome, ${user.name}!` : ''} Setting up your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 max-w-lg w-full text-center">
          <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Google Login Failed</h2>
          <p className="text-white/60 text-sm mb-4">{error || 'An unexpected error occurred.'}</p>
          
          {/* Google Console Fix Steps */}
          <div className="bg-black/30 rounded-xl p-4 text-left mb-5 border border-white/5">
            <p className="text-amber-400 text-xs font-bold mb-2">🔧 To fix Google login:</p>
            <ol className="text-white/50 text-xs space-y-1.5 list-decimal pl-4">
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" className="text-blue-400 underline">Google Cloud Console → Credentials</a></li>
              <li>Click your <strong className="text-white/70">OAuth 2.0 Client ID</strong></li>
              <li>Add <code className="text-pink-400 bg-black/30 px-1 rounded">http://localhost:5173</code> to <strong className="text-white/70">Authorized JavaScript Origins</strong></li>
              <li>Go to <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener" className="text-blue-400 underline">OAuth Consent Screen</a></li>
              <li>Add your email as a <strong className="text-white/70">Test User</strong></li>
              <li>Ensure your Firebase project is properly configured</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <button
              onClick={retry}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              Try Again
            </button>
            <button
              onClick={enterOfflineMode}
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all active:scale-95 border border-white/10"
            >
              Continue Offline
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ready - show the app
  return <AppRoutes />;
};

const SyncStatusListener = () => {
  const { showToast } = useToast();

  useEffect(() => {
    const handleSyncError = (e) => {
      showToast(e.detail?.message || 'Sync retrying...', 'warning');
    };
    const handleSyncSuccess = (e) => {
      // Silent success — only log, don't toast on every sync
      if (e.detail?.queueRemaining === 0) {
        console.log('[Sync] All items synced successfully');
      }
    };
    window.addEventListener('sync-error', handleSyncError);
    window.addEventListener('sync-success', handleSyncSuccess);
    return () => {
      window.removeEventListener('sync-error', handleSyncError);
      window.removeEventListener('sync-success', handleSyncSuccess);
    };
  }, [showToast]);

  return null;
};

function App() {
  return (
    <ToastProvider>
      <SyncStatusListener />
      <AppProvider>
        <AuthGate />
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
