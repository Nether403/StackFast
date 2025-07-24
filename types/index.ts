/*
 * Shared TypeScript Types
 *
 * This file serves as the single source of truth for the core data structures
 * used across the StackFast application, both in the frontend and backend.
 */

export interface ToolProfile {
  id: string;
  name: string;
  category: string;
  skills: { setup: number; daily: number };
  notableStrengths?: string[];
  integrations?: string[];
  popularity_score?: number;
  [key: string]: any; // Allow other properties
}

export interface GeminiAnalysis {
  features: string[];
  technologies: string[];
  complexity: 'Low' | 'Moderate' | 'High';
}

// We can add other shared types here as the application grows,
// for example, the structure of a saved Blueprint or an Organizer Task. 