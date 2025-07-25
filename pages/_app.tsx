/*
 * File: pages/_app.tsx
 *
 * This is the main application wrapper. The most critical part is wrapping
 * the entire application in the `<SessionProvider>`. This makes the user's
 * session available to all pages and components via the `useSession` hook,
 * which is the definitive fix for the "silent login failure" issue.
 */

import '../styles/globals.css'; // Assuming you have a global CSS file
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    // The SessionProvider must wrap the entire application.
    // It takes the session from the page props, which is provided by getServerSideProps.
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp; 