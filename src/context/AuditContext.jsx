import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeGet, safeSet } from '../utils/storage';

const AuditContext = createContext();

export const AuditProvider = ({ children }) => {
  const [logs, setLogs] = useState(() => safeGet('smartbill_audit_logs', []));

  useEffect(() => {
    safeSet('smartbill_audit_logs', logs);
  }, [logs]);

  const addLog = (action, entity, entityId, details = {}) => {
    const newLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      action, // 'DELETE', 'UPDATE', 'CREATE', 'BACKUP_RESTORE', 'SETTINGS_CHANGE'
      entity, // 'BILL', 'PRODUCT', 'CUSTOMER', 'SUPPLIER', 'SETTINGS'
      entityId,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 200)); // Keep last 200 logs
  };

  return (
    <AuditContext.Provider value={{ logs, addLog }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => useContext(AuditContext);
