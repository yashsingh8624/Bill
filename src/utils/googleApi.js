/**
 * Google API Client - Core loader and token management
 * Handles loading gapi, setting tokens, and providing retry logic
 */

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

let gapiLoaded = false;
let gapiLoadPromise = null;

/**
 * Load the gapi client library
 */
export const loadGapiClient = () => {
  if (gapiLoaded) return Promise.resolve();
  if (gapiLoadPromise) return gapiLoadPromise;

  gapiLoadPromise = new Promise((resolve, reject) => {
    const checkGapi = () => {
      if (window.gapi) {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({});
            // Load discovery docs for Sheets and Drive
            await window.gapi.client.load('sheets', 'v4');
            await window.gapi.client.load('drive', 'v3');
            gapiLoaded = true;
            resolve();
          } catch (err) {
            console.error('Failed to init gapi client:', err);
            reject(err);
          }
        });
      } else {
        // gapi script not loaded yet, retry
        setTimeout(checkGapi, 100);
      }
    };
    checkGapi();
  });

  return gapiLoadPromise;
};

/**
 * Set the access token for gapi client
 */
export const setGapiToken = (accessToken) => {
  if (window.gapi && window.gapi.client) {
    window.gapi.client.setToken({ access_token: accessToken });
  }
};

/**
 * Get the current access token
 */
export const getAccessToken = () => {
  const tokenData = localStorage.getItem('smartbill_google_token');
  if (!tokenData) return null;
  
  try {
    const parsed = JSON.parse(tokenData);
    // Check if token is expired (with 5 min buffer)
    if (parsed.expiresAt && Date.now() > parsed.expiresAt - 300000) {
      return null; // Expired
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
};

/**
 * Save the access token with expiry
 */
export const saveAccessToken = (accessToken, expiresIn = 3600) => {
  const tokenData = {
    accessToken,
    expiresAt: Date.now() + (expiresIn * 1000),
    savedAt: new Date().toISOString()
  };
  localStorage.setItem('smartbill_google_token', JSON.stringify(tokenData));
};

/**
 * Clear the saved token
 */
export const clearAccessToken = () => {
  localStorage.removeItem('smartbill_google_token');
};

/**
 * API call wrapper with retry logic and error handling
 */
export const apiCall = async (fn, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      const status = err?.status || err?.result?.error?.code;
      
      // Rate limit - wait and retry
      if (status === 429 && attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.warn(`Rate limited, retrying in ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      
      // Auth error
      if (status === 401 || status === 403) {
        clearAccessToken();
        throw new Error('AUTH_EXPIRED');
      }
      
      // Last attempt - throw
      if (attempt === retries) {
        console.error('API call failed after retries:', err);
        throw err;
      }
      
      // Other error - retry with backoff
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
};

export { SCOPES };
