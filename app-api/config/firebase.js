const admin = require('firebase-admin');
const path = require('path');

let db, auth;

const initializeFirebase = async () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase already initialized');
      db = admin.firestore();
      auth = admin.auth();
      return { admin, db, auth };
    }

    const serviceAccount = (() => {
      const rawValue = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
      if (!rawValue) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required but missing. Provide the minified JSON or base64-encoded JSON in your environment.');
      }

      const maybeDecoded = rawValue.startsWith('{')
        ? rawValue
        : Buffer.from(rawValue, 'base64').toString('utf8');

      try {
        return JSON.parse(maybeDecoded);
      } catch (error) {
        console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON value. Make sure it is valid JSON or base64 encoded JSON.');
        throw error;
      }
    })();
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://vizidot-4b492.firebaseio.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'vizidot-4b492'
    });

    db = admin.firestore();
    auth = admin.auth();

    // Configure Firestore settings
    db.settings({
      ignoreUndefinedProperties: true
    });

    console.log('Firebase Admin SDK initialized successfully');
    return { admin, db, auth };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

const getFirebaseInstance = () => {
  if (!db || !auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return { admin, db, auth };
};

// Firebase utility functions
const firebaseUtils = {
  // Create a new document with auto-generated ID
  createDocument: async (collection, data) => {
    const { db } = getFirebaseInstance();
    const docRef = await db.collection(collection).add({
      ...data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return docRef;
  },

  // Update a document
  updateDocument: async (collection, docId, data) => {
    const { db } = getFirebaseInstance();
    await db.collection(collection).doc(docId).update({
      ...data,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  },

  // Get a document
  getDocument: async (collection, docId) => {
    const { db } = getFirebaseInstance();
    const doc = await db.collection(collection).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  // Get all documents in a collection
  getCollection: async (collection, orderBy = null, limit = null) => {
    const { db } = getFirebaseInstance();
    let query = db.collection(collection);
    
    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Delete a document
  deleteDocument: async (collection, docId) => {
    const { db } = getFirebaseInstance();
    await db.collection(collection).doc(docId).delete();
  },

  // Set up real-time listener
  setupRealtimeListener: (collection, docId, callback) => {
    const { db } = getFirebaseInstance();
    return db.collection(collection).doc(docId).onSnapshot(callback);
  },

  // Batch operations
  batch: () => {
    const { db } = getFirebaseInstance();
    return db.batch();
  },

  // Create timestamp
  timestamp: () => {
    return admin.firestore.FieldValue.serverTimestamp();
  },

  // Array operations
  arrayUnion: (...elements) => {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  },

  arrayRemove: (...elements) => {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  },

  // Increment operations
  increment: (value) => {
    return admin.firestore.FieldValue.increment(value);
  }
};

module.exports = {
  initializeFirebase,
  getFirebaseInstance,
  firebaseUtils
};

