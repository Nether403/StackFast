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
            const serviceAccount: ServiceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Crucially, handle newlines
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            };

            // Validate that the essential parts exist
            if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
                throw new Error("One or more required Firebase environment variables are missing (PROJECT_ID, PRIVATE_KEY, CLIENT_EMAIL).");
            }

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
