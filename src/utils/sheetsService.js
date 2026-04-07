/**
 * Google Sheets Service - Database operations via Sheets API v4
 * Falls back to localStorage when Google Sheets is unavailable (offline mode)
 */

import { apiCall } from './googleApi';

// Internal queue for background sync — zero-failure design
let syncQueue = [];
let isSyncing = false;
let _lastSpreadsheetId = null;

export const getSyncQueueLength = () => syncQueue.length;

const startBackgroundSync = async (spreadsheetId) => {
  _lastSpreadsheetId = spreadsheetId;
  if (isSyncing || syncQueue.length === 0 || spreadsheetId === 'LOCAL_MODE') return;
  isSyncing = true;

  while (syncQueue.length > 0) {
    const task = syncQueue[0];
    let success = false;
    let retries = 0;
    const maxRetries = 5;

    while (retries <= maxRetries && !success) {
      try {
        await task.fn();
        success = true;
        window.dispatchEvent(new CustomEvent('sync-success', {
          detail: { sheetName: task.sheetName, queueRemaining: syncQueue.length - 1 }
        }));
      } catch (err) {
        retries++;
        if (retries <= maxRetries) {
          const waitTime = Math.min(2000 * Math.pow(2, retries - 1), 32000);
          console.warn(`[Sync Retry ${retries}/${maxRetries}] for ${task.sheetName}. Waiting ${waitTime/1000}s...`);
          await new Promise(r => setTimeout(r, waitTime));
        } else {
          // Don't permanently drop — re-queue at the end for next cycle
          console.warn(`[Sync Deferred] ${task.sheetName} will retry in next cycle.`);
          syncQueue.push({ ...task, _retryCount: (task._retryCount || 0) + 1 });
          // Only show user warning if it's been failing multiple cycles
          if ((task._retryCount || 0) >= 2) {
            window.dispatchEvent(new CustomEvent('sync-error', {
              detail: { message: `Sync delayed for ${task.sheetName}. Will keep retrying. Data is safe locally.` }
            }));
          }
        }
      }
    }

    syncQueue.shift();
  }

  isSyncing = false;
};

// Periodic heartbeat — drain any remaining queue items every 30s
setInterval(() => {
  if (_lastSpreadsheetId && syncQueue.length > 0 && !isSyncing) {
    startBackgroundSync(_lastSpreadsheetId);
  }
}, 30000);

// Sheet tab definitions with headers
const SHEET_DEFINITIONS = {
  LEDGER: ['id', 'date', 'customer_id', 'supplier_id', 'type', 'invoice_id', 'amount', 'description', 'is_void', 'created_at'],
  BILLS: ['id', 'customer_id', 'invoice_no', 'date', 'items_json', 'sub_total', 'cgst', 'sgst', 'total', 'amount_paid', 'is_deleted', 'delete_reason', 'pdf_link', 'created_at'],
  ITEMS: ['id', 'bill_id', 'invoice_no', 'product_id', 'name', 'hsn', 'quantity', 'price', 'gst_rate', 'discount', 'total', 'created_at'],
  CUSTOMERS: ['id', 'name', 'phone'],
  SUPPLIERS: ['id', 'name', 'phone', 'address', 'gstin', 'previous_balance', 'created_at'],
  PRODUCTS: ['id', 'name', 'hsn', 'selling_price', 'purchase_price', 'quantity', 'low_stock_threshold', 'stock_history_json', 'created_at'],
  SETTINGS: ['key', 'value'],
  DAY_REPORTS: ['id', 'date', 'total_sales', 'total_collected', 'total_outstanding', 'bills_count', 'created_at'],
  BILLING_ENTRIES: ['name', 'phone', 'address', 'amount', 'date'],
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

  // Push to sync queue and start background drain
  syncQueue.push({
    sheetName,
    fn: async () => {
      return await apiCall(async () => {
        const response = await window.gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: rows }
        });
        return response.result;
      });
    }
  });

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

  // Push update to sync queue
  syncQueue.push({
    sheetName,
    fn: async () => {
      return await apiCall(async () => {
        const headers = SHEET_DEFINITIONS[sheetName];
        const lastCol = String.fromCharCode(64 + headers.length);
        const range = `${sheetName}!A${rowIndex}:${lastCol}${rowIndex}`;
        
        const response = await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [values] }
        });
        return response.result;
      });
    }
  });

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

export { SHEET_DEFINITIONS };
