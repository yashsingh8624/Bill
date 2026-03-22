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

export const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);

export const exportBackup = () => {
  const data = {
    version: "1.1.0",
    backupDate: new Date().toISOString(),
    settings: safeGet('smartbill_settings', {}),
    products: safeGet('smartbill_products', []),
    bills: safeGet('smartbill_bills', []),
    customers: safeGet('smartbill_customers', []),
    suppliers: safeGet('smartbill_suppliers', []),
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
    if (data.products) safeSet('smartbill_products', data.products);
    if (data.bills) safeSet('smartbill_bills', data.bills);
    if (data.customers) safeSet('smartbill_customers', data.customers);
    if (data.suppliers) safeSet('smartbill_suppliers', data.suppliers);
    if (data.transactions) safeSet('smartbill_transactions', data.transactions);
    
    return true;
  } catch (err) {
    console.error("Backup restore failed", err);
    return false;
  }
};
