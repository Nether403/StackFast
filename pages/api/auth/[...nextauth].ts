/*
 * API Route: /pages/api/auth/[...nextauth].ts
 *
 * This version contains the definitive fix for the "Module not found" build error
 * by correcting the import path for the Firebase admin configuration.
 */

import NextAuth, { type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { FirestoreAdapter } from "@auth/firebase-adapter";
// --- THE CRITICAL FIX ---
// The import path has been corrected to correctly locate the admin file.
import { db } from "../../../lib/firebase/admin"; 

// The authOptions object is exported so it can be used by getServerSession
export const authOptions: NextAuthOptions = {
  // 1. Configure the Authentication Provider (GitHub)
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
  ],

  // 2. Use the Firestore Adapter
  adapter: FirestoreAdapter(db),

  // 3. Define Callbacks
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },

  // 4. Session Strategy
  session: {
    strategy: "database",
  },

  // 5. Explicitly define the secret
  secret: process.env.NEXTAUTH_SECRET,
};

// The main export is the NextAuth handler, which uses our options
export default NextAuth(authOptions);
