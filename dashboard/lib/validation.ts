/**
 * Zod validation schemas for onboarding form
 */

import { z } from 'zod';

// Emergency Contact Schema
export const emergencyContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+972-\d{2}-\d{3}-\d{4}$/, 'מספר טלפון חייב להיות בפורמט: +972-50-123-4567'),
  relationship: z.string().min(2, 'Relationship must be specified'),
});

// Medication Schema
export const medicationSchema = z.object({
  name: z.string().min(2, 'Medication name required'),
  dosage: z.string().min(1, 'Dosage required'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  specialInstructions: z.string().optional(),
});

// Daily Routine Schema
export const routineSchema = z.object({
  wakeTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  breakfastTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  lunchTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  dinnerTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
  sleepTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'),
});

// Patient Background Story Schema
export const patientBackgroundSchema = z.object({
  fullName: z.string().min(2, 'שם מלא נדרש'),
  age: z.number().min(1).max(120, 'גיל חייב להיות בין 1-120'),
  medicalCondition: z.string().min(10, 'תיאור המצב הרפואי חייב להיות לפחות 10 תווים'),
  personality: z.string().min(10, 'תיאור האישיות חייב להיות לפחות 10 תווים'),
  hobbies: z.string().min(5, 'תחביבים - לפחות 5 תווים'),
  familyContext: z.string().optional(),
  importantMemories: z.string().optional(),
});

// Conversation Boundaries Schema
export const boundariesSchema = z.object({
  forbiddenTopics: z.array(z.string()).min(0),
  notes: z.string().optional(),
});

// Crisis Trigger Schema
export const crisisTriggerSchema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters'),
  severity: z.enum(['critical', 'high', 'medium']),
  action: z.string().min(10, 'Action description must be at least 10 characters'),
});

// Photo Schema (Optional - for family photos)
export const photoSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  blobUrl: z.string().min(1, 'Photo URL is required'), // Accept both full URLs and relative paths
  uploadedAt: z.string().min(1, 'Upload timestamp is required'), // Accept any ISO string format
  manualTags: z.array(z.string()),
  caption: z.string().optional(),
  size: z.number().positive('File size must be positive'),
});

// Complete Onboarding Form Schema
export const onboardingFormSchema = z.object({
  userId: z.string().min(3, 'User ID must be at least 3 characters'),
  patientBackground: patientBackgroundSchema, // NEW: סיפור רקע על המטופל
  emergencyContacts: z.array(emergencyContactSchema)
    .min(1, 'At least 1 emergency contact required')
    .max(3, 'Maximum 3 emergency contacts allowed'),
  medications: z.array(medicationSchema).min(1, 'At least 1 medication required'),
  routines: routineSchema,
  boundaries: boundariesSchema,
  crisisTriggers: z.array(crisisTriggerSchema).min(1, 'At least 1 crisis trigger required'),
  voiceCalibration: z.object({
    enabled: z.boolean(),
  }).optional(),
  photos: z.array(photoSchema).max(20, 'Maximum 20 photos allowed').optional().default([]), // NEW: Family photos (optional)
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OnboardingFormSchema = z.infer<typeof onboardingFormSchema>;
