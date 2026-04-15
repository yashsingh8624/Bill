import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import { initializeUserDoc } from '../utils/firestoreService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [firebaseUid, setFirebaseUid] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [feedbackMessage, setFeedbackMessage] = useState(null); // { text, type: 'success' | 'error' }

  // ============= CLEAR FEEDBACK =============
  const clearFeedback = useCallback(() => {
    setFeedbackMessage(null);
  }, []);

  // ============= SIGNUP =============
  const signup = useCallback(async (name, email, password) => {
    try {
      setStatus('authenticating');
      setError(null);
      clearFeedback();

      console.log('[Auth] 🔑 Creating account for:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

      // Set display name
      await updateProfile(firebaseUser, { displayName: name });

      console.log('[Auth] ✅ Account created, uid:', firebaseUser.uid);

      const userInfo = {
        email: firebaseUser.email,
        name: name,
        picture: null,
        id: firebaseUser.uid
      };

      setFirebaseUid(firebaseUser.uid);
      setUser(userInfo);
      localStorage.setItem('smartbill_user', JSON.stringify(userInfo));
      localStorage.setItem('lastEmail', email);

      // Initialize user document in Firestore
      console.log('[Auth] Initializing Firestore user doc...');
      await initializeUserDoc(firebaseUser.uid, userInfo);
      console.log('[Auth] ✅ User doc initialized');

      setFeedbackMessage({ text: 'Account created successfully! Welcome aboard 🎉', type: 'success' });
      setStatus('ready');
    } catch (err) {
      console.error('[Auth] Signup error:', err);
      let msg = 'Signup failed. Please try again.';
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered. Please login instead.';
      else if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
      else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      setError(msg);
      setFeedbackMessage({ text: msg, type: 'error' });
      setStatus('login_required');
    }
  }, [clearFeedback]);

  // ============= LOGIN =============
  const login = useCallback(async (email, password) => {
    try {
      setStatus('authenticating');
      setError(null);
      clearFeedback();

      console.log('[Auth] 🔑 Signing in:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

      console.log('[Auth] ✅ Login SUCCESS, uid:', firebaseUser.uid);

      const userInfo = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || email.split('@')[0],
        picture: firebaseUser.photoURL,
        id: firebaseUser.uid
      };

      setFirebaseUid(firebaseUser.uid);
      setUser(userInfo);
      localStorage.setItem('smartbill_user', JSON.stringify(userInfo));
      localStorage.setItem('lastEmail', email);

      // Update lastLogin in Firestore
      await initializeUserDoc(firebaseUser.uid, userInfo);

      setFeedbackMessage({ text: 'Login successful! Welcome back 👋', type: 'success' });
      setStatus('ready');
    } catch (err) {
      console.error('[Auth] Login error:', err);
      let msg = 'Login failed. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = 'No account found with this email, or wrong password.';
      else if (err.code === 'auth/wrong-password') msg = 'Incorrect password. Please try again.';
      else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please wait a moment and try again.';
      setError(msg);
      setFeedbackMessage({ text: msg, type: 'error' });
      setStatus('login_required');
    }
  }, [clearFeedback]);

  // ============= FORGOT PASSWORD =============
  const forgotPassword = useCallback(async (email) => {
    try {
      setError(null);
      clearFeedback();

      console.log('[Auth] 📧 Sending password reset to:', email);
      await sendPasswordResetEmail(auth, email);

      setFeedbackMessage({ text: 'Password reset link sent to your email ✉️', type: 'success' });
      return true;
    } catch (err) {
      console.error('[Auth] Forgot password error:', err);
      let msg = 'Failed to send reset email.';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      setError(msg);
      setFeedbackMessage({ text: msg, type: 'error' });
      return false;
    }
  }, [clearFeedback]);

  // ============= LOGOUT =============
  const logout = useCallback(async () => {
    try {
      console.log('[Auth] 🚪 Signing out...');
      await signOut(auth);
      setFirebaseUid(null);
      setUser(null);
      localStorage.removeItem('smartbill_user');
      localStorage.removeItem('smartbill_offline_mode');
      setStatus('login_required');
      setAuthMode('login');
      setFeedbackMessage({ text: 'Logged out successfully 👋', type: 'success' });
      console.log('[Auth] ✅ Signed out');
    } catch (err) {
      console.error('[Auth] Logout error:', err);
    }
  }, []);

  // ============= AUTH STATE LISTENER =============
  useEffect(() => {
    console.log('[Auth] 🔄 Setting up onAuthStateChanged listener...');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] onAuthStateChanged fired. user:', firebaseUser ? firebaseUser.uid : 'NULL');

      if (firebaseUser) {
        const userInfo = {
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          picture: firebaseUser.photoURL,
          id: firebaseUser.uid
        };

        setFirebaseUid(firebaseUser.uid);
        setUser(userInfo);
        localStorage.setItem('smartbill_user', JSON.stringify(userInfo));
        setStatus('ready');
        console.log('[Auth] ✅ Status set to READY (from onAuthStateChanged)');
      } else {
        // Not logged in
        setStatus('login_required');
      }
    });

    return () => unsubscribe();
  }, []);

  // ============= RETRY =============
  const retry = useCallback(() => {
    setError(null);
    clearFeedback();
    setStatus('login_required');
  }, [clearFeedback]);

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUid,
      status,
      error,
      authMode,
      feedbackMessage,
      setAuthMode,
      login,
      signup,
      logout,
      forgotPassword,
      retry,
      clearFeedback,
      isReady: status === 'ready',
      // Legacy compatibility — always Firebase now
      useFirebase: true,
      isOffline: false,
      accessToken: null,
      spreadsheetId: null,
      folderId: null,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
