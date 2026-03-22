import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet } from '../utils/storage';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [userSettings, setUserSettings] = useState(() => {
    return safeGet('smartbill_settings', {
      ownerName: 'SmartBill Owner',
      ownerPhone: '91xxxxxxxxxx',
      businessName: 'SmartBill Pro Store',
      gstNumber: '',
      currency: '₹',
      invoicePrefix: 'INV',
      theme: 'light',
      logo: '',
      uiMode: 'advanced' // 'simple' | 'advanced'
    });
  });

  useEffect(() => {
    safeSet('smartbill_settings', userSettings);
  }, [userSettings]);

  const updateSettings = (settings) => setUserSettings(prev => ({ ...prev, ...settings }));

  return (
    <SettingsContext.Provider value={{ userSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
