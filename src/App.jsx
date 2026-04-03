import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import NewBill from './pages/NewBill';
import BillHistory from './pages/BillHistory';
import CustomerLedger from './pages/CustomerLedger';
import SupplierLedger from './pages/SupplierLedger';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DayClosing from './pages/DayClosing';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="new-bill" element={<NewBill />} />
        <Route path="bills" element={<BillHistory />} />
        <Route path="customers" element={<CustomerLedger />} />
        <Route path="suppliers" element={<SupplierLedger />} />
        <Route path="reports" element={<Reports />} />
        <Route path="day-closing" element={<DayClosing />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Auth Gate - shows loading/error states, no login page
const AuthGate = () => {
  const { status, error, retry, user } = useAuth();

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

  if (status === 'setting_up') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Setting up your workspace</h2>
          <p className="text-emerald-300/70 text-sm">
            {user ? `Welcome, ${user.name}!` : ''} Creating your data sheets...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 flex flex-col items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/10 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-white/60 text-sm mb-6">{error || 'An unexpected error occurred.'}</p>
          <button
            onClick={retry}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Ready - show the app
  return <AppRoutes />;
};

function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AuthGate />
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
