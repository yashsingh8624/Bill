import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, History, Users, Truck, Menu, Settings, FileSpreadsheet } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userSettings } = useAppContext();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/new-bill', label: 'New Bill', icon: FileText },
    { path: '/bills', label: 'Bill History', icon: History },
    { path: '/products', label: 'Products & Stock', icon: Package },
    { path: '/customers', label: 'Customer Ledger', icon: Users },
    { path: '/suppliers', label: 'Party/Supplier Ledger', icon: Truck },
    { path: '/reports', label: 'Reports & Export', icon: FileSpreadsheet },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 shadow-sm z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
             <FileText size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-indigo-700 leading-tight">SmartBill Pro</h1>
            <p className="text-xs text-slate-500 font-medium">{userSettings.businessName}</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center justify-between px-4 bg-white border-b border-slate-200 shadow-sm z-20">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-md"><FileText size={16} /></span>
            <h1 className="text-lg font-bold text-indigo-700">SmartBill Pro</h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-white border-b border-slate-200 absolute w-full z-30 top-16 shadow-lg animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-4rem)] overflow-y-auto">
             <ul className="py-3 px-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium ${
                        isActive 
                          ? 'bg-indigo-50 text-indigo-700' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/20 z-10 top-16" 
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
