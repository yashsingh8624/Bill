import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider, useAppContext } from './context/AppContext';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import NewBill from './pages/NewBill';
import BillHistory from './pages/BillHistory';
import CustomerLedger from './pages/CustomerLedger';
import SupplierLedger from './pages/SupplierLedger';
import Reports from './pages/Reports';

// Placeholders
const Settings = () => <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100"><h2 className="text-2xl font-bold text-slate-800">Settings</h2></div>;

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
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
