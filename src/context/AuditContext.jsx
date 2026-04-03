import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet, generateId } from '../utils/storage';

const STORAGE_KEY = 'smartbill_audit_logs';

const AuditContext = createContext();

export const AuditProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = safeGet(STORAGE_KEY, []);
    setLogs(saved);
    setLoading(false);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (!loading) {
      safeSet(STORAGE_KEY, logs);
    }
  }, [logs, loading]);

  const addLog = (action, entity, entityId, details = {}) => {
    try {
      const newLog = {
        id: generateId(),
        action,
        entity_type: entity,
        entity_id: entityId,
        details,
        created_at: new Date().toISOString()
      };
      setLogs(prev => [newLog, ...prev].slice(0, 200));
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
