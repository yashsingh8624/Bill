import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { AppProvider } from './context/AppContext';

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

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
