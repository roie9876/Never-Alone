/**
 * User-related TypeScript interfaces
 * Based on onboarding-flow.md and safety configuration
 */

export interface User {
  id: string; // UUID
  userId: string; // Partition key
  personalInfo: PersonalInfo;
  familyMembers: FamilyMember[];
  safetyRules: SafetyRules;
  cognitiveMode: 'dementia' | 'elderly' | 'standard';
  aiName: string; // Name of AI companion (default: "Nora")
  createdAt: string;
  updatedAt: string;
}

export interface PersonalInfo {
  name: string;
  age: number;
  language: string; // ISO 639-1 code (e.g., "he" for Hebrew)
  timezone: string; // IANA timezone (e.g., "Asia/Jerusalem")
  address?: string;
}

export interface FamilyMember {
  name: string;
  relationship: string; // "daughter", "son", "spouse", etc.
  phone: string;
  email?: string;
  isPrimaryContact: boolean;
  notificationPreferences: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
}

export interface SafetyRules {
  neverAllow: SafetyRule[];
  redirectToFamily: string[]; // Activities that require family approval
  approvedActivities: string[]; // Safe activities AI can suggest
  crisisTriggers: string[]; // Keywords that trigger immediate alerts
  forbiddenTopics: string[]; // Topics to avoid in conversation
}

export interface SafetyRule {
  rule: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface SafetyIncident {
  id: string;
  userId: string;
  timestamp: string;
  incidentType: string;
  severity: 'critical' | 'high' | 'medium';
  conversationId: string;
  turnId: number;
  context: {
    userRequest: string;
    aiResponse: string;
    audioItemId?: string;
  };
  safetyRule: {
    ruleId: string;
    ruleName: string;
    configuredBy: string;
    reason: string;
  };
  functionCalled?: string;
  familyNotification?: FamilyNotification;
  resolution?: IncidentResolution;
}

export interface FamilyNotification {
  notified: boolean;
  recipients: NotificationRecipient[];
}

export interface NotificationRecipient {
  name: string;
  phone: string;
  notificationMethod: 'sms' | 'email' | 'push';
  sentAt: string;
  acknowledged?: boolean;
  acknowledgedAt?: string;
}

export interface IncidentResolution {
  resolved: boolean;
  resolvedAt: string;
  resolvedBy: string;
  notes: string;
}
