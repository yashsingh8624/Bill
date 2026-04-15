import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught:', error, errorInfo);
  }
  handleRecover = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white dark:bg-slate-800 transition-colors duration-300 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 transition-colors duration-300 max-w-md w-full">
            <h2 className="text-2xl font-black text-rose-500 mb-2">Something went wrong</h2>
            <p className="text-slate-600 dark:text-slate-400 transition-colors duration-300 mb-6 font-medium">The application encountered an unexpected error.</p>
            <div className="bg-slate-50 dark:bg-slate-900/50 transition-colors duration-300 p-4 rounded-xl text-left border border-slate-100 dark:border-slate-700/50 transition-colors duration-300 mb-6 overflow-auto max-h-40">
               <code className="text-xs text-rose-600 break-all">{this.state.error?.toString()}</code>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={this.handleRecover}
                className="flex-1 py-3 bg-slate-100 text-slate-700 dark:text-slate-300 transition-colors duration-300 font-bold rounded-xl active:scale-95 transition-all hover:bg-slate-200"
              >
                Try Recovery
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                Full Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global error handlers to prevent silent crashes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Global] Unhandled promise rejection:', e.reason);
    e.preventDefault();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
