export const safeGet = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage`, error);
    return defaultValue;
  }
};

export const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage`, error);
  }
};

export const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage`, error);
  }
};

export const generateId = () => Math.random().toString(36).substring(2, 10).toUpperCase();

export const generateReadableId = (prefix, existingArray) => {
  if (!existingArray || existingArray.length === 0) return `${prefix}-001`;
  
  let maxNum = 0;
  for (const item of existingArray) {
    if (item.id && typeof item.id === 'string' && item.id.startsWith(`${prefix}-`)) {
      const numStr = item.id.split('-')[1];
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  
  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
};

export const exportBackup = () => {
  const data = {
    version: "2.0.0",
    backupDate: new Date().toISOString(),
    settings: safeGet('smartbill_settings', {}),
    products: safeGet('smartbill_local_PRODUCTS', []),
    bills: safeGet('smartbill_local_BILLS', []),
    customers: safeGet('smartbill_local_CUSTOMERS', []),
    suppliers: safeGet('smartbill_local_SUPPLIERS', []),
    ledger: safeGet('smartbill_local_LEDGER', []),
    audit_logs: safeGet('smartbill_audit_logs', []),
    transactions: safeGet('smartbill_transactions', [])
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SmartBill_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const restoreBackup = (jsonData) => {
  try {
    const data = JSON.parse(jsonData);
    
    // Strict Structure Validation
    if (!data.version || typeof data !== 'object') {
      alert("Invalid backup file. Missing version identity.");
      return false;
    }
    
    if (data.settings) safeSet('smartbill_settings', data.settings);
    if (data.products) safeSet('smartbill_local_PRODUCTS', data.products);
    if (data.bills) safeSet('smartbill_local_BILLS', data.bills);
    if (data.customers) safeSet('smartbill_local_CUSTOMERS', data.customers);
    if (data.suppliers) safeSet('smartbill_local_SUPPLIERS', data.suppliers);
    if (data.ledger) safeSet('smartbill_local_LEDGER', data.ledger);
    if (data.audit_logs) safeSet('smartbill_audit_logs', data.audit_logs);
    if (data.transactions) safeSet('smartbill_transactions', data.transactions);
    
    return true;
  } catch (err) {
    console.error("Backup restore failed", err);
    return false;
  }
};
