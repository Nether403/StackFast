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
  trailingSlash: true,
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  /**
   * Environment variables for Netlify deployment
   */
  env: {
    // --- Public Client-Side Variables ---
    ...getPublicFirebaseConfig(),
    
    // --- Server-Side Variables (for Netlify Functions) ---
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    
    // Firebase Admin SDK
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
  },
};

// Log to confirm which project is being used during the build
console.log(`🔧 Building with Firebase Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

module.exports = nextConfig;
