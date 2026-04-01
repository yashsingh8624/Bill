import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useToast } from './ToastContext';

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

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'current')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows"
      
      if (data && data.data) {
        setUserSettings({ ...defaultSettings, ...data.data });
      } else {
        // Initialize if empty
        await supabase.from('settings').insert([{ id: 'current', data: defaultSettings }]);
      }
    } catch (err) {
      console.error('Error fetching settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    const channel = supabase
      .channel('settings-changes')
      .on('postgres_changes', 
        { event: 'UPDATE', table: 'settings', schema: 'public', filter: 'id=eq.current' }, 
        (payload) => {
          if (payload.new && payload.new.data) {
            setUserSettings(payload.new.data);
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = async (newSettings) => {
    try {
      const updated = { ...userSettings, ...newSettings };
      setUserSettings(updated); // Optimistic update

      const { error } = await supabase
        .from('settings')
        .update({ data: updated, updated_at: new Date().toISOString() })
        .eq('id', 'current');
      
      if (error) throw error;
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
