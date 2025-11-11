import { Controller, Post, Get, Patch, Body, Param, Query, Logger } from '@nestjs/common';
import { ReminderService } from '../services/reminder.service';
import { Reminder, ReminderType, ReminderStatus } from '../interfaces/reminder.interface';

/**
 * ReminderController
 * REST API endpoints for reminder management
 *
 * Endpoints:
 * - POST /reminder - Create a new reminder
 * - GET /reminder/:userId - Get all reminders for a user
 * - PATCH /reminder/:id/acknowledge - Acknowledge a reminder
 * - PATCH /reminder/:id/complete - Complete a reminder
 * - PATCH /reminder/:id/snooze - Snooze a reminder
 * - PATCH /reminder/:id/decline - Decline a reminder
 * - POST /reminder/daily/medications - Create daily medication reminders
 * - POST /reminder/daily/check-ins - Create daily check-in reminders
 */
@Controller('reminder')
export class ReminderController {
  private readonly logger = new Logger(ReminderController.name);

  constructor(private readonly reminderService: ReminderService) {}

  /**
   * Create a new reminder
   * POST /reminder
   * Body: { userId, type, scheduledFor, metadata? }
   */
  @Post()
  async createReminder(@Body() body: {
    userId: string;
    type: ReminderType;
    scheduledFor: string;
    metadata?: any;
  }): Promise<Reminder> {
    this.logger.log(`Creating reminder for user ${body.userId}: ${body.type} at ${body.scheduledFor}`);
    return await this.reminderService.createReminder(
      body.userId,
      body.type,
      body.scheduledFor,
      body.metadata
    );
  }

  /**
   * Get all reminders for a user
   * GET /reminder/:userId?status=pending&type=medication
   */
  @Get(':userId')
  async getUserReminders(
    @Param('userId') userId: string,
    @Query('status') status?: ReminderStatus,
    @Query('type') type?: ReminderType
  ): Promise<Reminder[]> {
    this.logger.log(`Getting reminders for user ${userId} (status: ${status}, type: ${type})`);
    return await this.reminderService.getUserReminders(userId, status, type);
  }

  /**
   * Acknowledge a reminder (user pressed "I'm taking them now")
   * PATCH /reminder/:id/acknowledge
   * Body: { userId }
   */
  @Patch(':id/acknowledge')
  async acknowledgeReminder(
    @Param('id') reminderId: string,
    @Body('userId') userId: string
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Acknowledging reminder ${reminderId} for user ${userId}`);
    await this.reminderService.acknowledgeReminder(reminderId, userId);
    return { success: true, message: 'Reminder acknowledged' };
  }

  /**
   * Complete a reminder (verbal confirmation via Realtime API)
   * PATCH /reminder/:id/complete
   * Body: { userId }
   */
  @Patch(':id/complete')
  async completeReminder(
    @Param('id') reminderId: string,
    @Body('userId') userId: string
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Completing reminder ${reminderId} for user ${userId}`);
    await this.reminderService.completeReminder(reminderId, userId);
    return { success: true, message: 'Reminder completed' };
  }

  /**
   * Snooze a reminder
   * PATCH /reminder/:id/snooze
   * Body: { userId, delayMinutes? }
   */
  @Patch(':id/snooze')
  async snoozeReminder(
    @Param('id') reminderId: string,
    @Body('userId') userId: string,
    @Body('delayMinutes') delayMinutes?: number
  ): Promise<{ success: boolean; newReminder: Reminder; message: string }> {
    this.logger.log(`Snoozing reminder ${reminderId} for user ${userId} (delay: ${delayMinutes || 10} min)`);
    const newReminder = await this.reminderService.snoozeReminder(
      reminderId,
      userId,
      delayMinutes
    );
    return {
      success: true,
      newReminder,
      message: `Reminder snoozed for ${delayMinutes || 10} minutes`
    };
  }

  /**
   * Decline a reminder
   * PATCH /reminder/:id/decline
   * Body: { userId, reason? }
   */
  @Patch(':id/decline')
  async declineReminder(
    @Param('id') reminderId: string,
    @Body('userId') userId: string,
    @Body('reason') reason?: string
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Declining reminder ${reminderId} for user ${userId}`);
    await this.reminderService.declineReminder(reminderId, userId, reason);
    return { success: true, message: 'Reminder declined' };
  }

  /**
   * Create daily medication reminders for a user
   * POST /reminder/daily/medications
   * Body: { userId, medicationSchedule: [{ name, time, dosage }] }
   */
  @Post('daily/medications')
  async createDailyMedicationReminders(@Body() body: {
    userId: string;
    medicationSchedule: Array<{ name: string; time: string; dosage: string }>;
  }): Promise<{ success: boolean; reminders: Reminder[]; message: string }> {
    this.logger.log(`Creating daily medication reminders for user ${body.userId}`);
    const reminders = await this.reminderService.createDailyMedicationReminders(
      body.userId,
      body.medicationSchedule
    );
    return {
      success: true,
      reminders,
      message: `Created ${reminders.length} medication reminders`
    };
  }

  /**
   * Create daily check-in reminders (10 AM, 3 PM, 7 PM)
   * POST /reminder/daily/check-ins
   * Body: { userId }
   */
  @Post('daily/check-ins')
  async createDailyCheckInReminders(@Body('userId') userId: string): Promise<{
    success: boolean;
    reminders: Reminder[];
    message: string;
  }> {
    this.logger.log(`Creating daily check-in reminders for user ${userId}`);
    const reminders = await this.reminderService.createDailyCheckInReminders(userId);
    return {
      success: true,
      reminders,
      message: `Created ${reminders.length} check-in reminders`
    };
  }
}
