import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { safeGet, safeSet } from '../utils/storage';

const STORAGE_KEY = 'smartbill_settings';

const SettingsContext = createContext();

const defaultSettings = {
  ownerName: 'SmartBill Owner',
  ownerPhone: '91xxxxxxxxxx',
  businessName: 'SmartBill Pro Store',
  businessAddress: '',
  gstNumber: '',
  currency: '₹',
  invoicePrefix: 'INV',
  theme: 'light',
  logo: '',
  uiMode: 'advanced',
  bankName: '',
  bankAccount: '',
  bankIFSC: '',
  termsAndConditions: 'Goods once sold will not be taken back. Subject to local jurisdiction.'
};

export const SettingsProvider = ({ children }) => {
  const [userSettings, setUserSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const saved = safeGet(STORAGE_KEY, null);
    if (saved) {
      setUserSettings({ ...defaultSettings, ...saved });
    } else {
      safeSet(STORAGE_KEY, defaultSettings);
    }
    setLoading(false);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!loading) {
      safeSet(STORAGE_KEY, userSettings);
    }
  }, [userSettings, loading]);

  const updateSettings = (newSettings) => {
    try {
      const updated = { ...userSettings, ...newSettings };
      setUserSettings(updated);
      showToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error('Error updating settings:', err.message);
      showToast('Failed to save settings', 'error');
    }
  };

  return (
    <SettingsContext.Provider value={{ userSettings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
