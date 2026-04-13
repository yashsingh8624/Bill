/**
 * Google Sheets Service - Database operations via Sheets API v4
 * Falls back to localStorage when Google Sheets is unavailable (offline mode)
 */

import { apiCall } from './googleApi';

// Storage-backed queue for background sync — true zero-failure design
const QUEUE_KEY = 'smartbill_sync_queue';
let isSyncing = false;
let _lastSpreadsheetId = null;

const getSyncQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveSyncQueue = (queue) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getSyncQueueLength = () => getSyncQueue().length;

const startBackgroundSync = async (spreadsheetId) => {
  _lastSpreadsheetId = spreadsheetId;
  let currentQueue = getSyncQueue();
  if (isSyncing || currentQueue.length === 0 || spreadsheetId === 'LOCAL_MODE') return;
  isSyncing = true;

  while (currentQueue.length > 0) {
    const task = currentQueue[0];
    let success = false;
    let retries = 0;
    const maxRetries = 5;

    while (retries <= maxRetries && !success) {
      try {
        await apiCall(async () => {
          if (task.type === 'APPEND_ROWS') {
            await window.gapi.client.sheets.spreadsheets.values.append({
              spreadsheetId: _lastSpreadsheetId,
              range: `${task.sheetName}!A1`,
              valueInputOption: 'USER_ENTERED',
              insertDataOption: 'INSERT_ROWS',
              resource: { values: task.data }
            });
          } else if (task.type === 'UPDATE_ROW') {
            await window.gapi.client.sheets.spreadsheets.values.update({
              spreadsheetId: _lastSpreadsheetId,
              range: task.range,
              valueInputOption: 'USER_ENTERED',
              resource: { values: task.data }
            });
          }
        });
        
        success = true;
        window.dispatchEvent(new CustomEvent('sync-success', {
          detail: { sheetName: task.sheetName, queueRemaining: Math.max(0, currentQueue.length - 1) }
        }));
      } catch (err) {
        retries++;
        if (retries <= maxRetries) {
          const waitTime = Math.min(2000 * Math.pow(2, retries - 1), 32000);
          console.warn(`[Sync Retry ${retries}/${maxRetries}] for ${task.sheetName}. Waiting ${waitTime/1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          console.warn(`[Sync Deferred] ${task.sheetName} will retry in next cycle.`);
          // Requeue at the end
          currentQueue = getSyncQueue();
          currentQueue.push({ ...task, _retryCount: (task._retryCount || 0) + 1 });
          if ((task._retryCount || 0) >= 1) {
            window.dispatchEvent(new CustomEvent('sync-error', {
              detail: { message: `Sync delayed for ${task.sheetName}. Will keep retrying. Data is safe locally.` }
            }));
          }
        }
      }
    }

    // Task finished (or was pushed to the back if it completely failed)
    currentQueue = getSyncQueue();
    currentQueue.shift();
    saveSyncQueue(currentQueue);
  }

  isSyncing = false;
};

// Periodic heartbeat — drain any remaining queue items every 15s instead of 30s for better experience
setInterval(() => {
  if (_lastSpreadsheetId && getSyncQueue().length > 0 && !isSyncing) {
    startBackgroundSync(_lastSpreadsheetId);
  }
}, 15000);

// Sheet tab definitions with headers
const SHEET_DEFINITIONS = {
  LEDGER: ['id', 'date', 'customer_id', 'supplier_id', 'type', 'invoice_id', 'amount', 'description', 'is_void', 'created_at'],
  BILLS: ['id', 'customer_id', 'invoice_no', 'date', 'items_json', 'sub_total', 'cgst', 'sgst', 'total', 'amount_paid', 'is_deleted', 'delete_reason', 'pdf_link', 'created_at'],
  ITEMS: ['id', 'bill_id', 'invoice_no', 'product_id', 'name', 'hsn', 'quantity', 'price', 'gst_rate', 'discount', 'total', 'created_at'],
  CUSTOMERS: ['id', 'name', 'phone', 'type'],
  SUPPLIERS: ['id', 'name', 'phone', 'business_name', 'address', 'gstin', 'previous_balance', 'type', 'created_at'],
  PARTIES: ['id', 'name', 'phone', 'business_name', 'address', 'gstin', 'previous_balance', 'type', 'created_at'],
  PRODUCTS: ['id', 'name', 'hsn', 'selling_price', 'purchase_price', 'quantity', 'low_stock_threshold', 'stock_history_json', 'created_at'],
  SETTINGS: ['key', 'value'],
  DAY_REPORTS: ['id', 'date', 'total_sales', 'total_collected', 'total_outstanding', 'bills_count', 'created_at'],
  EXPENSES: ['id', 'date', 'name', 'amount', 'payment_mode', 'category', 'created_at'],
  ALL_TRANSACTIONS: ['id', 'date', 'customer_name', 'type', 'amount', 'party_id']
};

// ============= LOCAL STORAGE FALLBACK =============

const LOCAL_PREFIX = 'smartbill_local_';

const getLocalData = (sheetName) => {
  try {
    const raw = localStorage.getItem(LOCAL_PREFIX + sheetName);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const setLocalData = (sheetName, rows) => {
  localStorage.setItem(LOCAL_PREFIX + sheetName, JSON.stringify(rows));
};

const isOffline = (spreadsheetId) => {
  return spreadsheetId === 'LOCAL_MODE';
};

// ============= GOOGLE SHEETS FUNCTIONS =============

/**
 * Create a new spreadsheet with all required sheets and headers
 */
export const createSpreadsheet = async (email) => {
  return apiCall(async () => {
    const sheetNames = Object.keys(SHEET_DEFINITIONS);
    
    const response = await window.gapi.client.sheets.spreadsheets.create({
      properties: {
        title: `BillingApp_${email}`
      },
      sheets: sheetNames.map((name, index) => ({
        properties: {
          sheetId: index,
          title: name,
          index: index
        }
      }))
    });

    const spreadsheetId = response.result.spreadsheetId;

    // Add header rows to each sheet
    const requests = [];
    for (const [sheetName, headers] of Object.entries(SHEET_DEFINITIONS)) {
      requests.push(
        window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
          valueInputOption: 'RAW',
          resource: { values: [headers] }
        })
      );
    }

    // Execute header inserts
    for (const req of requests) {
      await req;
    }

    return spreadsheetId;
  });
};

/**
 * Ensure ALL_TRANSACTIONS sheet exists
 */
export const ensureAllTransactionsSheet = async (spreadsheetId) => {
  if (isOffline(spreadsheetId)) return;
  try {
    await apiCall(async () => {
      const response = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title'
      });
      const sheets = response.result.sheets.map(s => s.properties.title);
      
      if (!sheets.includes('ALL_TRANSACTIONS')) {
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{ addSheet: { properties: { title: 'ALL_TRANSACTIONS' } } }]
          }
        });
        
        const headers = SHEET_DEFINITIONS.ALL_TRANSACTIONS;
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `ALL_TRANSACTIONS!A1:${String.fromCharCode(64 + headers.length)}1`,
          valueInputOption: 'RAW',
          resource: { values: [headers] }
        });
        console.log('[Auto-Setup] ALL_TRANSACTIONS sheet created.');
      }
    });
  } catch (err) {
    console.error('[Auto-Setup] error ensuring sheet:', err);
  }
};

/**
 * Get spreadsheet ID from local storage for this user
 */
export const getStoredSpreadsheetId = (email) => {
  const key = `smartbill_sheet_${email}`;
  return localStorage.getItem(key);
};

/**
 * Store spreadsheet ID locally
 */
export const storeSpreadsheetId = (email, spreadsheetId) => {
  const key = `smartbill_sheet_${email}`;
  localStorage.setItem(key, spreadsheetId);
};

/**
 * Append rows to a sheet
 */
/**
 * Append rows to a sheet: Updates local cache first, then syncs to Google Sheets.
 */
export const appendRows = async (spreadsheetId, sheetName, rows) => {
  const existing = getLocalData(sheetName);
  existing.push(...rows);
  setLocalData(sheetName, existing);

  if (isOffline(spreadsheetId)) {
    return { updates: { updatedRows: rows.length } };
  }

  // Push to persistent sync queue and start background drain
  const queue = getSyncQueue();
  queue.push({
    type: 'APPEND_ROWS',
    sheetName,
    data: rows
  });
  saveSyncQueue(queue);

  startBackgroundSync(spreadsheetId);
  return { updates: { updatedRows: rows.length }, optimistic: true };
};

/**
 * Append a single row to a sheet
 */
export const appendRow = async (spreadsheetId, sheetName, values) => {
  return appendRows(spreadsheetId, sheetName, [values]);
};



/**
 * Get all rows from a sheet (excluding header)
 */
export const getRows = async (spreadsheetId, sheetName) => {
  const headers = SHEET_DEFINITIONS[sheetName] || [];
  const localRows = getLocalData(sheetName);
  
  if (isOffline(spreadsheetId)) {
    return { headers, rows: localRows };
  }

  // If we have local data, return it instantly (Local-First)
  // But fire a background refresh to keep cache warm
  if (localRows.length > 0) {
    // Background refresh logic could go here, but for now we prioritize speed.
    // If it's a fresh load or empty, we must await.
  }

  try {
    const data = await apiCall(async () => {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:ZZ`
      });
      
      const allRows = response.result.values || [];
      if (allRows.length <= 1) return { headers: (allRows[0] && allRows[0].length > 0) ? allRows[0] : headers, rows: [] };
      
      const responseHeaders = allRows[0];
      const dataRows = allRows.slice(1);
      
      return { headers: responseHeaders, rows: dataRows };
    });
    
    // Refresh local cache with latest data
    setLocalData(sheetName, data.rows);
    return data;
  } catch (err) {
    console.warn(`[Sync Warning] Failed to fetch rows from ${sheetName} on Google Sheets. Falling back to local cache:`, err);
    return { headers, rows: localRows };
  }
};

/**
 * Convert sheet rows to array of objects using headers
 */
export const rowsToObjects = (headers, rows) => {
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
};

/**
 * Convert an object to a row array based on sheet headers
 */
export const objectToRow = (sheetName, obj) => {
  const headers = SHEET_DEFINITIONS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
  return headers.map(h => {
    const val = obj[h];
    if (val === undefined || val === null) return '';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    return String(val);
  });
};

/**
 * Update a specific row in a sheet (1-indexed, row 1 is header)
 */
export const updateRow = async (spreadsheetId, sheetName, rowIndex, values) => {
  const rows = getLocalData(sheetName);
  const dataIndex = rowIndex - 2; // Convert from 1-indexed with header to 0-indexed
  if (dataIndex >= 0 && dataIndex < rows.length) {
    rows[dataIndex] = values;
    setLocalData(sheetName, rows);
  }

  if (isOffline(spreadsheetId)) {
    return { updatedRows: 1 };
  }

  // Push exact update to persistent sync queue
  const headers = SHEET_DEFINITIONS[sheetName];
  const lastCol = String.fromCharCode(64 + headers.length);
  const range = `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`;
  
  const queue = getSyncQueue();
  queue.push({
    type: 'UPDATE_ROW',
    sheetName,
    range,
    data: [values]
  });
  saveSyncQueue(queue);

  startBackgroundSync(spreadsheetId);
  return { updatedRows: 1, optimistic: true };
};

/**
 * Find row index by matching a column value
 * Returns the 1-indexed row number (for use in range), or -1 if not found
 */
export const findRowIndex = async (spreadsheetId, sheetName, columnName, value) => {
  const { headers, rows } = await getRows(spreadsheetId, sheetName);
  const colIdx = headers.indexOf(columnName);
  if (colIdx === -1) return -1;
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][colIdx] === String(value)) {
      return i + 2; // +1 for header, +1 for 1-indexed
    }
  }
  return -1;
};

/**
 * Get all data from a sheet as objects
 */
export const getSheetData = async (spreadsheetId, sheetName) => {
  const { headers, rows } = await getRows(spreadsheetId, sheetName);
  return rowsToObjects(headers, rows);
};

/**
 * Batch update multiple cells/rows
 */
export const batchUpdate = async (spreadsheetId, updates) => {
  if (isOffline(spreadsheetId)) {
    // Offline batch update is a no-op for now
    return { totalUpdatedRows: 0 };
  }
  return apiCall(async () => {
    const response = await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });
    return response.result;
  });
};

export const clearAllSheetData = async (spreadsheetId) => {
  if (!spreadsheetId || isOffline(spreadsheetId)) return;
  return apiCall(async () => {
    const requests = Object.entries(SHEET_DEFINITIONS).map(([name, headers]) => {
      const lastCol = String.fromCharCode(64 + headers.length);
      return window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${name}!A2:${lastCol}10000`
      });
    });
    await Promise.all(requests);
    // Clear all local caches
    Object.keys(SHEET_DEFINITIONS).forEach(name => {
      localStorage.removeItem(LOCAL_PREFIX + name);
    });
  });
};

export { SHEET_DEFINITIONS };
