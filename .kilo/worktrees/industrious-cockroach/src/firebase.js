/**
 * Firebase Configuration & Initialization
 * Primary backend for SmartBill Pro
 */
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAJZA2T83DVx4YGqnStz90kv0ed6Uo7ahk",
  authDomain: "smartbillpro-15bc7.firebaseapp.com",
  projectId: "smartbillpro-15bc7",
  storageBucket: "smartbillpro-15bc7.firebasestorage.app",
  messagingSenderId: "337231582246",
  appId: "1:337231582246:web:137313d77e83d4c1cac2e7",
  measurementId: "G-5GE1VJ9341"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();



// === DEBUG ===
console.log('[Firebase] ✅ App initialized, projectId:', firebaseConfig.projectId);
console.log('[Firebase] ✅ Firestore db:', db ? 'OK' : 'MISSING');
console.log('[Firebase] ✅ Auth:', auth ? 'OK' : 'MISSING');
console.log('[Firebase] auth.currentUser on init:', auth.currentUser);

export { app, db, auth, googleProvider };
