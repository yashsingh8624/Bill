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
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full">
            <h2 className="text-2xl font-black text-rose-500 mb-2">Something went wrong</h2>
            <p className="text-slate-600 mb-6 font-medium">The application encountered an unexpected error. Try refreshing the page.</p>
            <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-100 mb-6 overflow-auto max-h-40">
               <code className="text-xs text-rose-600 break-all">{this.state.error?.toString()}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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
