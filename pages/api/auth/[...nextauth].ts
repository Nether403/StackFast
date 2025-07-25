/*
 * API Route: /pages/api/auth/[...nextauth].ts (v4 - Definitive & Robust)
 *
 * This is the final, production-ready version of the NextAuth.js configuration.
 * It includes a crucial pre-check to ensure the Firestore database is connected
 * before initializing the adapter, providing better error handling and diagnostics.
 */

import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { NextApiRequest, NextApiResponse } from 'next';

// --- Self-Contained Firebase Admin Initialization ---
let db: FirebaseFirestore.Firestore | undefined;

// This function is designed to be safe to call multiple times.
function initializeFirebase() {
    if (!getApps().length) {
        try {
            console.log("Auth API: Initializing Firebase Admin SDK...");
            
            // Check if the service account key is provided
            if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
                throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing.");
            }

            // Decode the Base64 encoded service account key
            const serviceAccountKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
            const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);

            initializeApp({ credential: cert(serviceAccount) });
            console.log("Auth API: Firebase Admin SDK initialized successfully.");
        } catch (error) {
            console.error("CRITICAL: Auth API - Firebase Admin SDK initialization failed.", error);
            // Do not proceed if Firebase fails to initialize.
            return;
        }
    }
    db = getFirestore();
}

initializeFirebase();

// --- The Main Auth Configuration ---
export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],

  // Use the Firestore Adapter with our initialized db instance
  // Add a check to ensure db is valid before creating the adapter
  adapter: db ? FirestoreAdapter(db) : undefined,

  callbacks: {
    async session({ session, user }) {
      if (session?.user && (user as any)?.id) {
        (session.user as any).id = (user as any).id;
      }
      return session;
    },
    // **NEW**: Add a signIn callback for better debugging
    async signIn({ user, account, profile }) {
        if (!db) {
            console.error("SignIn Blocked: Database is not connected.");
            return false; // This will prevent sign-in if the DB is down
        }
        console.log(`User attempting to sign in: ${user.email}`);
        return true; // Continue the sign-in process
    }
  },

  session: {
    strategy: "database",
  },

  secret: process.env.NEXTAUTH_SECRET,

  // **NEW**: Add a debug flag for more verbose logs in development
  debug: process.env.NODE_ENV === 'development',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // **NEW**: Add a pre-handler check to provide a clearer error message
    if (!db) {
        console.error("NextAuth handler failed: Database service is not available.");
        return res.status(500).json({ error: "Authentication service is not properly configured. Check server logs." });
    }
    return await NextAuth(req, res, authOptions);
}
