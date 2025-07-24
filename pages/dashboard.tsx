/*
 * File: pages/dashboard.tsx (Ultimate Diagnostic Version)
 *
 * This page has ZERO project dependencies. It only reads from `process.env`
 * to definitively test if Vercel is providing the environment variables to the server.
 */

import type { GetServerSideProps, NextPage } from 'next';

interface PageProps {
  nextAuthSecretExists: boolean;
  firebaseKeyExists: boolean;
  googleApiKeyExists: boolean;
  firebaseKeyIsParsable: boolean;
}

const UltimateDebugPage: NextPage<PageProps> = (props) => {
  const renderStatus = (success: boolean) => 
    success 
      ? <span style={{ color: 'green', fontWeight: 'bold' }}>✅ Found</span>
      : <span style={{ color: 'red', fontWeight: 'bold' }}>❌ Missing or Invalid</span>;

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', lineHeight: '1.8' }}>
      <h1>Vercel Environment Variable Diagnostic</h1>
      <p>This page directly tests the environment variables on the server.</p>
      
      <hr style={{ margin: '1rem 0' }} />

      <h3>NextAuth Configuration:</h3>
      <p>
        <code>NEXTAUTH_SECRET</code>: {renderStatus(props.nextAuthSecretExists)}
      </p>

      <hr style={{ margin: '1rem 0' }} />

      <h3>Firebase Configuration:</h3>
      <p>
        <code>FIREBASE_SERVICE_ACCOUNT_KEY</code> (Exists): {renderStatus(props.firebaseKeyExists)}
      </p>
      <p>
        <code>FIREBASE_SERVICE_ACCOUNT_KEY</code> (Parsable): {renderStatus(props.firebaseKeyIsParsable)}
      </p>
      
      <hr style={{ margin: '1rem 0' }} />

      <h3>Google AI Configuration:</h3>
      <p>
        <code>GOOGLE_API_KEY</code>: {renderStatus(props.googleApiKeyExists)}
      </p>

      <hr style={{ margin: '1rem 0' }} />

      <h3>Conclusion:</h3>
      {!props.nextAuthSecretExists && <p style={{color: 'red'}}><b>Critical Failure:</b> The NEXTAUTH_SECRET is missing. This is the cause of the `getServerSession` error.</p>}
      {!props.firebaseKeyIsParsable && <p style={{color: 'red'}}><b>Critical Failure:</b> The Firebase key exists but is not valid Base64/JSON. This will cause database connection errors.</p>}
      {(props.nextAuthSecretExists && props.firebaseKeyIsParsable) && <p style={{color: 'green'}}><b>Success:</b> All critical environment variables were found and are correctly formatted. The issue lies elsewhere.</p>}
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Test 1: Check for NEXTAUTH_SECRET
  const nextAuthSecretExists = !!process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length > 1;

  // Test 2: Check for GOOGLE_API_KEY
  const googleApiKeyExists = !!process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 1;

  // Test 3: Check for Firebase key and its parsability
  const firebaseKeyExists = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let firebaseKeyIsParsable = false;
  if (firebaseKeyExists) {
    try {
      const decodedKey = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, 'base64').toString('utf-8');
      const parsedKey = JSON.parse(decodedKey);
      // Check for a key property that should exist in the parsed JSON
      if (parsedKey.project_id) {
        firebaseKeyIsParsable = true;
      }
    } catch (e) {
      firebaseKeyIsParsable = false;
    }
  }

  return {
    props: {
      nextAuthSecretExists,
      firebaseKeyExists,
      googleApiKeyExists,
      firebaseKeyIsParsable,
    },
  };
};

export default UltimateDebugPage; 