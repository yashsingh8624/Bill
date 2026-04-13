import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getDocument, setDocument } from '../utils/firestoreService';

const FIRESTORE_DOC = 'config';

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
  const { isReady } = useAuth();
  const { showToast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const doc = await getDocument('settings', FIRESTORE_DOC);
      if (doc) {
        setUserSettings({ ...defaultSettings, ...doc });
      } else {
        await setDocument('settings', FIRESTORE_DOC, defaultSettings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // KEY FIX: Always wait for isReady
  useEffect(() => {
    if (!isReady) return;
    fetchSettings();
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = async (newSettings) => {
    try {
      const updated = { ...userSettings, ...newSettings };
      setUserSettings(updated);

      await setDocument('settings', FIRESTORE_DOC, updated);

      showToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error('Error updating settings:', err);
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
