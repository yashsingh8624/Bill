/**
 * Firestore Service — Primary database operations
 * Data is stored per-user: users/{uid}/{collection}/{docId}
 */
import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// ============= HELPERS =============

/** Get the current user's UID — always reads from Firebase Auth directly */
const getUid = () => {
  const user = auth.currentUser;
  console.log('[Firestore] getUid() → auth.currentUser:', user ? `✅ uid=${user.uid}` : '❌ NULL');
  if (!user) throw new Error('Firestore: No authenticated user. auth.currentUser is null.');
  return user.uid;
};

/** Get a reference to a user's sub-collection */
const userCollection = (collectionName) => {
  const uid = getUid();
  const path = `users/${uid}/${collectionName}`;
  console.log('[Firestore] Collection path:', path);
  return collection(db, 'users', uid, collectionName);
};

/** Get a reference to a specific document in a user's sub-collection */
const userDoc = (collectionName, docId) => {
  const uid = getUid();
  const path = `users/${uid}/${collectionName}/${docId}`;
  console.log('[Firestore] Doc path:', path);
  return doc(db, 'users', uid, collectionName, docId);
};

// ============= CRUD OPERATIONS =============

/**
 * Get all documents from a user's collection
 */
export const getCollectionData = async (collectionName) => {
  console.log(`[Firestore] 📖 Reading path: ${collectionName}`);
  try {
    const uid = getUid();
    const segments = collectionName.split('/').filter(Boolean);
    
    // An even number of segments (after users/uid) means it's a Document path
    if (segments.length > 0 && segments.length % 2 === 0) {
      console.log(`[Firestore] ⚠️ Path '${collectionName}' resolves to a Document. Fetching doc...`);
      const docRef = doc(db, 'users', uid, ...segments);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Return array fields if present, else array of values
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) return data[key];
        }
        return Object.values(data).filter(v => typeof v === 'object' && v !== null);
      }
      
      // If doc doesn't exist, try falling back to the last segment as a root collection
      // (Common mistake when users describe logical paths instead of strict Firestore paths)
      const fallbackName = segments[segments.length - 1];
      console.log(`[Firestore] Document empty. Falling back to root collection '${fallbackName}'`);
      const fallbackRef = collection(db, 'users', uid, fallbackName);
      const fallbackSnap = await getDocs(fallbackRef);
      return fallbackSnap.docs.map(d => ({ ...d.data(), _docId: d.id }));
    }
    
    // Normal collection path (odd number of segments)
    const ref = collection(db, 'users', uid, ...segments);
    const snapshot = await getDocs(ref);
    console.log(`[Firestore] ✅ Read ${collectionName}: ${snapshot.size} docs`);
    return snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));
  } catch (err) {
    console.error(`[Firestore] ❌ Error reading ${collectionName}:`, err.message);
    return [];
  }
};

/**
 * Get a single document by its Firestore doc ID
 */
export const getDocument = async (collectionName, docId) => {
  console.log(`[Firestore] 📖 Reading doc: ${collectionName}/${docId}`);
  try {
    const ref = userDoc(collectionName, docId);
    const snap = await getDoc(ref);
    console.log(`[Firestore] Doc exists: ${snap.exists()}`);
    if (snap.exists()) {
      return { ...snap.data(), _docId: snap.id };
    }
    return null;
  } catch (err) {
    console.error(`[Firestore] ❌ Error reading doc ${collectionName}/${docId}:`, err.message);
    return null;
  }
};

/**
 * Add a document to a collection.
 * If the object has an `id` field, we use it as the Firestore doc ID.
 */
export const addDocument = async (collectionName, data) => {
  console.log(`[Firestore] ✏️ WRITING to ${collectionName}:`, JSON.stringify(data).substring(0, 200));
  try {
    const cleanData = { ...data, _updatedAt: new Date().toISOString() };
    
    if (data.id) {
      const ref = userDoc(collectionName, data.id);
      console.log(`[Firestore] Using setDoc with id: ${data.id}`);
      await setDoc(ref, cleanData);
      console.log(`[Firestore] ✅ SUCCESS: Added to ${collectionName} with id: ${data.id}`);
      return { ...cleanData, _docId: data.id };
    } else {
      const ref = userCollection(collectionName);
      console.log(`[Firestore] Using addDoc (auto-id)`);
      const docRef = await addDoc(ref, cleanData);
      console.log(`[Firestore] ✅ SUCCESS: Added to ${collectionName} with auto-id: ${docRef.id}`);
      return { ...cleanData, _docId: docRef.id };
    }
  } catch (err) {
    console.error(`[Firestore] ❌ WRITE FAILED for ${collectionName}:`, err.code, err.message);
    throw err;
  }
};

/**
 * Update a document
 */
export const updateDocument = async (collectionName, docId, data) => {
  console.log(`[Firestore] ✏️ UPDATING ${collectionName}/${docId}`);
  try {
    const ref = userDoc(collectionName, docId);
    const cleanData = { ...data, _updatedAt: new Date().toISOString() };
    await updateDoc(ref, cleanData);
    console.log(`[Firestore] ✅ Updated ${collectionName}/${docId}`);
    return true;
  } catch (err) {
    console.error(`[Firestore] ❌ Update FAILED ${collectionName}/${docId}:`, err.code, err.message);
    throw err;
  }
};

/**
 * Set (overwrite/merge) a document — useful for settings
 */
export const setDocument = async (collectionName, docId, data) => {
  console.log(`[Firestore] ✏️ SET ${collectionName}/${docId}`);
  try {
    const ref = userDoc(collectionName, docId);
    const cleanData = { ...data, _updatedAt: new Date().toISOString() };
    await setDoc(ref, cleanData, { merge: true });
    console.log(`[Firestore] ✅ Set ${collectionName}/${docId}`);
    return true;
  } catch (err) {
    console.error(`[Firestore] ❌ Set FAILED ${collectionName}/${docId}:`, err.code, err.message);
    throw err;
  }
};

/**
 * Soft-delete a document
 */
export const softDeleteDocument = async (collectionName, docId) => {
  console.log(`[Firestore] 🗑️ Soft-deleting ${collectionName}/${docId}`);
  try {
    const ref = userDoc(collectionName, docId);
    await updateDoc(ref, { 
      id: `DELETED_${docId}`, 
      name: '[DELETED]',
      _deletedAt: new Date().toISOString() 
    });
    console.log(`[Firestore] ✅ Soft-deleted ${collectionName}/${docId}`);
    return true;
  } catch (err) {
    console.error(`[Firestore] ❌ Delete FAILED ${collectionName}/${docId}:`, err.code, err.message);
    throw err;
  }
};

/**
 * Hard delete a document
 */
export const removeDocument = async (collectionName, docId) => {
  try {
    const ref = userDoc(collectionName, docId);
    await deleteDoc(ref);
    console.log(`[Firestore] ✅ Removed ${collectionName}/${docId}`);
    return true;
  } catch (err) {
    console.error(`[Firestore] ❌ Remove FAILED:`, err.code, err.message);
    throw err;
  }
};

/**
 * Query documents by a field value
 */
export const queryDocuments = async (collectionName, field, value) => {
  try {
    const ref = userCollection(collectionName);
    const q = query(ref, where(field, '==', value));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));
  } catch (err) {
    console.error(`[Firestore] ❌ Query FAILED:`, err.code, err.message);
    return [];
  }
};

/**
 * Batch write multiple documents
 */
export const batchAddDocuments = async (collectionName, documents) => {
  try {
    const batch = writeBatch(db);
    const results = [];
    for (const data of documents) {
      const cleanData = { ...data, _updatedAt: new Date().toISOString() };
      if (data.id) {
        const ref = userDoc(collectionName, data.id);
        batch.set(ref, cleanData);
        results.push({ ...cleanData, _docId: data.id });
      } else {
        const ref = doc(userCollection(collectionName));
        batch.set(ref, cleanData);
        results.push({ ...cleanData, _docId: ref.id });
      }
    }
    await batch.commit();
    console.log(`[Firestore] ✅ Batch wrote ${documents.length} docs to ${collectionName}`);
    return results;
  } catch (err) {
    console.error(`[Firestore] ❌ Batch FAILED:`, err.code, err.message);
    throw err;
  }
};

/**
 * Initialize user document in Firestore (called after first login)
 */
export const initializeUserDoc = async (uid, userInfo) => {
  console.log(`[Firestore] 👤 Initializing user doc for uid: ${uid}`);
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture || '',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
      console.log('[Firestore] ✅ New user document created at users/' + uid);
    } else {
      await updateDoc(userRef, { lastLogin: new Date().toISOString() });
      console.log('[Firestore] ✅ Updated lastLogin for users/' + uid);
    }
    return true;
  } catch (err) {
    console.error('[Firestore] ❌ User doc init FAILED:', err.code, err.message);
    return false;
  }
};
