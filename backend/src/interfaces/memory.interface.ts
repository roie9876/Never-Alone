/**
 * Memory-related TypeScript interfaces
 * Based on memory-architecture.md specifications
 */

export interface ConversationTurn {
  turnId?: number;
  role: 'user' | 'assistant' | 'system';
  timestamp: string; // ISO 8601 format
  transcript: string;
  audioItemId?: string;
  audioUrl?: string; // null for MVP (audio deleted)
  emotion?: {
    primary: string;
    confidence: number;
  };
}

export interface WorkingMemory {
  lastUpdated: string;
  recentThemes: string[]; // Last 5 conversation topics
  recentMood: 'happy' | 'sad' | 'anxious' | 'neutral';
  recentActivities: string[]; // What user did in last 3 days
  upcomingEvents: string[]; // Appointments, visits
}

export type MemoryCategory =
  | 'family_info'
  | 'medical_info'
  | 'preferences'
  | 'routine'
  | 'personal_history';

export interface LongTermMemory {
  id: string; // UUID
  userId: string; // Partition key
  memoryType: MemoryCategory;
  key: string; // Searchable key (e.g., "granddaughter_sarah_job")
  value: string; // The actual memory content
  extractedAt: string; // ISO timestamp
  context: string; // Conversation context when extracted
  importance: 'high' | 'medium' | 'low';
  confidence: number; // 0.0 - 1.0 (how sure AI is)
  lastAccessed?: string; // ISO timestamp
  accessCount: number; // How many times used
  tags?: string[]; // Optional tags for better search
}

export interface MemoryLoadResult {
  shortTerm: ConversationTurn[];
  working: WorkingMemory | null;
  longTerm: LongTermMemory[];
}

export interface ExtractMemoryArgs {
  memory_type: MemoryCategory;
  key: string;
  value: string;
  context?: string;
  importance: 'high' | 'medium' | 'low';
}
