import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

import { initializeUserDoc } from '../utils/firestoreService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState(null);
  const setupRunning = useRef(false);



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
  }, []);



  // ============= OFFLINE MODE =============

  const enterOfflineMode = useCallback(() => {
    setUser({ name: 'Offline User', email: 'offline@local', picture: null, id: 'local' });
    setIsOffline(true);
    setError(null);
    setStatus('ready');
    localStorage.setItem('smartbill_offline_mode', 'true');
  }, []);

  // ============= AUTO-LOGIN ON MOUNT =============

  useEffect(() => {
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
  }, [enterOfflineMode]);

  // ============= PUBLIC API =============

  const login = () => {
    setError(null);
    handleFirebaseLogin();
  };

  const logout = () => {
    signOut(auth).catch(console.error);
    // Firebase Auth handles cleanup on signOut
    setFirebaseUid(null);
    localStorage.removeItem('smartbill_user');
    localStorage.removeItem('smartbill_offline_mode');
    setUser(null);
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
      status,
      error,
      isOffline,
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
