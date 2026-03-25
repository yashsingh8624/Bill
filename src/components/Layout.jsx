import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, History, Users, Truck, Menu, Settings, X, FileSpreadsheet, Search, Sun, Plus } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import GlobalSearch from './GlobalSearch';
import QuickActionFAB from './QuickActionFAB';

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { userSettings } = useSettings();

  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/new-bill', label: 'Create Bill', icon: FileText },
    { path: '/bills', label: 'Sale History', icon: History },
    { path: '/products', label: 'Inventory', icon: Package },
    { path: '/customers', label: 'Customers', icon: Users },
    ...(userSettings?.uiMode === 'advanced' ? [
      { path: '/suppliers', label: 'Suppliers', icon: Truck },
      { path: '/reports', label: 'Reports', icon: FileSpreadsheet },
      { path: '/day-closing', label: 'Day Closing', icon: Sun }
    ] : []),
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  // Global Search Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 shadow-sm z-20">
        <div className="h-20 flex items-center px-6 border-b border-slate-100 gap-4">
          {userSettings?.logo ? (
             <img src={userSettings.logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm border border-slate-100 bg-white" />
          ) : (
             <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-600/20">
                <FileText size={20} />
             </div>
          )}
          <div className="overflow-hidden">
            <h1 className="text-lg font-black text-slate-800 leading-tight truncate">{userSettings?.businessName || 'SmartBill Pro'}</h1>
            <p className="text-xs text-slate-500 font-bold tracking-wider uppercase truncate">Business POS</p>
          </div>
        </div>
        
        <div className="px-6 py-4">
           <button 
             onClick={() => setIsSearchOpen(true)}
             className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all border border-slate-200 group"
           >
              <Search size={18} className="group-hover:text-indigo-600 transition-colors" />
              <span className="text-sm font-bold flex-1 text-left">Quick Search...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-300 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400">
                <span className="text-[10px]">Ctrl K</span>
              </kbd>
           </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 hide-scrollbar">
          <ul className="space-y-1.5 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all font-bold group ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={20} className={`${isActive ? 'text-indigo-100' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/50">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm z-30 sticky top-0">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSearchOpen(true)}
               className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
             >
                <Search size={22} />
             </button>
            <h1 className="text-lg font-black text-slate-800 truncate max-w-[150px]">{userSettings?.businessName || 'SmartBill'}</h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors bg-slate-50 border border-slate-200"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Nav Overlay */}
        {mobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[70] top-16 transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Nav Dropdown */}
        <nav className={`lg:hidden fixed w-[85%] max-w-sm h-[calc(100vh-4rem)] top-16 right-0 bg-white border-l border-slate-200 z-[80] shadow-2xl transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <div className="overflow-y-auto h-full py-6">
              <ul className="px-4 space-y-2">
                <li className="mb-4 px-2">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Main Menu</p>
                </li>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={20} className={isActive ? 'text-indigo-100' : 'text-slate-400'} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
           </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full h-full custom-scrollbar pb-20 lg:pb-0">
          <div className="mx-auto max-w-[1400px] w-full p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-40 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
           <Link to="/" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/' ? 'text-indigo-600 bg-indigo-50/50 rounded-xl px-3 py-1 scale-110' : 'text-slate-400'}`}>
              <LayoutDashboard size={20} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
           </Link>
           <Link to="/new-bill" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/new-bill' ? 'text-indigo-600 bg-indigo-50/50 rounded-xl px-3 py-1 scale-110' : 'text-slate-400'}`}>
              <Plus size={20} />
              <span className="text-[9px] font-black uppercase tracking-tighter">New Bill</span>
           </Link>
           <button 
             onClick={() => setIsSearchOpen(true)} 
             className="flex flex-col items-center justify-center -mt-10 bg-indigo-600 text-white w-14 h-14 rounded-2xl shadow-xl shadow-indigo-600/40 border-4 border-slate-50 active:scale-90 transition-transform"
           >
              <Search size={24} strokeWidth={3} />
           </button>
           <Link to="/bills" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/bills' ? 'text-indigo-600 bg-indigo-50/50 rounded-xl px-3 py-1 scale-110' : 'text-slate-400'}`}>
              <History size={20} />
              <span className="text-[9px] font-black uppercase tracking-tighter">History</span>
           </Link>
           <Link to="/settings" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/settings' ? 'text-indigo-600 bg-indigo-50/50 rounded-xl px-3 py-1 scale-110' : 'text-slate-400'}`}>
              <Settings size={20} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Setup</span>
           </Link>
        </div>

        {/* Global Components */}
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
        <QuickActionFAB />
      </div>
    </div>
  );
}
