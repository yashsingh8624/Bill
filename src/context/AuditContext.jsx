import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const AuditContext = createContext();

export const AuditProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('audit-changes')
      .on('postgres_changes', 
        { event: 'INSERT', table: 'audit_logs', schema: 'public' }, 
        (payload) => {
          setLogs(prev => [payload.new, ...prev].slice(0, 200));
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = async (action, entity, entityId, details = {}) => {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          action, // 'DELETE', 'UPDATE', 'CREATE', etc.
          entity_type: entity, // 'BILL', 'PRODUCT', etc.
          entity_id: entityId,
          details
        }]);
      
      if (error) throw error;
    } catch (err) {
       console.error('Error adding audit log:', err.message);
    }
  };

  return (
    <AuditContext.Provider value={{ logs, addLog, loading }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => useContext(AuditContext);
