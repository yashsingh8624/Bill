/**
 * Setup Service - First-login orchestration
 * Creates Google Sheet + Drive folder for new users
 */

import { createSpreadsheet, getStoredSpreadsheetId, storeSpreadsheetId } from './sheetsService';
import { createDriveFolder, findDriveFolder, getStoredFolderId, storeFolderId } from './driveService';

/**
 * Run the initial setup for a user
 * - Creates spreadsheet if not exists
 * - Creates Drive folder if not exists
 * - Returns { spreadsheetId, folderId }
 */
export const runUserSetup = async (email) => {
  let spreadsheetId = getStoredSpreadsheetId(email);
  let folderId = getStoredFolderId(email);

  // Create spreadsheet if needed
  if (!spreadsheetId) {
    console.log('Creating new spreadsheet for', email);
    try {
      spreadsheetId = await createSpreadsheet(email);
      storeSpreadsheetId(email, spreadsheetId);
      console.log('Spreadsheet created:', spreadsheetId);
    } catch (err) {
      console.error('Failed to create spreadsheet:', err);
      throw new Error('Failed to create your data spreadsheet. Please try again.');
    }
  }

  // Create Drive folder if needed
  if (!folderId) {
    const folderName = `BillingApp_${email}`;
    console.log('Setting up Drive folder for', email);
    
    try {
      // Check if folder already exists
      let folder = await findDriveFolder(folderName);
      
      if (!folder) {
        folder = await createDriveFolder(folderName);
      }
      
      folderId = folder.id;
      storeFolderId(email, folderId);
      console.log('Drive folder ready:', folderId);
    } catch (err) {
      console.error('Failed to create Drive folder:', err);
      // Non-fatal - PDF storage won't work but app can still function
      console.warn('Drive folder creation failed. PDF storage will be unavailable.');
    }
  }

  return { spreadsheetId, folderId };
};

/**
 * Check if setup is complete for a user
 */
export const isSetupComplete = (email) => {
  return !!getStoredSpreadsheetId(email);
};

/**
 * Get the user's spreadsheet ID
 */
export const getUserSpreadsheetId = (email) => {
  return getStoredSpreadsheetId(email);
};

/**
 * Get the user's Drive folder ID
 */
export const getUserFolderId = (email) => {
  return getStoredFolderId(email);
};
