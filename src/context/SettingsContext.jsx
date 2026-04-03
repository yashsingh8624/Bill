import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';

const SHEET_NAME = 'SETTINGS';

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
  const { spreadsheetId, isReady } = useAuth();
  const { showToast } = useToast();

  const fetchSettings = async () => {
    if (!spreadsheetId) return;
    try {
      setLoading(true);
      const data = await getSheetData(spreadsheetId, SHEET_NAME);
      
      if (data.length > 0) {
        // Convert key-value rows back to object
        const settingsObj = {};
        data.forEach(row => {
          if (row.key) settingsObj[row.key] = row.value || '';
        });
        setUserSettings({ ...defaultSettings, ...settingsObj });
      } else {
        // No settings yet - save defaults
        for (const [key, value] of Object.entries(defaultSettings)) {
          await appendRow(spreadsheetId, SHEET_NAME, objectToRow(SHEET_NAME, { key, value: String(value) }));
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && spreadsheetId) {
      fetchSettings();
    }
  }, [isReady, spreadsheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = async (newSettings) => {
    try {
      const updated = { ...userSettings, ...newSettings };
      setUserSettings(updated); // Optimistic update

      // Update each changed key in the sheet
      for (const [key, value] of Object.entries(newSettings)) {
        const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'key', key);
        if (rowIdx !== -1) {
          await updateRow(spreadsheetId, SHEET_NAME, rowIdx, [key, String(value)]);
        } else {
          await appendRow(spreadsheetId, SHEET_NAME, [key, String(value)]);
        }
      }

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
