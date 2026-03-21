import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // Settings & Auth
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem('smartbill_settings');
    return saved ? JSON.parse(saved) : {
      ownerName: 'SmartBill Owner',
      ownerPhone: '91xxxxxxxxxx',
      businessName: 'SmartBill Pro Store'
    };
  });

  // Entities
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('smartbill_products');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [bills, setBills] = useState(() => {
    const saved = localStorage.getItem('smartbill_bills');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('smartbill_customers');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [suppliers, setSuppliers] = useState(() => {
    const saved = localStorage.getItem('smartbill_suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist State
  useEffect(() => localStorage.setItem('smartbill_settings', JSON.stringify(userSettings)), [userSettings]);
  useEffect(() => localStorage.setItem('smartbill_products', JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem('smartbill_bills', JSON.stringify(bills)), [bills]);
  useEffect(() => localStorage.setItem('smartbill_customers', JSON.stringify(customers)), [customers]);
  useEffect(() => localStorage.setItem('smartbill_suppliers', JSON.stringify(suppliers)), [suppliers]);

  // Generators
  const generateBillNumber = () => {
    return `INV-${new Date().getFullYear()}-${String(bills.length + 1).padStart(4, '0')}`;
  };

  // Actions
  const updateSettings = (settings) => setUserSettings({ ...userSettings, ...settings });

  // Customer Actions
  const addCustomer = (customer) => setCustomers([...customers, { ...customer, id: Date.now().toString(), balance: 0 }]);
  const updateCustomer = (id, data) => setCustomers(customers.map(c => c.id === id ? { ...c, ...data } : c));
  const addCustomerPayment = (customerId, amount, date, note) => {
     setCustomers(customers.map(c => {
       if(c.id === customerId) {
         const oldBalance = c.balance || 0;
         return {
           ...c, 
           balance: oldBalance - parseFloat(amount),
           payments: [...(c.payments || []), { id: Date.now().toString(), amount: parseFloat(amount), date, note, type: 'PAYMENT_RECEIVED' }]
         };
       }
       return c;
     }));
  };

  // Supplier Actions
  const addSupplier = (supplier) => setSuppliers([...suppliers, { ...supplier, id: Date.now().toString(), balance: 0 }]);
  const updateSupplier = (id, data) => setSuppliers(suppliers.map(s => s.id === id ? { ...s, ...data } : s));
  
  const addSupplierInvoice = (supplierId, amount, date, note, invoiceNo) => {
     setSuppliers(suppliers.map(s => {
       if(s.id === supplierId) {
         const oldBalance = s.balance || 0;
         return {
           ...s, 
           balance: oldBalance + parseFloat(amount),
           invoices: [...(s.invoices || []), { id: Date.now().toString(), amount: parseFloat(amount), date, note, invoiceNo, type: 'INVOICE_RECEIVED' }]
         };
       }
       return s;
     }));
  };

  const addSupplierPayment = (supplierId, amount, date, note) => {
     setSuppliers(suppliers.map(s => {
       if(s.id === supplierId) {
         const oldBalance = s.balance || 0;
         return {
           ...s, 
           balance: oldBalance - parseFloat(amount),
           payments: [...(s.payments || []), { id: Date.now().toString(), amount: parseFloat(amount), date, note, type: 'PAYMENT_MADE' }]
         };
       }
       return s;
     }));
  };

  // Product Actions
  const addProduct = (product) => setProducts([...products, { ...product, id: Date.now().toString() }]);
  const updateProduct = (id, data) => setProducts(products.map(p => p.id === id ? { ...p, ...data } : p));
  const deleteProduct = (id) => setProducts(products.filter(p => p.id !== id));
  const addStock = (id, qtyChange, note) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          quantity: p.quantity + parseInt(qtyChange, 10),
          stockHistory: [...(p.stockHistory || []), { date: new Date().toISOString(), change: parseInt(qtyChange, 10), note }]
        };
      }
      return p;
    }));
  };

  // Bill Actions
  const addBill = (bill) => {
    const newBill = { ...bill, id: Date.now().toString() };
    setBills([newBill, ...bills]);
    
    // Deduct stock
    setProducts(prevProducts => prevProducts.map(p => {
      const itemInBill = bill.items?.find(i => i.productId === p.id);
      if (itemInBill) {
        return { ...p, quantity: Math.max(0, p.quantity - itemInBill.quantity) };
      }
      return p;
    }));

    // Add to customer balance if any outstanding
    if (bill.customerId && bill.outstanding > 0) {
      setCustomers(cust => cust.map(c => {
         if(c.id === bill.customerId) {
           return { ...c, balance: (c.balance || 0) + bill.outstanding };
         }
         return c;
      }));
    }
    return newBill;
  };

  return (
    <AppContext.Provider value={{
      userSettings, updateSettings,
      products, addProduct, updateProduct, deleteProduct, addStock,
      bills, addBill, generateBillNumber,
      customers, addCustomer, updateCustomer, addCustomerPayment,
      suppliers, addSupplier, updateSupplier, addSupplierInvoice, addSupplierPayment
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
