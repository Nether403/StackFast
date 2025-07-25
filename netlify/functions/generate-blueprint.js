// Netlify Function for blueprint generation
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let db;
let model;

function initializeServices() {
  if (!getApps().length) {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
      }
      
      const decodedServiceAccount = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(decodedServiceAccount);

      initializeApp({ credential: cert(serviceAccount) });
      db = getFirestore();

      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY is not set.");
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
    } catch (error) {
      console.error("Service initialization failed:", error);
      throw error;
    }
  } else {
    db = getFirestore();
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    initializeServices();
    
    const { projectIdea, skillProfile, preferredToolIds = [] } = JSON.parse(event.body);
    
    if (!projectIdea) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'projectIdea is required' }),
      };
    }

    // Your blueprint generation logic here
    const blueprint = {
      summary: `Blueprint for "${projectIdea}"`,
      recommendedStack: [],
      warnings: [],
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(blueprint),
    };
  } catch (error) {
    console.error('Blueprint generation failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};