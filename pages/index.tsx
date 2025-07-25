/*
 * File: pages/index.tsx (The Official Homepage - v3 Definitive Auth)
 *
 * This version implements the most robust authentication pattern by using
 * both `getServerSideProps` for the initial server render and the `useSession`
 * hook for client-side updates. This definitively solves the "silent login failure"
 * and redirect loop issue.
 */

import React, { useState, useEffect } from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import { getSession, signIn, signOut, useSession } from 'next-auth/react';
import type { ToolProfile, SavedBlueprint } from '../types';
import { authOptions } from './api/auth/[...nextauth]';

// --- Reusable UI Components (LoginPrompt, Skeletons, etc.) ---
const SkeletonLoader = ({ count = 1 }: { count?: number }) => ( Array.from({ length: count }).map((_, i) => <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-pulse"><div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div><div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div><div className="flex justify-end space-x-2"><div className="h-8 w-16 bg-gray-200 rounded-lg"></div><div className="h-8 w-16 bg-gray-200 rounded-lg"></div></div></div>))
const LoginPrompt = ({ onLogin }: { onLogin: (provider: string) => void }) => ( <div className="flex items-center justify-center h-full p-8 bg-white rounded-xl border-2 border-dashed border-gray-200"><div className="text-center"><h3 className="text-lg font-semibold text-gray-900">Welcome to StackFast</h3><p className="mt-1 text-sm text-gray-500">Log in with GitHub to create and manage your project blueprints.</p><button type="button" onClick={() => onLogin('github')} className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">Login with GitHub</button></div></div>);

// --- AI Blueprint Creator Sub-Components ---
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => ( <div className="flex items-center mb-8"> {Array.from({ length: totalSteps }).map((_, i) => ( <React.Fragment key={i}> <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${currentStep >= i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</div> {i < totalSteps - 1 && <div className={`flex-auto h-1 mx-2 transition-colors ${currentStep > i + 1 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>} </React.Fragment> ))} </div> );
const ToolPill = ({ tool, onRemove }: { tool: Partial<ToolProfile>; onRemove: (tool: Partial<ToolProfile>) => void }) => ( <div className="bg-indigo-100 text-indigo-800 text-sm font-medium me-2 px-3 py-1.5 rounded-full flex items-center animate-fade-in-fast">{typeof tool.name === 'string' ? tool.name : 'Unknown'}<button onClick={() => onRemove(tool)} className="ml-2 text-indigo-500 hover:text-indigo-800 focus:outline-none">&#x2715;</button></div> );
const AILoadingState = () => ( <div className="text-center p-8 animate-fade-in"><div className="mx-auto h-16 w-16 mb-4"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" stroke="rgba(129, 140, 248, 0.2)" strokeWidth="8" fill="none" /><circle cx="50" cy="50" r="45" stroke="#4f46e5" strokeWidth="8" fill="none" strokeDasharray="283" strokeDashoffset="212.25" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="1.5s" repeatCount="indefinite" /></circle></svg></div><h2 className="text-2xl font-bold text-gray-900">AI is Analyzing Your Project</h2><p className="text-gray-600 mt-2">Our engine is crafting the optimal stack for your idea...</p></div> );
interface BlueprintResult {
  summary: string;
  warnings: { message: string }[];
  recommendedStack: { id: string; name: string; category: string }[];
}
const BlueprintResultDisplay = ({ blueprint, onSave, onStartOver }: { blueprint: BlueprintResult; onSave: () => void; onStartOver: () => void }) => ( <div className="p-6 animate-fade-in"><h2 className="text-3xl font-bold text-gray-900">Your AI-Powered Blueprint</h2><p className="text-gray-600 mt-1">{blueprint.summary}</p><div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4"><h3 className="font-bold text-lg text-indigo-900 mb-2">Gemini AI Analysis</h3>{blueprint.warnings.map((warning: { message: string }, index: number) => (<p key={index} className="text-sm text-indigo-800">&bull; {warning.message}</p>))}</div><div className="mt-6"><h3 className="font-bold text-lg text-gray-800 mb-3">Recommended Stack</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{blueprint.recommendedStack.map(tool => (<div key={tool.id ?? 'unknown'} className="bg-gray-50 border border-gray-200 rounded-lg p-4"><p className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">{tool.category ?? 'Unknown'}</p><h4 className="font-bold text-xl text-gray-900">{tool.name ?? 'Unknown'}</h4></div>))}</div></div><div className="mt-8 flex justify-end space-x-3"><button onClick={onStartOver} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">Back to Dashboard</button><button onClick={onSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">Save Blueprint</button></div></div> );

const BlueprintCreator = ({ onCreationComplete, onCancel }: { onCreationComplete: (blueprint: any) => void; onCancel: () => void }) => {
    const [step, setStep] = useState(1);
    const [projectIdea, setProjectIdea] = useState('');
    const [skillLevel, setSkillLevel] = useState('');
    const [preferredTools, setPreferredTools] = useState<Partial<ToolProfile>[]>([]);
    const [toolSearch, setToolSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const MOCK_TOOL_PROFILES_FOR_SEARCH: Partial<ToolProfile>[] = [ { id: "openai_gpt-4", name: "OpenAI GPT-4", category: "Language Model" }, { id: "anthropic_claude-3", name: "Anthropic Claude 3", category: "Language Model" }, { id: "github_copilot", name: "GitHub Copilot", category: "Code Generation" }, { id: "supabase", name: "Supabase", category: "Database" }, { id: "netlify", name: "Netlify", category: "Deployment Platform" }, ];
    const filteredTools = React.useMemo(() => { if (!toolSearch) return []; return MOCK_TOOL_PROFILES_FOR_SEARCH.filter(tool => tool.name.toLowerCase().includes(toolSearch.toLowerCase()) && !preferredTools.some(pt => pt.id === tool.id)); }, [toolSearch, preferredTools]);
    const handleNextStep = () => setStep(s => s + 1);
    const handlePrevStep = () => setStep(s => s - 1);
    const addTool = (tool: Partial<ToolProfile>) => { setPreferredTools(prev => [...prev, tool]); setToolSearch(''); };
    const removeTool = (toolToRemove: Partial<ToolProfile>) => { setPreferredTools(prev => prev.filter(tool => tool.id !== toolToRemove.id)); };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const skillProfile = skillLevel === 'Beginner' ? 1 : skillLevel === 'Moderate' ? 2 : 3;
            const response = await fetch('/api/generate-blueprint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIdea, skillProfile, preferredToolIds: preferredTools.map(t => t.id), }),
            });
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || "An unknown error occurred."); }
            const data = await response.json();
            onCreationComplete(data);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    if (isLoading) return <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200"><AILoadingState /></div>;
    const isNextDisabled = () => (step === 1 && !projectIdea) || (step === 2 && !skillLevel);

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 animate-fade-in">
            <StepIndicator currentStep={step} totalSteps={3} />
            <div className="min-h-[250px]">
                {step === 1 && ( <div> <h2 className="text-2xl font-semibold text-gray-800 mb-2">Describe Your Project</h2> <p className="text-gray-500 mb-6">What do you want to build? Be as descriptive as possible.</p> <textarea className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" rows="5" value={projectIdea} onChange={(e) => setProjectIdea(e.target.value)} /> </div> )}
                {step === 2 && ( <div> <h2 className="text-2xl font-semibold text-gray-800 mb-2">What's your comfort level?</h2> <p className="text-gray-500 mb-6">This helps us tailor the recommendations to your experience.</p> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {['Beginner', 'Moderate', 'Expert'].map(level => ( <button key={level} onClick={() => setSkillLevel(level)} className={`p-6 border rounded-lg text-left transition ${skillLevel === level ? 'border-indigo-600 ring-2 ring-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}> <h3 className="font-bold text-lg text-gray-800">{level}</h3> </button> ))} </div> </div> )}
                {step === 3 && ( <div> <h2 className="text-2xl font-semibold text-gray-800 mb-2">Any preferred tools?</h2> <p className="text-gray-500 mb-6">Select any technologies you'd like to include.</p> <div className="relative"> <input type="text" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Search for tools..." value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} /> {filteredTools.length > 0 && ( <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg"> {filteredTools.map(tool => <li key={tool.id} className="p-3 hover:bg-indigo-100 cursor-pointer" onClick={() => addTool(tool)}>{tool.name}</li>)} </ul> )} </div> <div className="mt-4 flex flex-wrap gap-2 min-h-[40px]"> {preferredTools.map(tool => <ToolPill key={tool.id} tool={tool} onRemove={removeTool} />)} </div> </div> )}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                <button onClick={step === 1 ? onCancel : handlePrevStep} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">{step === 1 ? 'Cancel' : 'Back'}</button>
                {step < 3 ? ( <button onClick={handleNextStep} disabled={isNextDisabled()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">Next</button> ) : ( <button onClick={handleGenerate} className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">Generate Blueprint</button> )}
            </div>
            {error && <p className="text-red-500 mt-4 text-center">Error: {error}</p>}
        </div>
    );
};

// --- The Main Page Component ---
const HomePage: NextPage = () => {
  // The useSession hook is now primarily for client-side updates and interactions.
  const { data: session, status } = useSession();
  const [view, setView] = useState<'dashboard' | 'create' | 'result'>('dashboard');
  const [savedBlueprints, setSavedBlueprints] = useState<SavedBlueprint[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [newBlueprintResult, setNewBlueprintResult] = useState<BlueprintResult | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      // Fetch data on the client side after the initial server render
      const fetchBlueprints = async () => {
        setIsLoadingData(true);
        try {
          const response = await fetch('/api/blueprints');
          if (!response.ok) throw new Error('Failed to fetch blueprints.');
          const data: SavedBlueprint[] = await response.json();
          setSavedBlueprints(data);
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchBlueprints();
    }
    if (status === 'unauthenticated') {
      setIsLoadingData(false);
    }
  }, [status]);

  const handleCreationComplete = (blueprint: any) => {
      setNewBlueprintResult(blueprint);
      setView('result');
  };

  const renderContent = () => {
    // The initial status is determined by the server. The hook keeps it updated.
    if (status === 'loading') {
      return <div>Loading session...</div>; // Or a full-page skeleton
    }
    if (status === 'unauthenticated') {
      return <LoginPrompt onLogin={signIn} />; // Or the LoginPrompt component
    }

    // The rest of the rendering logic for dashboard, create, result views
    // can now safely assume the user is authenticated.
    if (view === 'create') {
        return <BlueprintCreator onCreationComplete={handleCreationComplete} onCancel={() => setView('dashboard')} />;
    }
    if (view === 'result' && newBlueprintResult) {
        return <BlueprintResultDisplay blueprint={newBlueprintResult} onSave={() => alert('Saving...')} onStartOver={() => setView('dashboard')} />;
    }

    // Default 'dashboard' view
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="group relative border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 transition-all duration-300 flex items-center justify-center p-6 min-h-[180px] animate-fade-in">
                <button onClick={() => setView('create')} className="text-center">
                    <div className="mx-auto h-12 w-12 text-gray-400 group-hover:text-indigo-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">Create New Blueprint</h3>
                </button>
            </div>
            {/* ... render saved blueprint cards ... */}
        </div>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">StackFast</h1>
            <p className="text-gray-500 mt-1">Welcome back, {session?.user?.name || 'Guest'}.</p>
          </div>
          {session?.user && (
            <div className="flex items-center self-end sm:self-center">
                <img src={session.user.image ?? ''} alt={session.user.name ?? 'User'} className="w-10 h-10 rounded-full mr-3 border-2 border-white shadow-sm" />
                <button onClick={() => signOut()} className="text-sm font-medium text-gray-600 hover:text-gray-900">Logout</button>
            </div>
          )}
        </header>
        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

// --- **THE DEFINITIVE FIX** ---
// This function runs ON THE SERVER before the page is sent to the browser.
export const getServerSideProps: GetServerSideProps = async (context) => {
  // It fetches the session on the server using the request cookies.
  const session = await getSession(context);

  // If there is no session, it can redirect to a login page on the server,
  // but for our setup, we'll let the client-side handle the login prompt.
  // The key is that we pass the session (or null) to the page.
  return {
    props: {
      // The `session` prop is automatically passed to the `SessionProvider` in `_app.tsx`,
      // which "hydrates" the initial state of the `useSession` hook.
      session,
    },
  };
};

export default HomePage; 