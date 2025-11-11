/**
 * Photo Management Interfaces
 * For context-aware photo triggering during conversations
 *
 * Reference: docs/technical/reminder-system.md - Photo Context Triggering
 */

export interface Photo {
  id: string;
  userId: string; // Partition key
  blobUrl: string; // Azure Blob Storage URL
  thumbnailUrl?: string; // Optional thumbnail URL
  fileName: string; // Original filename
  uploadedAt: string; // ISO timestamp
  uploadedBy: string; // Family member who uploaded

  // Manual tagging (MVP approach)
  manualTags: string[]; // ["Sarah", "family", "birthday", "garden"]
  caption?: string; // Optional description
  location?: string; // Optional location ("Tel Aviv", "Home garden")
  capturedDate?: string; // ISO timestamp when photo was taken

  // Context triggering metadata
  lastShownAt?: string; // ISO timestamp (for 24-hour cooldown)
  shownCount: number; // How many times displayed
  triggerKeywords?: string[]; // Keywords that triggered this photo
}

export interface PhotoTriggerEvent {
  type: 'photo_trigger';
  photoIds: string[];
  photos: PhotoDisplay[];
  triggerReason: PhotoTriggerReason;
  mentionedNames?: string[];
  context: string; // Conversation context
  emotionalState?: 'neutral' | 'sad' | 'happy' | 'confused' | 'anxious';
}

export interface PhotoDisplay {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  taggedPeople: string[];
  dateTaken?: string;
  location?: string;
}

export type PhotoTriggerReason =
  | 'user_mentioned_family' // User said a family member's name
  | 'user_expressed_sadness' // User said "בודד", "עצוב", "lonely"
  | 'long_conversation_engagement' // 10+ minutes of conversation
  | 'user_requested_photos'; // User explicitly asked to see photos

export interface PhotoQueryOptions {
  taggedPeople?: string[]; // Filter by person names
  keywords?: string[]; // Filter by manual tags/caption
  excludeRecentlyShown?: boolean; // Exclude last 7 days
  limit?: number; // Max photos to return (default: 5)
  sortBy?: 'relevance' | 'recent' | 'least_shown';
}

export interface PhotoMetadataUpdate {
  lastShownAt: string;
  shownCount: number;
  triggerKeywords?: string[];
}
