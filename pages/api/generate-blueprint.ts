/*
 * API Route: /api/generate-blueprint.ts (v7 - Lazy Initialization)
 *
 * This version implements a lazy initialization pattern for all external services.
 * This is the most robust method for serverless environments like Vercel,
 * ensuring that services are initialized only when the function is invoked.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, QuerySnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ToolProfile, GeminiAnalysis } from '../../types';

// --- 1. Lazy Initializer for Services ---
let db: FirebaseFirestore.Firestore;
let model: any;

function initializeServices() {
    // This function will only run if services haven't been initialized yet.
    if (!getApps().length) {
        console.log("Initializing services for the first time...");
        try {
            // --- Firebase Admin Initialization ---
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            if (!serviceAccountKey) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not set.");
            
            const decodedServiceAccount = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
            const serviceAccount: ServiceAccount = JSON.parse(decodedServiceAccount);

            if (!serviceAccount['project_id']) throw new Error("Parsed service account is missing 'project_id'.");

            initializeApp({ credential: cert(serviceAccount) });
            db = getFirestore();
            console.log("Firebase Admin SDK initialized successfully.");

            // --- Gemini Initialization ---
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) throw new Error("GOOGLE_API_KEY is not set.");
            
            const genAI = new GoogleGenerativeAI(apiKey);
            model = genAI.getGenerativeModel({ model: "gemini-pro" });
            console.log("Gemini SDK initialized successfully.");

        } catch (error) {
            console.error("CRITICAL: Service initialization failed.", error);
            // Re-throw to be caught by the handler
            throw error;
        }
    } else {
        // If already initialized, just get the instances
        console.log("Services already initialized. Reusing instances.");
        db = getFirestore();
        // The 'model' variable is already set from the first initialization
    }
}


// --- 2. Gemini Analysis Function (no changes) ---
async function analyzeProjectWithGemini(projectIdea: string): Promise<GeminiAnalysis> {
    const prompt = `Analyze the following project idea...`; // Prompt remains the same
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return { features: [], technologies: [], complexity: 'Moderate' };
    }
}

// --- 3. Main API Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    try {
        // **KEY CHANGE**: Ensure services are initialized at the start of each request.
        initializeServices();
    } catch (error) {
        console.error("Service initialization check failed in handler:", error);
        return res.status(500).json({ error: "Server services failed to initialize. Check environment variables and logs." });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: "Unauthorized." });
    
    const { projectIdea, skillProfile, preferredToolIds = [] } = req.body;
    if (!projectIdea) return res.status(400).json({ error: "projectIdea is required." });

    try {
        const analysis = await analyzeProjectWithGemini(projectIdea);
        const collectionNames = ['ai_models_and_apis', 'coding_tools', 'databases', 'deployment_platforms'];
        
        const snapshots = await Promise.all(collectionNames.map(name => db.collection(name).get()));
        
        const allTools: ToolProfile[] = snapshots.flatMap((snapshot: QuerySnapshot) => 
            snapshot.docs.map((doc: QueryDocumentSnapshot) => doc.data() as ToolProfile)
        );

        let selectedTools: ToolProfile[] = allTools.filter(t => preferredToolIds.includes(t.id));
        let remainingTools = allTools.filter(t => !preferredToolIds.includes(t.id));

        const scoredTools = remainingTools.map(tool => {
            let score = 0;
            // ... scoring logic remains the same
            return { ...tool, score };
        }).sort((a, b) => b.score - a.score);

        const essentialCategories = ['Language Model', 'Database', 'Deployment Platform'];
        for (const category of essentialCategories) {
            if (!selectedTools.some(t => t.category === category)) {
                const bestFit = scoredTools.find(t => t.category === category && !selectedTools.some(s => s.id === t.id));
                if (bestFit) selectedTools.push(bestFit);
            }
        }
        
        if (!selectedTools.some(t => t.category === 'Code Generation')) {
            const codeGen = scoredTools.find(t => t.category === 'Code Generation' && !selectedTools.some(s => s.id === t.id));
            if (codeGen) selectedTools.push(codeGen);
        }

        const finalStack = Array.from(new Map(selectedTools.map(item => [item['id'], item])).values())
            .map(({ score, ...rest }) => rest);

        const blueprint = {
            summary: `AI-powered blueprint for "${projectIdea}". Detected complexity: ${analysis.complexity}.`,
            recommendedStack: finalStack,
            warnings: [
                { type: "AI Analysis", message: `Identified key features: ${analysis.features.join(', ')}.` },
                { type: "AI Analysis", message: `Required technologies: ${analysis.technologies.join(', ')}.` }
            ],
        };

        res.status(200).json(blueprint);

    } catch (error) {
        console.error("Blueprint generation failed:", error);
        res.status(500).json({ error: "An internal server error occurred during blueprint generation." });
    }
}
