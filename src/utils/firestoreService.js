/**
 * Firestore Service — Primary database operations
 * Data is stored per-user: users/{uid}/{collection}/{docId}
 * 
 * FIXES APPLIED:
 * 1. getUid() accepts optional uid parameter to avoid auth.currentUser race condition
 * 2. Added subscribeToCollection() for real-time onSnapshot listeners
 * 3. Proper error logging with console.error throughout
 */
import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, writeBatch, onSnapshot, orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// ============= HELPERS =============

/** 
 * Get the current user's UID.
 * Accepts an optional explicit uid to avoid race conditions with auth.currentUser.
 */
const getUid = (explicitUid) => {
  if (explicitUid) return explicitUid;
  const user = auth.currentUser;
  console.log('[Firestore] getUid() → auth.currentUser:', user ? `✅ uid=${user.uid}` : '❌ NULL');
  if (!user) throw new Error('Firestore: No authenticated user. auth.currentUser is null.');
  return user.uid;
};

/** Get a reference to a user's sub-collection */
const userCollection = (collectionName, explicitUid) => {
  const uid = getUid(explicitUid);
  const path = `users/${uid}/${collectionName}`;
  console.log('[Firestore] Collection path:', path);
  return collection(db, 'users', uid, collectionName);
};

/** Get a reference to a specific document in a user's sub-collection */
const userDoc = (collectionName, docId, explicitUid) => {
  const uid = getUid(explicitUid);
  const path = `users/${uid}/${collectionName}/${docId}`;
  console.log('[Firestore] Doc path:', path);
  return doc(db, 'users', uid, collectionName, docId);
};

// ============= REAL-TIME SUBSCRIPTIONS =============

/**
 * Subscribe to a user's collection with real-time updates (onSnapshot).
 * Returns an unsubscribe function.
 * 
 * @param {string} collectionName - The Firestore sub-collection name (e.g. 'bills', 'customers')
 * @param {function} callback - Called with (data[]) on each update
 * @param {function} errorCallback - Called with (error) on errors
 * @param {string} [explicitUid] - Optional explicit UID to avoid auth.currentUser race
 * @returns {function} unsubscribe function
 */
export const subscribeToCollection = (collectionName, callback, errorCallback, explicitUid) => {
  try {
    const uid = getUid(explicitUid);
    const ref = collection(db, 'users', uid, collectionName);
    console.log(`[Firestore] 🔴 LIVE subscribing to: users/${uid}/${collectionName}`);

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const data = snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));
      console.log(`[Firestore] 🔴 LIVE update for ${collectionName}: ${data.length} docs`);
      callback(data);
    }, (error) => {
      console.error(`[Firestore] ❌ Snapshot error for ${collectionName}:`, error.message);
      if (errorCallback) errorCallback(error);
    });

    return unsubscribe;
  } catch (err) {
    console.error(`[Firestore] ❌ Failed to subscribe to ${collectionName}:`, err.message);
    if (errorCallback) errorCallback(err);
    return () => {}; // Return no-op unsubscribe
  }
};

/**
 * Subscribe to a specific document with real-time updates.
 */
export const subscribeToDocument = (collectionName, docId, callback, errorCallback, explicitUid) => {
  try {
    const uid = getUid(explicitUid);
    const ref = doc(db, 'users', uid, collectionName, docId);
    console.log(`[Firestore] 🔴 LIVE subscribing to doc: users/${uid}/${collectionName}/${docId}`);

    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...snapshot.data(), _docId: snapshot.id });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`[Firestore] ❌ Doc snapshot error for ${collectionName}/${docId}:`, error.message);
      if (errorCallback) errorCallback(error);
    });

    return unsubscribe;
  } catch (err) {
    console.error(`[Firestore] ❌ Failed to subscribe to doc ${collectionName}/${docId}:`, err.message);
    if (errorCallback) errorCallback(err);
    return () => {};
  }
};

// ============= CRUD OPERATIONS =============

/**
 * Get all documents from a user's collection (one-time read)
 */
export const getCollectionData = async (collectionName) => {
  console.log(`[Firestore] 📖 Reading collection: ${collectionName}`);
  try {
    const uid = getUid();
    // Always treat as a simple collection name — no complex path splitting
    const ref = collection(db, 'users', uid, collectionName);
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
