/**
 * Reminder-related TypeScript interfaces
 * Based on reminder-system.md specifications
 */

export type ReminderType = 'medication' | 'daily_check_in' | 'appointment';
export type ReminderStatus = 'pending' | 'triggered' | 'acknowledged' | 'completed' | 'snoozed' | 'declined' | 'missed';

export interface Reminder {
  id: string; // UUID
  userId: string; // Partition key
  type: ReminderType;
  scheduledFor: string; // ISO timestamp
  status: ReminderStatus;
  triggeredAt?: string;
  acknowledgedAt?: string;
  completedAt?: string;
  declineCount: number;
  snoozeCount: number;
  metadata?: ReminderMetadata;
}

export interface ReminderMetadata {
  // For medication reminders
  medicationName?: string;
  dosage?: string;
  specialInstructions?: string;
  recurringDaily?: boolean; // Flag to indicate this is a daily recurring reminder

  // For appointments
  appointmentType?: string;
  doctorName?: string;
  location?: string;

  // For daily check-ins
  checkInType?: string;

  // Original reminder if this is a snooze
  originalReminderId?: string;
  isSnooze?: boolean;
}

export interface ReminderEvent {
  type: 'scheduled_reminder';
  reminderId: string;
  reminderType: ReminderType;
  audioUrl: string;
  scheduledFor: string;
  buttons: ReminderButton[];
  metadata?: ReminderMetadata;
}

export interface ReminderButton {
  id: string;
  label: string; // Hebrew text
  style: 'primary' | 'secondary';
  action: string;
}
