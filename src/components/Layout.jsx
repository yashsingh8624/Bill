import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, History, Users, Truck, Menu, Settings, X, FileSpreadsheet, Search, Sun, Moon, Plus, Activity, Banknote, LogOut } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GlobalSearch from './GlobalSearch';
import QuickActionFAB from './QuickActionFAB';

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { userSettings } = useSettings();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/new-bill', label: 'Create Bill', icon: FileText },
    { path: '/bills', label: 'Sale History', icon: History },
    { path: '/payment-in', label: 'Payment In', icon: Banknote },
    ...(userSettings?.uiMode === 'advanced' ? [
      { path: '/all-transactions', label: 'All Transactions', icon: Activity },
      { path: '/customers', label: 'Customers', icon: Users },
      { path: '/products', label: 'Inventory', icon: Package },
      { path: '/suppliers', label: 'Suppliers', icon: Truck },
      { path: '/day-closing', label: 'Day Closing', icon: Sun },
      { path: '/expenses', label: 'Expenses', icon: FileSpreadsheet },
      { path: '/reports', label: 'Reports', icon: FileSpreadsheet },
    ] : [
      { path: '/customers', label: 'Customers', icon: Users },
    ]),
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans w-full max-w-full transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 backdrop-blur-xl border-r border-slate-200 dark:border-slate-600 shadow-sm z-20 h-screen sticky top-0 transition-colors duration-300">
        <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-700 gap-4 transition-colors duration-300">
          {userSettings?.logo ? (
             <img src={userSettings.logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm border border-slate-100 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-300" />
          ) : (
             <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md shadow-indigo-600/20">
                <FileText size={20} />
             </div>
          )}
          <div className="overflow-hidden">
            <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-tight truncate transition-colors duration-300">{userSettings?.businessName || 'SmartBill Pro'}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase truncate transition-colors duration-300">Business POS</p>
          </div>
        </div>
        
        <div className="px-6 py-4 flex gap-2">
           <button 
             onClick={() => setIsSearchOpen(true)}
             className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-slate-600 group"
           >
              <Search size={18} className="group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
              <span className="text-sm font-bold flex-1 text-left">Search...</span>
              <kbd className="hidden xl:inline-flex h-5 items-center gap-1 rounded border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 dark:text-slate-300">
                <span className="text-[10px]">Ctrl K</span>
              </kbd>
           </button>
           <button 
             onClick={toggleTheme}
             className="flex items-center justify-center p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 rounded-xl transition-all border border-slate-200 dark:border-slate-600"
             title="Toggle theme"
           >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
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
                        ? 'bg-green-600 text-white shadow-md shadow-green-600/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:text-white transition-colors duration-300 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={20} className={`${isActive ? 'text-green-100' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500 transition-colors duration-300 group-hover:text-green-600 dark:group-hover:text-green-400'} transition-colors`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info - Desktop */}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-700/50 transition-colors duration-300 dark:border-slate-800 mt-auto transition-colors duration-300">
          {user && (
            <div className="flex items-center gap-3 mb-1 px-2">
              {user.picture ? (
                <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs">{(user.name || 'U')[0]}</div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate transition-colors duration-300">{user.name || 'User'}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate transition-colors duration-300">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-slate-50 dark:bg-slate-900 min-w-0 w-full transition-colors duration-300">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center justify-between px-4 bg-white dark:bg-slate-800 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 shadow-sm z-30 sticky top-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSearchOpen(true)}
               className="p-2 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
             >
                <Search size={22} />
             </button>
            <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 truncate max-w-full max-w-sm transition-colors duration-300">{userSettings?.businessName || 'SmartBill Pro'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
               onClick={toggleTheme}
               className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
             >
               {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
             </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Mobile Nav Overlay */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] top-16 transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Nav Dropdown */}
        <nav className={`md:hidden fixed w-[85%] max-w-sm h-[calc(100vh-4rem)] top-16 right-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 z-[80] shadow-2xl transition-all duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
                            ? 'bg-green-600 text-white shadow-md shadow-green-600/20' 
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-300'
                        }`}
                      >
                        <Icon size={20} className={isActive ? 'text-green-100' : 'text-slate-400'} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              
              {/* User Info - Mobile */}
              {user && (
                <div className="px-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 transition-colors duration-300 dark:border-slate-800">
                  <div className="flex items-center gap-3 px-2">
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs">{(user.name || 'U')[0]}</div>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.name || 'User'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
           </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto w-full custom-scrollbar pb-20 md:pb-0 relative text-slate-900 dark:text-slate-100 transition-colors duration-300">
          <div className="mx-auto max-w-full w-full pt-4 pb-6 relative z-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around z-40 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] transition-colors duration-300">
           <Link to="/" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/' ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/30 rounded-xl px-3 py-1 scale-110' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500 transition-colors duration-300 hover:text-slate-500 dark:text-slate-500 transition-colors duration-300'}`}>
              <LayoutDashboard size={20} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
           </Link>
           <Link to="/customers" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/customers' ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/30 rounded-xl px-3 py-1 scale-110' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500 transition-colors duration-300 hover:text-slate-500 dark:text-slate-500 transition-colors duration-300'}`}>
               <Users size={20} />
               <span className="text-[9px] font-black uppercase tracking-tighter">Parties</span>
            </Link>
           <QuickActionFAB />
           <Link to="/bills" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/bills' ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/30 rounded-xl px-3 py-1 scale-110' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500 transition-colors duration-300 hover:text-slate-500 dark:text-slate-500 transition-colors duration-300'}`}>
              <History size={20} />
              <span className="text-[9px] font-black uppercase tracking-tighter">History</span>
           </Link>
           <Link to="/settings" className={`flex flex-col items-center gap-1 transition-all ${location.pathname === '/settings' ? 'text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/30 rounded-xl px-3 py-1 scale-110' : 'text-slate-400 dark:text-slate-500 dark:text-slate-500 transition-colors duration-300 hover:text-slate-500 dark:text-slate-500 transition-colors duration-300'}`}>
              <Settings size={20} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Setup</span>
           </Link>
        </div>

        {/* Global Components */}
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </div>
    </div>
  );
}
