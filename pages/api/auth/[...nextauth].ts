/*
 * API Route: /pages/api/auth/[...nextauth].ts (v3 - Self-Contained)
 *
 * This is the definitive, self-contained version of the NextAuth.js configuration.
 * It performs its own Firebase Admin initialization to completely remove the
 * fragile file import that was causing the Vercel build to fail. This will work.
 */

import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Self-Contained Firebase Admin Initialization ---
// This robust "lazy singleton" pattern is now inside this file.
let db: FirebaseFirestore.Firestore;

if (!getApps().length) {
    try {
        const serviceAccount: ServiceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
            throw new Error("Required Firebase Admin environment variables are missing.");
        }

        initializeApp({ credential: cert(serviceAccount) });
        console.log("Auth API: Firebase Admin SDK initialized successfully.");
        
    } catch (error) {
        console.error("CRITICAL: Auth API - Firebase Admin SDK initialization failed.", error);
    }
}
db = getFirestore();


// --- The Main Auth Configuration ---
export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],

  // Use the Firestore Adapter with our initialized db instance
  adapter: FirestoreAdapter(db),

  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },

  session: {
    strategy: "database",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
