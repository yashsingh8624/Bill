import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';

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

// ============= LOGIN FORM =============
const LoginForm = () => {
  const { login, setAuthMode, feedbackMessage, clearFeedback, authMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill last email
  useEffect(() => {
    const lastEmail = localStorage.getItem('lastEmail');
    if (lastEmail) setEmail(lastEmail);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5 transition-colors duration-300">Email</label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFeedback(); }}
            required
            autoComplete="email"
            placeholder="your@email.com"
            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-medium duration-300"
          />
        </div>
        <div>
          <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5 transition-colors duration-300">Password</label>
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFeedback(); }}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
            className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-medium duration-300"
          />
        </div>

        {/* Feedback message */}
        {feedbackMessage && authMode === 'login' && (
          <div className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20'
              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
          }`}>
            {feedbackMessage.text}
          </div>
        )}

        <button
          type="submit"
          id="login-submit-btn"
          disabled={loading}
          className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all duration-300 active:scale-[0.98] shadow-lg shadow-green-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => { setAuthMode('forgot'); clearFeedback(); }}
            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold transition-colors duration-300 cursor-pointer"
          >
            Forgot Password?
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); clearFeedback(); }}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-semibold transition-colors duration-300"
          >
            Create Account →
          </button>
        </div>
      </form>
    </div>
  );
};

// ============= SIGNUP FORM =============
const SignupForm = () => {
  const { signup, setAuthMode, feedbackMessage, clearFeedback, authMode } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setLoading(true);
    await signup(name, email, password);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5 transition-colors duration-300">Full Name *</label>
        <input
          type="text"
          id="signup-name"
          value={name}
          onChange={(e) => { setName(e.target.value); clearFeedback(); }}
          required
          autoComplete="name"
          placeholder="Your full name"
          className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-medium duration-300"
        />
      </div>
      <div>
        <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5 transition-colors duration-300">Email *</label>
        <input
          type="email"
          id="signup-email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearFeedback(); }}
          required
          autoComplete="email"
          placeholder="your@email.com"
          className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-medium duration-300"
        />
      </div>
      <div>
        <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5 transition-colors duration-300">Password *</label>
        <input
          type="password"
          id="signup-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearFeedback(); }}
          required
          autoComplete="new-password"
          placeholder="Min 6 characters"
          minLength={6}
          className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-medium duration-300"
        />
      </div>

      {/* Feedback message */}
      {feedbackMessage && authMode === 'signup' && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${
          feedbackMessage.type === 'error'
            ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20'
            : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
        }`}>
          {feedbackMessage.text}
        </div>
      )}

      <button
        type="submit"
        id="signup-submit-btn"
        disabled={loading}
        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all duration-300 active:scale-[0.98] shadow-lg shadow-green-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Creating Account...
          </span>
        ) : 'Create Account'}
      </button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => { setAuthMode('login'); clearFeedback(); }}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-sm font-semibold transition-colors duration-300"
        >
          ← Already have an account? Sign In
        </button>
      </div>
    </form>
  );
};

// ============= FORGOT PASSWORD MODAL =============
const ForgotPasswordModal = () => {
  const { forgotPassword, setAuthMode, feedbackMessage, clearFeedback, authMode } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill last email
  useEffect(() => {
    const lastEmail = localStorage.getItem('lastEmail');
    if (lastEmail) setEmail(lastEmail);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await forgotPassword(email);
    setLoading(false);
  };

  if (authMode !== 'forgot') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-700 transition-colors">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center mb-2">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors duration-300">
              <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1 transition-colors duration-300">Reset Password</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">Enter your email and we'll send a reset link.</p>
          </div>

          <div>
            <label className="text-gray-700 dark:text-gray-300 block text-sm font-bold mb-1.5 transition-colors duration-300">Email Address</label>
            <input
              type="email"
              id="forgot-email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFeedback(); }}
              required
              autoComplete="email"
              placeholder="your@email.com"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-800 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all font-medium duration-300"
            />
          </div>

          {/* Feedback message */}
          {feedbackMessage && authMode === 'forgot' && (
            <div className={`px-4 py-3 rounded-xl text-sm font-semibold transition-colors duration-300 ${
              feedbackMessage.type === 'error'
                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20'
                : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
            }`}>
              {feedbackMessage.text}
            </div>
          )}

          <button
            type="submit"
            id="forgot-submit-btn"
            disabled={loading}
            className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all duration-300 active:scale-[0.98] shadow-lg shadow-green-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Sending...
              </span>
            ) : 'Send Reset Link'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); clearFeedback(); }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-sm font-semibold transition-colors duration-300 p-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============= AUTH GATE =============
const AuthGate = () => {
  const { status, authMode } = useAuth();

  if (status === 'initializing' || status === 'authenticating') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 transition-colors duration-300">SmartBill Pro</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">
            {status === 'initializing' ? 'Starting up...' : 'Singing you in...'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'login_required') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo + Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 dark:border-green-400/10 transition-colors duration-300">
              <svg className="w-10 h-10 text-green-600 dark:text-green-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-1 transition-colors duration-300">SmartBill Pro</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">
              {authMode === 'login' && 'Sign in to your account'}
              {authMode === 'signup' && 'Create a new account'}
              {authMode === 'forgot' && 'Reset your password'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 p-6 shadow-lg transition-colors duration-300">
            {authMode === 'login' && <LoginForm />}
            {authMode === 'signup' && <SignupForm />}
            {/* Modal over everything */}
            <ForgotPasswordModal />
          </div>

          <p className="text-gray-400 dark:text-gray-500 text-xs text-center mt-6 transition-colors duration-300">
            Secure authentication powered by Firebase
          </p>
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
