import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { loadGapiClient, setGapiToken, saveAccessToken, getAccessToken, clearAccessToken, SCOPES } from '../utils/googleApi';
import { runUserSetup, isSetupComplete, getUserSpreadsheetId, getUserFolderId } from '../utils/setupService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [spreadsheetId, setSpreadsheetId] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const setupRunning = useRef(false);

  // Decode user info from Google's userinfo endpoint
  const fetchUserInfo = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch user info');
      const data = await res.json();
      return {
        email: data.email,
        name: data.name,
        picture: data.picture,
        id: data.sub
      };
    } catch (err) {
      console.error('Error fetching user info:', err);
      return null;
    }
  };

  // Run setup after authentication
  const runSetup = useCallback(async (userInfo, token) => {
    if (setupRunning.current) return;
    setupRunning.current = true;

    try {
      setStatus('setting_up');
      
      // Load gapi and set token
      await loadGapiClient();
      setGapiToken(token);

      // Check if setup already done
      if (isSetupComplete(userInfo.email)) {
        const sheetId = getUserSpreadsheetId(userInfo.email);
        const driveFolderId = getUserFolderId(userInfo.email);
        setSpreadsheetId(sheetId);
        setFolderId(driveFolderId);
      } else {
        // First time - create spreadsheet + folder
        const result = await runUserSetup(userInfo.email);
        setSpreadsheetId(result.spreadsheetId);
        setFolderId(result.folderId);
      }

      setIsOffline(false);
      setStatus('ready');
    } catch (err) {
      console.error('Setup failed:', err);
      if (err.message === 'AUTH_EXPIRED') {
        setStatus('login_required');
        clearAccessToken();
      } else {
        setError('Setup failed: ' + (err.message || 'Unknown error'));
        setStatus('error');
      }
    } finally {
      setupRunning.current = false;
    }
  }, []);

  // Handle successful login
  const handleLoginSuccess = useCallback(async (tokenResponse) => {
    const token = tokenResponse.access_token;
    const expiresIn = tokenResponse.expires_in || 3600;
    
    // Save token
    saveAccessToken(token, expiresIn);
    setAccessToken(token);
    setGapiToken(token);

    // Get user info
    const userInfo = await fetchUserInfo(token);
    if (!userInfo) {
      setError('Could not retrieve user information');
      setStatus('error');
      return;
    }

    setUser(userInfo);
    localStorage.setItem('smartbill_user', JSON.stringify(userInfo));

    // Run setup
    await runSetup(userInfo, token);
  }, [runSetup]);

  // Google login trigger - uses popup flow
  const triggerLogin = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: (err) => {
      console.error('Login error:', err);
      const errType = err?.error || err?.type || '';
      if (errType === 'popup_closed' || errType === 'popup_failed_to_open') {
        setError('Login popup was blocked or closed. Please allow popups and try again.');
      } else {
        setError('Google login failed (Error 403: access_denied). This usually means your Google Cloud Console is not configured correctly. Use "Continue Offline" to use the app with local storage instead.');
      }
      setStatus('error');
    },
    scope: SCOPES,
    flow: 'implicit'
  });

  // Enter offline mode - skip Google auth entirely
  const enterOfflineMode = useCallback(() => {
    setUser({ name: 'Offline User', email: 'offline@local', picture: null, id: 'local' });
    setSpreadsheetId('LOCAL_MODE');
    setFolderId(null);
    setAccessToken(null);
    setIsOffline(true);
    setError(null);
    setStatus('ready');
    localStorage.setItem('smartbill_offline_mode', 'true');
  }, []);

  // Auto-login on mount - only if we have a saved token
  useEffect(() => {
    const init = async () => {
      // Check if user was in offline mode
      if (localStorage.getItem('smartbill_offline_mode') === 'true') {
        enterOfflineMode();
        return;
      }

      // Check for existing token
      const existingToken = getAccessToken();
      const savedUser = localStorage.getItem('smartbill_user');

      if (existingToken && savedUser) {
        try {
          const userInfo = JSON.parse(savedUser);
          setUser(userInfo);
          setAccessToken(existingToken);
          setStatus('authenticating');
          
          // Load gapi and set token
          await loadGapiClient();
          setGapiToken(existingToken);

          // Verify token is still valid
          const freshUser = await fetchUserInfo(existingToken);
          if (freshUser) {
            setUser(freshUser);
            await runSetup(freshUser, existingToken);
            return;
          }
        } catch (err) {
          console.error('Token validation failed:', err);
        }
      }

      // No valid token - show login screen
      setStatus('login_required');
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = () => {
    setStatus('authenticating');
    triggerLogin();
  };

  const logout = () => {
    if (!isOffline) {
      googleLogout();
    }
    clearAccessToken();
    localStorage.removeItem('smartbill_user');
    localStorage.removeItem('smartbill_offline_mode');
    setUser(null);
    setAccessToken(null);
    setSpreadsheetId(null);
    setFolderId(null);
    setIsOffline(false);
    setStatus('login_required');
  };

  const retry = () => {
    setError(null);
    setStatus('login_required');
  };

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      spreadsheetId,
      folderId,
      status,
      error,
      isOffline,
      login,
      logout,
      retry,
      enterOfflineMode,
      isReady: status === 'ready'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
