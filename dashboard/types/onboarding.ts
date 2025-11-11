/**
 * Type definitions for onboarding form data
 */

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Medication {
  name: string;
  dosage: string;
  time: string; // HH:MM format
  specialInstructions?: string;
}

export interface DailyRoutine {
  wakeTime: string;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  sleepTime: string;
}

export interface ConversationBoundaries {
  forbiddenTopics: string[];
  notes?: string;
}

export interface CrisisTrigger {
  keyword: string;
  severity: 'critical' | 'high' | 'medium';
  action: string;
}

export interface PatientBackground {
  fullName: string;
  age: number;
  medicalCondition: string;
  personality: string;
  hobbies: string;
  familyContext?: string;
  importantMemories?: string;
}

export interface OnboardingFormData {
  userId: string;
  
  // Step 0: Patient Background
  patientBackground: PatientBackground;
  
  // Step 1: Emergency Contacts
  emergencyContacts: EmergencyContact[];
  
  // Step 2: Medications
  medications: Medication[];
  
  // Step 3: Daily Routines
  routines: DailyRoutine;
  
  // Step 4: Conversation Boundaries
  boundaries: ConversationBoundaries;
  
  // Step 5: Crisis Triggers
  crisisTriggers: CrisisTrigger[];
  
  // Step 6: Voice Calibration (TBD - defer for MVP)
  voiceCalibration?: {
    enabled: boolean;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface SafetyConfig {
  id: string;
  userId: string;
  patientBackground: PatientBackground;
  emergencyContacts: EmergencyContact[];
  medications: Medication[];
  routines: DailyRoutine;
  boundaries: ConversationBoundaries;
  crisisTriggers: CrisisTrigger[];
  createdAt: string;
  updatedAt: string;
  yamlConfig: string; // Generated YAML configuration
}
