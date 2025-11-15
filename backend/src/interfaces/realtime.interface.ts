/**
 * Realtime API Interfaces
 * Types for Azure OpenAI Realtime API integration
 * Reference: docs/technical/realtime-api-integration.md
 */

export interface RealtimeSessionConfig {
  userId: string;
  voice?: 'alloy' | 'echo' | 'shimmer';
  language?: string;
  maxDuration?: number; // seconds
}

export interface RealtimeSession {
  id: string;
  userId: string;
  conversationId: string;
  startedAt: string;
  status: 'active' | 'ended' | 'error';
  turnCount: number;
  tokenUsage: number;
}

export interface FunctionCallResult {
  functionName: string;
  arguments: any;
  result: any;
  timestamp: string;
}

export interface SystemPromptContext {
  userName: string;
  userAge: number;
  userGender: 'male' | 'female'; // CRITICAL: Used for Hebrew grammar conjugation
  language: string;
  cognitiveMode: string;
  familyMembers: Array<{ name: string; relationship: string }>;
  safetyRules: any;
  medications: Array<{ name: string; dosage: string; time: string }>; // Changed times[] to time (singular)
  memories: {
    shortTerm: any[];
    working: any;
    longTerm: any[];
  };
  musicPreferences?: any; // Optional: User's music preferences
}

export interface AudioChunk {
  delta: string; // base64 encoded audio
  timestamp: string;
}

export interface TranscriptEvent {
  role: 'user' | 'assistant';
  transcript: string;
  timestamp: string;
  itemId: string;
}
