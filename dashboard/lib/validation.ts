/**
 * Zod validation schemas for onboarding form
 */

import { z } from 'zod';

// Emergency Contact Schema
export const emergencyContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string()
    .min(10, 'מספר טלפון חייב להכיל לפחות 10 ספרות')
    .transform((val) => {
      // Remove all non-digit characters except +
      const cleaned = val.replace(/[^\d+]/g, '');
      
      // If starts with +972, format as +972-XX-XXX-XXXX
      if (cleaned.startsWith('+972') && cleaned.length >= 13) {
        const areaCode = cleaned.substring(4, 6);
        const firstPart = cleaned.substring(6, 9);
        const secondPart = cleaned.substring(9, 13);
        return `+972-${areaCode}-${firstPart}-${secondPart}`;
      }
      
      // If starts with 0, convert to +972 format
      if (cleaned.startsWith('0') && cleaned.length >= 10) {
        const areaCode = cleaned.substring(1, 3);
        const firstPart = cleaned.substring(3, 6);
        const secondPart = cleaned.substring(6, 10);
        return `+972-${areaCode}-${firstPart}-${secondPart}`;
      }
      
      return val; // Return as-is if format not recognized
    })
    .refine(
      (val) => /^\+972-\d{2}-\d{3}-\d{4}$/.test(val),
      { message: 'מספר טלפון חייב להיות בפורמט: +972-50-123-4567' }
    ),
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
  id: z.string().optional().default(''), // Optional - will be generated if missing
  fileName: z.string().optional().default(''), // Optional - can be extracted from blobUrl
  blobUrl: z.string().min(1, 'Photo URL is required'), // Only required field - the photo URL itself
  uploadedAt: z.string().optional().default(''), // Optional - can use current timestamp if missing
  manualTags: z.array(z.string()).optional().default([]), // Optional - empty array if not provided
  caption: z.string().optional().default(''), // Optional caption
  size: z.number().nonnegative().optional().default(0), // Optional, default to 0 if not provided
});

// Music Preferences Schema (Optional - therapeutic music playback)
export const musicPreferencesSchema = z.object({
  enabled: z.boolean().default(false),
  preferredArtists: z.string().optional(),
  preferredSongs: z.string().optional(),
  preferredGenres: z.string().optional(),
  allowAutoPlay: z.boolean().default(false),
  playOnSadness: z.boolean().default(false),
  maxSongsPerSession: z.number().min(1).max(5).default(3),
}).refine(
  (data) => {
    // If music is enabled, require at least one of: artists, songs, or genres
    if (data.enabled) {
      return (
        (data.preferredArtists && data.preferredArtists.trim().length > 0) ||
        (data.preferredSongs && data.preferredSongs.trim().length > 0) ||
        (data.preferredGenres && data.preferredGenres.trim().length > 0)
      );
    }
    return true;
  },
  {
    message: 'When music is enabled, please provide at least one of: preferred artists, songs, or genres',
    path: ['preferredArtists'], // Show error on first field
  }
);

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
  photos: z.array(photoSchema).max(50, 'Maximum 50 photos allowed').optional(), // NEW: Family photos (optional, no default)
  musicPreferences: musicPreferencesSchema.optional(), // NEW: Music preferences (optional)
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OnboardingFormSchema = z.infer<typeof onboardingFormSchema>;
