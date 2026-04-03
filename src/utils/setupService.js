/**
 * Setup Service
 * Connects to the centralized Google Sheet.
 */

// We no longer import driveService or sheetsService for creation.
// Setup is simplified to return the required Sheet ID.

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '1XvY9_DH7QC6j28zZNLGiQzrwBKGg0yQzfAFdyU69i_I';

/**
 * Run the initial setup for a user
 * Returns the unified spreadsheetId and null for folderId (as drive integration is removed)
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
