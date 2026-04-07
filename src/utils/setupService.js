/**
 * Setup Service
 * Connects to the centralized Google Sheet.
 */

import { apiCall } from './googleApi';

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '';

const BILLING_SHEET_NAME = 'BILLING_ENTRIES';
const BILLING_HEADERS = ['name', 'phone', 'address', 'amount', 'date'];

/**
 * Ensure the BILLING_ENTRIES tab exists in the predefined sheet.
 * Creates the tab and writes the header row if it is missing.
 * Non-fatal — a failure here will not block the form.
 */
export const ensureBillingSheet = async (spreadsheetId) => {
  if (!spreadsheetId || spreadsheetId === 'LOCAL_MODE') return;

  try {
    const metaResponse = await apiCall(async () =>
      window.gapi.client.sheets.spreadsheets.get({ spreadsheetId })
    );

    const existingSheets = metaResponse.result.sheets || [];
    const tabExists = existingSheets.some(
      (s) => s.properties.title === BILLING_SHEET_NAME
    );

    if (!tabExists) {
      await apiCall(async () =>
        window.gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{ addSheet: { properties: { title: BILLING_SHEET_NAME } } }],
          },
        })
      );

      await apiCall(async () =>
        window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${BILLING_SHEET_NAME}!A1:E1`,
          valueInputOption: 'RAW',
          resource: { values: [BILLING_HEADERS] },
        })
      );
    }
  } catch (err) {
    console.warn('[Setup] Could not ensure billing sheet tab:', err);
  }
};

/**
 * Run the initial setup for a user
 */
export const runUserSetup = async (email) => {
  return { spreadsheetId: SHEET_ID, folderId: null };
};

/**
 * Check if setup is complete for a user
 */
export const isSetupComplete = (email) => {
  return true;
};

/**
 * Get the user's spreadsheet ID
 */
export const getUserSpreadsheetId = (email) => {
  return SHEET_ID;
};

/**
 * Get the user's Drive folder ID
 */
export const getUserFolderId = (email) => {
  return null;
};
