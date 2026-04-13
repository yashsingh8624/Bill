import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { loadGapiClient, setGapiToken, saveAccessToken, getAccessToken, clearAccessToken, SCOPES } from '../utils/googleApi';
import { runUserSetup, isSetupComplete, getUserSpreadsheetId, getUserFolderId } from '../utils/setupService';
import { ensureAllTransactionsSheet } from '../utils/sheetsService';
import { initializeUserDoc } from '../utils/firestoreService';

const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [spreadsheetId, setSpreadsheetId] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [useFirebase, setUseFirebase] = useState(USE_FIREBASE);
  const [firebaseUid, setFirebaseUid] = useState(null);
  const setupRunning = useRef(false);

  // ============= GOOGLE SHEETS SETUP (backup) =============

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

  const runSheetsSetup = useCallback(async (userInfo, token) => {
    try {
      await loadGapiClient();
      setGapiToken(token);

      if (isSetupComplete(userInfo.email)) {
        const sheetId = getUserSpreadsheetId(userInfo.email);
        const driveFolderId = getUserFolderId(userInfo.email);
        setSpreadsheetId(sheetId);
        setFolderId(driveFolderId);
        
        try {
          await ensureAllTransactionsSheet(sheetId);
        } catch (e) {
          console.error("Migration check failed", e);
        }
      } else {
        const result = await runUserSetup(userInfo.email);
        setSpreadsheetId(result.spreadsheetId);
        setFolderId(result.folderId);
      }
    } catch (err) {
      console.error('Sheets setup failed (non-critical with Firebase):', err);
      // If Firebase is primary, sheets failure is non-critical
      if (!useFirebase) throw err;
    }
  }, [useFirebase]);

  // ============= FIREBASE AUTH =============

  const handleFirebaseLogin = useCallback(async () => {
    try {
      setStatus('authenticating');
      console.log('[Auth] 🔑 Starting Firebase login...');
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      console.log('[Auth] ✅ Firebase login SUCCESS');
      console.log('[Auth] uid:', firebaseUser.uid);
      console.log('[Auth] email:', firebaseUser.email);
      console.log('[Auth] auth.currentUser:', auth.currentUser?.uid);

      const userInfo = {
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        picture: firebaseUser.photoURL,
        id: firebaseUser.uid
      };

      setFirebaseUid(firebaseUser.uid);
      setUser(userInfo);
      localStorage.setItem('smartbill_user', JSON.stringify(userInfo));

      // Initialize user document in Firestore
      console.log('[Auth] Initializing Firestore user doc...');
      await initializeUserDoc(firebaseUser.uid, userInfo);
      console.log('[Auth] ✅ User doc initialized');

      // Try to get Google OAuth token for Sheets backup
      const credential = result._tokenResponse;
      if (credential?.oauthAccessToken) {
        const oauthToken = credential.oauthAccessToken;
        saveAccessToken(oauthToken, 3600);
        setAccessToken(oauthToken);
        
        // Background: set up Google Sheets as backup
        try {
          await runSheetsSetup(userInfo, oauthToken);
        } catch (err) {
          console.warn('[Firebase Primary] Sheets backup setup failed, continuing with Firebase only:', err.message);
        }
      } else {
        console.warn('[Firebase Primary] No OAuth token from Firebase login — Sheets backup unavailable');
      }

      setIsOffline(false);
      setStatus('ready');
      console.log('[Auth] ✅ Status set to READY. auth.currentUser:', auth.currentUser?.uid);
    } catch (err) {
      console.error('Firebase login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login popup was closed. Please try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignore duplicate popup requests
      } else {
        setError('Login failed: ' + (err.message || 'Unknown error'));
      }
      setStatus('error');
    }
  }, [runSheetsSetup]);

  // ============= LEGACY GOOGLE OAUTH (fallback) =============

  const handleLegacyLoginSuccess = useCallback(async (tokenResponse) => {
    const token = tokenResponse.access_token;
    const expiresIn = tokenResponse.expires_in || 3600;
    
    saveAccessToken(token, expiresIn);
    setAccessToken(token);
    setGapiToken(token);

    const userInfo = await fetchUserInfo(token);
    if (!userInfo) {
      setError('Could not retrieve user information');
      setStatus('error');
      return;
    }

    setUser(userInfo);
    localStorage.setItem('smartbill_user', JSON.stringify(userInfo));

    if (setupRunning.current) return;
    setupRunning.current = true;
    try {
      setStatus('setting_up');
      await runSheetsSetup(userInfo, token);
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
  }, [runSheetsSetup]);

  const triggerLegacyLogin = useGoogleLogin({
    onSuccess: handleLegacyLoginSuccess,
    onError: (err) => {
      console.error('Legacy login error:', err);
      setError('Google login failed. Use "Continue Offline" to use the app with local storage instead.');
      setStatus('error');
    },
    scope: SCOPES,
    flow: 'implicit'
  });

  // ============= OFFLINE MODE =============

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

  // ============= AUTO-LOGIN ON MOUNT =============

  useEffect(() => {
    if (useFirebase) {
      console.log('[Auth] 🔄 Setting up onAuthStateChanged listener...');
      // Firebase auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('[Auth] onAuthStateChanged fired. user:', firebaseUser ? firebaseUser.uid : 'NULL');
        if (firebaseUser) {
          const userInfo = {
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            picture: firebaseUser.photoURL,
            id: firebaseUser.uid
          };
          
          setFirebaseUid(firebaseUser.uid);
          setUser(userInfo);
          localStorage.setItem('smartbill_user', JSON.stringify(userInfo));
          console.log('[Auth] ✅ auth.currentUser after onAuthStateChanged:', auth.currentUser?.uid);

          // Try sheets backup with saved token
          const existingToken = getAccessToken();
          if (existingToken) {
            setAccessToken(existingToken);
            try {
              await runSheetsSetup(userInfo, existingToken);
            } catch (e) {
              console.warn('[Auto-login] Sheets backup unavailable');
            }
          }

          setIsOffline(false);
          setStatus('ready');
          console.log('[Auth] ✅ Status set to READY (from onAuthStateChanged)');
        } else {
          // Check offline mode
          if (localStorage.getItem('smartbill_offline_mode') === 'true') {
            enterOfflineMode();
            return;
          }
          setStatus('login_required');
        }
      });

      return () => unsubscribe();
    } else {
      // Legacy: existing Google OAuth auto-login
      const init = async () => {
        if (localStorage.getItem('smartbill_offline_mode') === 'true') {
          enterOfflineMode();
          return;
        }

        const existingToken = getAccessToken();
        const savedUser = localStorage.getItem('smartbill_user');

        if (existingToken && savedUser) {
          try {
            const userInfo = JSON.parse(savedUser);
            setUser(userInfo);
            setAccessToken(existingToken);
            setStatus('authenticating');
            
            await loadGapiClient();
            setGapiToken(existingToken);

            const freshUser = await fetchUserInfo(existingToken);
            if (freshUser) {
              setUser(freshUser);
              if (!setupRunning.current) {
                setupRunning.current = true;
                try {
                  setStatus('setting_up');
                  await runSheetsSetup(freshUser, existingToken);
                  setIsOffline(false);
                  setStatus('ready');
                } catch (err) {
                  console.error('Setup failed:', err);
                  setStatus('error');
                  setError('Setup failed: ' + err.message);
                } finally {
                  setupRunning.current = false;
                }
              }
              return;
            }
          } catch (err) {
            console.error('Token validation failed:', err);
          }
        }

        setStatus('login_required');
      };

      init();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============= PUBLIC API =============

  const login = () => {
    setError(null);
    if (useFirebase) {
      handleFirebaseLogin();
    } else {
      setStatus('authenticating');
      triggerLegacyLogin();
    }
  };

  const logout = () => {
    if (useFirebase) {
      signOut(auth).catch(console.error);
      // Firebase Auth handles cleanup on signOut
      setFirebaseUid(null);
    }
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
      useFirebase,
      firebaseUid,
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
