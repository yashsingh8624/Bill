import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSheetData, appendRow, objectToRow, findRowIndex, updateRow } from '../utils/sheetsService';
import { getDocument, setDocument } from '../utils/firestoreService';

const SHEET_NAME = 'SETTINGS';
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
  const { spreadsheetId, isReady, useFirebase } = useAuth();
  const { showToast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      if (useFirebase) {
        const doc = await getDocument('settings', FIRESTORE_DOC);
        if (doc) {
          setUserSettings({ ...defaultSettings, ...doc });
        } else {
          await setDocument('settings', FIRESTORE_DOC, defaultSettings);
        }
      } else {
        if (!spreadsheetId) return;
        const data = await getSheetData(spreadsheetId, SHEET_NAME);
        if (data.length > 0) {
          const settingsObj = {};
          data.forEach(row => { if (row.key) settingsObj[row.key] = row.value || ''; });
          setUserSettings({ ...defaultSettings, ...settingsObj });
        } else {
          for (const [key, value] of Object.entries(defaultSettings)) {
            await appendRow(spreadsheetId, SHEET_NAME, objectToRow(SHEET_NAME, { key, value: String(value) }));
          }
        }
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
  }, [isReady, spreadsheetId, useFirebase]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = async (newSettings) => {
    try {
      const updated = { ...userSettings, ...newSettings };
      setUserSettings(updated);

      if (useFirebase) {
        await setDocument('settings', FIRESTORE_DOC, updated);
      } else {
        for (const [key, value] of Object.entries(newSettings)) {
          const rowIdx = await findRowIndex(spreadsheetId, SHEET_NAME, 'key', key);
          if (rowIdx !== -1) {
            await updateRow(spreadsheetId, SHEET_NAME, rowIdx, [key, String(value)]);
          } else {
            await appendRow(spreadsheetId, SHEET_NAME, [key, String(value)]);
          }
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
