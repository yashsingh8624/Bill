/**
 * Google Drive Service - Folder creation and PDF upload
 * Each user gets their own folder: BillingApp_<email>
 */

import { apiCall, getAccessToken } from './googleApi';

/**
 * Create a folder in Google Drive
 */
export const createDriveFolder = async (folderName) => {
  return apiCall(async () => {
    const response = await window.gapi.client.drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id, name, webViewLink'
    });
    return response.result;
  });
};

/**
 * Find existing folder by name
 */
export const findDriveFolder = async (folderName) => {
  return apiCall(async () => {
    const response = await window.gapi.client.drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive'
    });
    const files = response.result.files || [];
    return files.length > 0 ? files[0] : null;
  });
};

/**
 * Upload a PDF blob to a Drive folder
 */
export const uploadPdfToDrive = async (folderId, fileName, pdfBlob) => {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error('No access token');

  const metadata = {
    name: fileName,
    mimeType: 'application/pdf',
    parents: [folderId]
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    }
  );

  if (!response.ok) {
    throw new Error(`Drive upload failed: ${response.status}`);
  }

  return await response.json();
};

/**
 * Get stored folder ID for this user
 */
export const getStoredFolderId = (email) => {
  const key = `smartbill_folder_${email}`;
  return localStorage.getItem(key);
};

/**
 * Store folder ID locally
 */
export const storeFolderId = (email, folderId) => {
  const key = `smartbill_folder_${email}`;
  localStorage.setItem(key, folderId);
};
