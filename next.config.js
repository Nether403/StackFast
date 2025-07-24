/** @type {import('next').NextConfig} */

// This function correctly reads the PUBLIC client-side Firebase variables.
// The NEXT_PUBLIC_ prefix is required by Next.js to expose these to the browser.
const getPublicFirebaseConfig = () => {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
};

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  /**
   * This `env` block now correctly provides BOTH the public client-side keys
   * (via the getPublicFirebaseConfig function) AND the private server-side keys
   * that our API routes and authentication need. This is the definitive fix.
   */
  env: {
    // --- Public Client-Side Variables ---
    ...getPublicFirebaseConfig(),
    
    // --- Private Server-Side Variables ---
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    
    // Firebase Admin SDK (Separate Components)
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY_ID: process.env.FIREBASE_PRIVATE_KEY_ID,
    FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
  },
};

// Log to confirm which project is being used during the build
console.log(`🔧 Building with Firebase Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

module.exports = nextConfig;
