import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
  document.getElementById('root').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;padding:24px">
      <div style="max-width:500px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:40px;text-align:center">
        <h2 style="color:#f59e0b;font-size:24px;font-weight:800;margin-bottom:12px">⚙️ Setup Required</h2>
        <p style="color:rgba(255,255,255,0.7);margin-bottom:20px;line-height:1.6">
          You need to configure your Google OAuth Client ID to use SmartBill Pro.
        </p>
        <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;text-align:left;margin-bottom:20px">
          <p style="color:#818cf8;font-size:13px;margin-bottom:8px;font-weight:600">Steps:</p>
          <ol style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.8;padding-left:20px">
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" style="color:#60a5fa">Google Cloud Console</a></li>
            <li>Create a project → Enable Sheets API & Drive API</li>
            <li>Create OAuth 2.0 Client ID (Web app)</li>
            <li>Add <code style="color:#f472b6">http://localhost:5173</code> to Authorized Origins</li>
            <li>Copy the Client ID</li>
            <li>Paste it in your <code style="color:#f472b6">.env</code> file as:<br/>
              <code style="color:#34d399">VITE_GOOGLE_CLIENT_ID=your-id-here</code></li>
            <li>Restart the dev server</li>
          </ol>
        </div>
        <button onclick="window.location.reload()" style="width:100%;padding:12px;background:#6366f1;color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:15px">
          I've set it up — Reload
        </button>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </GoogleOAuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
