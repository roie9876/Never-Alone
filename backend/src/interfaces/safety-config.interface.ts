/**
 * Safety Configuration Interfaces
 * Used for storing and loading user-specific safety rules from onboarding
 */

/**
 * Emergency Contact Information
 */
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

/**
 * Medication Schedule
 */
export interface Medication {
  name: string;
  dosage: string;
  time: string; // HH:MM format
  specialInstructions?: string;
}

/**
 * Daily Routine Times
 */
export interface DailyRoutine {
  wakeTime: string;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  sleepTime: string;
}

/**
 * Conversation Boundaries
 */
export interface ConversationBoundaries {
  forbiddenTopics: string[];
  notes?: string;
}

/**
 * Crisis Trigger Configuration
 */
export interface CrisisTrigger {
  keyword: string;
  severity: 'critical' | 'high' | 'medium';
  action: string;
}

/**
 * Complete Safety Configuration (from Cosmos DB)
 */
export interface SafetyConfig {
  id: string;
  userId: string;
  emergencyContacts: EmergencyContact[];
  medications: Medication[];
  routines: DailyRoutine;
  boundaries: ConversationBoundaries;
  crisisTriggers: CrisisTrigger[];
  yamlConfig?: string; // Generated YAML string
  createdAt: string;
  updatedAt: string;
}

/**
 * Alert Details when crisis trigger detected
 */
export interface SafetyAlert {
  id: string;
  userId: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium';
  triggerKeyword: string;
  triggerAction: string;
  transcript: string;
  conversationId?: string;
  notificationsSent: Array<{
    contactName: string;
    contactPhone: string;
    method: 'sms' | 'call' | 'push';
    sentAt: string;
    acknowledged: boolean;
    acknowledgedAt?: string;
  }>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Crisis Detection Result
 */
export interface CrisisDetectionResult {
  detected: boolean;
  matchedTriggers: CrisisTrigger[];
  transcript: string;
  detectedAt: string;
}
