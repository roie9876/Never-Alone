/**
 * Zod validation schemas for onboarding form
 */

import { z } from 'zod';

// Emergency Contact Schema
export const emergencyContactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?\d{10,15}$/, 'Invalid phone number format'),
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

// Complete Onboarding Form Schema
export const onboardingFormSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type OnboardingFormSchema = z.infer<typeof onboardingFormSchema>;
