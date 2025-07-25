/*
 * File: /lib/firebase/admin.ts
 *
 * This file contains the robust, production-ready configuration for the
 * Firebase Admin SDK. It uses a "lazy singleton" pattern to ensure that
 * the SDK is initialized only once and only when it's first needed, which
 * is the safest pattern for serverless environments like Vercel.
 */

import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// The singleton instance of the Firestore database
let db: FirebaseFirestore.Firestore;

// The singleton instance of the initialized Firebase app
let app;

// This function handles the initialization process
function initializeFirebaseAdmin() {
    // Only initialize if it hasn't been done already
    if (!getApps().length) {
        console.log("Initializing Firebase Admin SDK for the first time...");
        try {
            // Check if the service account key is provided
            if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing.");
            }

            // Decode the Base64 encoded service account key
            const serviceAccountKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
            const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);

            app = initializeApp({
                credential: cert(serviceAccount)
            });
            
            db = getFirestore(app);
            console.log("Firebase Admin SDK initialized successfully.");

        } catch (error) {
            console.error("CRITICAL: Firebase Admin SDK initialization failed.", error);
            throw new Error("Could not initialize Firebase Admin SDK. Check server logs.");
        }
    } else {
        // If already initialized, get the default app instance
        app = getApps()[0];
        db = getFirestore(app);
    }
}

initializeFirebaseAdmin();

// Export the initialized database instance for use in your API routes
export { db };
