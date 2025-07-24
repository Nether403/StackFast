/*
 * File: /lib/firebase/admin.ts (DIAGNOSTIC MODE)
 *
 * This file has been temporarily modified to prevent any Firebase initialization
 * during the Vercel build process. This is a diagnostic step to isolate
 * the build-time configuration error.
 */

import { getApps } from 'firebase-admin/app';

let db: any = null; // Start with a null database object

// We create a dummy object to prevent the rest of the app from crashing
// when it tries to access db.collection, etc.
const dummyDb = {
  collection: () => ({
    get: async () => ({
      docs: [],
    }),
  }),
};

// Only try to get the firestore instance if the app is already initialized
// (which it won't be during the build).
if (getApps().length) {
  const { getFirestore } = require('firebase-admin/firestore');
  db = getFirestore();
} else {
  console.log("DIAGNOSTIC MODE: Firebase Admin SDK initialization is SKIPPED during build.");
  db = dummyDb; // Use the dummy object during the build
}

export { db };
