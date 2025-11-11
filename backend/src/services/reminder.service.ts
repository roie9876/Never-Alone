import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Container } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';
import { AzureConfigService } from '../config/azure.config';
import { Reminder, ReminderType, ReminderStatus, ReminderEvent, ReminderButton, ReminderMetadata } from '../interfaces/reminder.interface';
import { SafetyConfig, Medication } from '../interfaces/safety-config.interface';

/**
 * ReminderService
 * Manages scheduled reminders for medications, appointments, and daily check-ins
 *
 * Features:
 * - Cron-based scheduling (checks every minute for due reminders)
 * - Multiple reminder types (medication, appointment, daily_check_in)
 * - Status tracking (pending, triggered, completed, snoozed, declined, missed)
 * - Family notifications for missed/declined reminders
 * - Integration with pre-recorded audio files
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private get remindersContainer(): Container {
    return this.azureConfig.remindersContainer;
  }
  private readonly AUDIO_BASE_URL = process.env.BLOB_STORAGE_URL || 'https://storage.blob.core.windows.net/audio-files';

  constructor(private readonly azureConfig: AzureConfigService) {
    // Container is accessed via getter, so no initialization needed
    this.logger.log('✅ Reminder service initialized with Cosmos DB');
  }

  /**
   * Initialize medication reminders from user's safety configuration
   * Called on server startup or when safety config is updated
   *
   * @param userId - User ID to load configuration for
   * @returns Array of created medication reminders
   */
  async initializeMedicationRemindersFromConfig(userId: string): Promise<Reminder[]> {
    try {
      this.logger.log(`📋 Initializing medication reminders for user ${userId} from safety config`);

      // Load safety configuration
      const safetyConfig = await this.loadSafetyConfig(userId);

      if (!safetyConfig) {
        this.logger.warn(`⚠️ No safety config found for user ${userId}`);
        return [];
      }

      if (!safetyConfig.medications || safetyConfig.medications.length === 0) {
        this.logger.log(`ℹ️ No medications configured for user ${userId}`);
        return [];
      }

      // Create reminders for each medication
      const reminders = await this.createMedicationRemindersFromSchedule(
        userId,
        safetyConfig.medications
      );

      this.logger.log(`✅ Initialized ${reminders.length} medication reminders for user ${userId}`);
      return reminders;

    } catch (error) {
      this.logger.error(`❌ Error initializing medication reminders for user ${userId}`, error);
      return [];
    }
  }

  /**
   * Create medication reminders from medication schedule
   * Creates reminders for today only (recurring reminders handled by cron)
   *
   * @param userId - User ID
   * @param medications - Array of medications from safety config
   * @returns Array of created reminders
   */
  private async createMedicationRemindersFromSchedule(
    userId: string,
    medications: Medication[]
  ): Promise<Reminder[]> {
    const reminders: Reminder[] = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    for (const medication of medications) {
      try {
        // Parse time (HH:MM format)
        const [hoursStr, minutesStr] = medication.time.split(':');
        const hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);

        if (isNaN(hours) || isNaN(minutes)) {
          this.logger.error(`❌ Invalid time format for medication ${medication.name}: ${medication.time}`);
          continue;
        }

        // Create reminder for today
        const scheduledDate = new Date(today);
        scheduledDate.setHours(hours, minutes, 0, 0);

        // Only create if time hasn't passed yet today
        if (scheduledDate > now) {
          const reminder = await this.createReminder(
            userId,
            'medication',
            scheduledDate.toISOString(),
            {
              medicationName: medication.name,
              dosage: medication.dosage,
              specialInstructions: medication.specialInstructions,
              recurringDaily: true
            }
          );
          reminders.push(reminder);

          this.logger.log(`✅ Created medication reminder: ${medication.name} (${medication.dosage}) at ${medication.time}`);
        } else {
          this.logger.debug(`⏭️ Skipped past reminder: ${medication.name} at ${medication.time}`);
        }
      } catch (error) {
        this.logger.error(`❌ Error creating reminder for medication ${medication.name}`, error);
      }
    }

    return reminders;
  }

  /**
   * Load safety configuration for a user
   * Private helper method to query Cosmos DB
   */
  private async loadSafetyConfig(userId: string): Promise<SafetyConfig | null> {
    try {
      const safetyConfigContainer = this.azureConfig.safetyConfigContainer;

      const query = `
        SELECT * FROM c
        WHERE c.userId = @userId
        ORDER BY c.createdAt DESC
        OFFSET 0 LIMIT 1
      `;

      const { resources } = await safetyConfigContainer.items
        .query<SafetyConfig>({
          query,
          parameters: [{ name: '@userId', value: userId }]
        })
        .fetchAll();

      if (resources.length === 0) {
        return null;
      }

      return resources[0];
    } catch (error) {
      this.logger.error(`❌ Error loading safety config for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Daily cron job: Recreate medication reminders for all users
   * Runs at midnight (00:00) every day
   */
  @Cron('0 0 * * *')
  async recreateDailyMedicationReminders() {
    try {
      this.logger.log('🌅 Midnight cron: Recreating daily medication reminders for all users');

      // Get all users with safety configs
      const safetyConfigContainer = this.azureConfig.safetyConfigContainer;
      const { resources: configs } = await safetyConfigContainer.items
        .query<SafetyConfig>('SELECT DISTINCT c.userId FROM c')
        .fetchAll();

      let totalRemindersCreated = 0;

      for (const config of configs) {
        const reminders = await this.initializeMedicationRemindersFromConfig(config.userId);
        totalRemindersCreated += reminders.length;
      }

      this.logger.log(`✅ Created ${totalRemindersCreated} medication reminders for ${configs.length} users`);
    } catch (error) {
      this.logger.error('❌ Error in daily medication reminder recreation', error);
    }
  }

  /**
   * Handle missed medication (not acknowledged within 30 minutes)
   * Notifies family members
   */
  async handleMissedMedication(reminderId: string, userId: string): Promise<void> {
    try {
      const { resource: reminder } = await this.remindersContainer.item(reminderId, userId).read();

      if (!reminder) {
        this.logger.error(`❌ Reminder ${reminderId} not found`);
        return;
      }

      // Update status to missed
      await this.remindersContainer.item(reminderId, userId).patch([
        { op: 'set', path: '/status', value: 'missed' },
        { op: 'set', path: '/missedAt', value: new Date().toISOString() }
      ]);

      this.logger.warn(`⚠️ Medication missed: ${reminder.metadata?.medicationName} for user ${userId}`);

      // Load safety config to get emergency contacts
      const safetyConfig = await this.loadSafetyConfig(userId);

      if (safetyConfig && safetyConfig.emergencyContacts.length > 0) {
        // Notify family members
        for (const contact of safetyConfig.emergencyContacts) {
          this.logger.log(`📧 Notifying ${contact.name} (${contact.relationship}) about missed medication`);

          // MVP: Mock SMS notification (console.log)
          // Post-MVP: Integrate with Twilio/Azure Communication Services
          console.log(`[MOCK SMS] To: ${contact.phone}`);
          console.log(`[MOCK SMS] Message: Alert - ${reminder.metadata?.medicationName} medication was missed at ${new Date(reminder.scheduledFor).toLocaleTimeString()}`);
        }
      }

      // Log to safety incidents (optional - helps track medication adherence)
      await this.logMissedMedicationIncident(userId, reminder);

    } catch (error) {
      this.logger.error(`❌ Error handling missed medication ${reminderId}`, error);
    }
  }

  /**
   * Log missed medication as a safety incident
   * Helps track medication adherence over time
   */
  private async logMissedMedicationIncident(userId: string, reminder: Reminder): Promise<void> {
    try {
      const safetyIncidentsContainer = this.azureConfig.safetyConfigContainer.database.container('safety-incidents');

      const incident = {
        id: uuidv4(),
        userId,
        type: 'missed_medication',
        timestamp: new Date().toISOString(),
        severity: 'medium',
        details: {
          reminderId: reminder.id,
          medicationName: reminder.metadata?.medicationName,
          dosage: reminder.metadata?.dosage,
          scheduledFor: reminder.scheduledFor,
          missedAt: new Date().toISOString()
        },
        resolved: false
      };

      await safetyIncidentsContainer.items.create(incident);
      this.logger.log(`📝 Logged missed medication incident for user ${userId}`);

    } catch (error) {
      this.logger.error(`❌ Error logging missed medication incident`, error);
    }
  }

  /**
   * Cron job: Check for due reminders every minute
   * Runs at the start of every minute (e.g., 10:00:00, 10:01:00, 10:02:00)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkDueReminders() {
    try {
      const now = new Date();
      const nowISO = now.toISOString();
      const oneMinuteAhead = new Date(now.getTime() + 60000).toISOString();

      this.logger.debug(`🕒 Checking for reminders between ${nowISO} and ${oneMinuteAhead}`);

      // Query all pending reminders due in the next 60 seconds
      const query = `
        SELECT * FROM reminders r
        WHERE r.status = 'pending'
          AND r.scheduledFor >= @now
          AND r.scheduledFor < @oneMinuteAhead
      `;

      const { resources: dueReminders } = await this.remindersContainer.items
        .query({
          query,
          parameters: [
            { name: '@now', value: nowISO },
            { name: '@oneMinuteAhead', value: oneMinuteAhead }
          ]
        })
        .fetchAll();

      if (dueReminders.length > 0) {
        this.logger.log(`📢 Found ${dueReminders.length} due reminder(s)`);
        for (const reminder of dueReminders) {
          await this.triggerReminder(reminder);
        }
      }
    } catch (error) {
      this.logger.error('❌ Error checking due reminders', error);
    }
  }

  /**
   * Trigger a reminder
   * - Play pre-recorded audio
   * - Update reminder status to 'triggered'
   * - Send event to tablet via WebSocket (TODO: integrate with RealtimeGateway)
   */
  async triggerReminder(reminder: Reminder): Promise<void> {
    try {
      this.logger.log(`🔔 Triggering reminder ${reminder.id} (${reminder.type}) for user ${reminder.userId}`);

      // Get audio URL for reminder type
      const audioUrl = this.getAudioForReminderType(reminder.type);

      // Update reminder status
      const triggeredAt = new Date().toISOString();
      await this.remindersContainer.item(reminder.id, reminder.userId).patch([
        { op: 'set', path: '/status', value: 'triggered' },
        { op: 'set', path: '/triggeredAt', value: triggeredAt }
      ]);

      // Build reminder event
      const reminderEvent: ReminderEvent = {
        type: 'scheduled_reminder',
        reminderId: reminder.id,
        reminderType: reminder.type,
        audioUrl,
        scheduledFor: reminder.scheduledFor,
        buttons: this.getButtonsForReminderType(reminder.type),
        metadata: reminder.metadata
      };

      // TODO: Send to tablet via WebSocket (will integrate with RealtimeGateway)
      this.logger.log(`📤 Reminder event ready to send: ${JSON.stringify(reminderEvent, null, 2)}`);

      // Set timeout for missed reminder check
      // Medication: 30 minutes (critical)
      // Other reminders: 5 minutes
      const timeoutMinutes = reminder.type === 'medication' ? 30 : 5;
      setTimeout(() => {
        this.checkMissedReminder(reminder.id, reminder.userId);
      }, timeoutMinutes * 60 * 1000);

    } catch (error) {
      this.logger.error(`❌ Error triggering reminder ${reminder.id}`, error);
    }
  }

  /**
   * Check if a reminder was missed (not acknowledged within 30 minutes)
   * For medication reminders: notify family
   * For other reminders: just mark as missed
   */
  private async checkMissedReminder(reminderId: string, userId: string): Promise<void> {
    try {
      const { resource: reminder } = await this.remindersContainer.item(reminderId, userId).read();

      if (reminder.status === 'triggered') {
        // Still triggered after timeout = missed
        this.logger.warn(`⚠️ Reminder ${reminderId} was missed (not acknowledged)`);

        // For medication reminders, use special handling (family notification)
        if (reminder.type === 'medication') {
          await this.handleMissedMedication(reminderId, userId);
        } else {
          // For other reminder types, just mark as missed
          await this.remindersContainer.item(reminderId, userId).patch([
            { op: 'set', path: '/status', value: 'missed' }
          ]);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error checking missed reminder ${reminderId}`, error);
    }
  }

  /**
   * Create a new reminder
   */
  async createReminder(
    userId: string,
    type: ReminderType,
    scheduledFor: string,
    metadata?: ReminderMetadata
  ): Promise<Reminder> {
    const reminder: Reminder = {
      id: uuidv4(),
      userId,
      type,
      scheduledFor,
      status: 'pending',
      declineCount: 0,
      snoozeCount: 0,
      metadata
    };

    const { resource: createdReminder } = await this.remindersContainer.items.create(reminder);
    this.logger.log(`✅ Created reminder ${reminder.id} for user ${userId} at ${scheduledFor}`);

    return createdReminder;
  }

  /**
   * Acknowledge reminder (user pressed "I'm taking them now" or similar)
   */
  async acknowledgeReminder(reminderId: string, userId: string): Promise<void> {
    const acknowledgedAt = new Date().toISOString();

    await this.remindersContainer.item(reminderId, userId).patch([
      { op: 'set', path: '/status', value: 'acknowledged' },
      { op: 'set', path: '/acknowledgedAt', value: acknowledgedAt }
    ]);

    this.logger.log(`✅ Reminder ${reminderId} acknowledged by user ${userId}`);
  }

  /**
   * Complete reminder (user verbally confirmed action via Realtime API)
   */
  async completeReminder(reminderId: string, userId: string): Promise<void> {
    const completedAt = new Date().toISOString();

    await this.remindersContainer.item(reminderId, userId).patch([
      { op: 'set', path: '/status', value: 'completed' },
      { op: 'set', path: '/completedAt', value: completedAt }
    ]);

    this.logger.log(`✅ Reminder ${reminderId} completed by user ${userId}`);
  }

  /**
   * Snooze reminder (delay by X minutes)
   */
  async snoozeReminder(
    reminderId: string,
    userId: string,
    delayMinutes: number = 10
  ): Promise<Reminder> {
    // Get original reminder
    const { resource: originalReminder } = await this.remindersContainer.item(reminderId, userId).read();

    // Update original reminder status
    await this.remindersContainer.item(reminderId, userId).patch([
      { op: 'set', path: '/status', value: 'snoozed' },
      { op: 'incr', path: '/snoozeCount', value: 1 }
    ]);

    // Create new reminder for snoozed time
    const newScheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
    const newReminder = await this.createReminder(
      userId,
      originalReminder.type,
      newScheduledFor,
      {
        ...originalReminder.metadata,
        originalReminderId: reminderId,
        isSnooze: true
      }
    );

    this.logger.log(`⏰ Reminder ${reminderId} snoozed for ${delayMinutes} minutes. New reminder: ${newReminder.id}`);

    // Check if snoozed too many times (3+)
    const totalSnoozes = originalReminder.snoozeCount + 1;
    if (totalSnoozes >= 3) {
      this.logger.warn(`⚠️ Reminder ${reminderId} snoozed ${totalSnoozes} times - family notification needed`);
      // TODO: Send family alert
    }

    return newReminder;
  }

  /**
   * Decline reminder (user said "not now" or "no")
   */
  async declineReminder(
    reminderId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const { resource: reminder } = await this.remindersContainer.item(reminderId, userId).read();

    await this.remindersContainer.item(reminderId, userId).patch([
      { op: 'set', path: '/status', value: 'declined' },
      { op: 'incr', path: '/declineCount', value: 1 }
    ]);

    const totalDeclines = reminder.declineCount + 1;
    this.logger.log(`❌ Reminder ${reminderId} declined by user ${userId}. Total declines: ${totalDeclines}`);

    // Check if declined too many times (3+)
    if (totalDeclines >= 3) {
      this.logger.warn(`⚠️ Reminder ${reminderId} declined ${totalDeclines} times - family notification needed`);
      // TODO: Send family alert
    }

    // If declined 2x, escalate to Realtime API conversation
    if (totalDeclines === 2) {
      this.logger.log(`🗣️ Reminder ${reminderId} declined twice - escalate to conversation`);
      // TODO: Initiate Realtime API session with medication context
    }
  }

  /**
   * Get all reminders for a user
   */
  async getUserReminders(
    userId: string,
    status?: ReminderStatus,
    type?: ReminderType
  ): Promise<Reminder[]> {
    let query = `SELECT * FROM reminders r WHERE r.userId = @userId`;
    const parameters: any[] = [{ name: '@userId', value: userId }];

    if (status) {
      query += ` AND r.status = @status`;
      parameters.push({ name: '@status', value: status });
    }

    if (type) {
      query += ` AND r.type = @type`;
      parameters.push({ name: '@type', value: type });
    }

    query += ` ORDER BY r.scheduledFor DESC`;

    const { resources: reminders } = await this.remindersContainer.items
      .query({ query, parameters })
      .fetchAll();

    return reminders;
  }

  /**
   * Get audio URL for reminder type (pre-recorded MP3 files)
   */
  private getAudioForReminderType(type: ReminderType): string {
    const audioMap: Record<ReminderType, string> = {
      'medication': `${this.AUDIO_BASE_URL}/medication-reminder-hebrew.mp3`,
      'daily_check_in': `${this.AUDIO_BASE_URL}/check-in-hebrew.mp3`,
      'appointment': `${this.AUDIO_BASE_URL}/appointment-30min-hebrew.mp3`
    };

    return audioMap[type] || audioMap['daily_check_in'];
  }

  /**
   * Get button configuration for reminder type (Hebrew labels)
   */
  private getButtonsForReminderType(type: ReminderType): ReminderButton[] {
    if (type === 'medication') {
      return [
        { id: 'taking_now', label: 'אני לוקח עכשיו', style: 'primary', action: 'acknowledge' },
        { id: 'snooze_10min', label: 'הזכר לי בעוד 10 דקות', style: 'secondary', action: 'snooze' },
        { id: 'talk_first', label: 'דבר איתי', style: 'secondary', action: 'talk' }
      ];
    }

    if (type === 'daily_check_in') {
      return [
        { id: 'check_in_accept', label: 'בוא נדבר', style: 'primary', action: 'accept' },
        { id: 'check_in_decline', label: 'עסוק עכשיו', style: 'secondary', action: 'decline' }
      ];
    }

    if (type === 'appointment') {
      return [
        { id: 'appointment_ok', label: 'אני זוכר, תודה', style: 'primary', action: 'acknowledge' },
        { id: 'appointment_remind', label: 'תזכיר לי שוב בעוד 10 דקות', style: 'secondary', action: 'snooze' },
        { id: 'appointment_confused', label: 'איזו פגישה?', style: 'secondary', action: 'confused' }
      ];
    }

    return [];
  }

  /**
   * Create daily medication reminders for a user
   * Based on onboarding configuration
   */
  async createDailyMedicationReminders(
    userId: string,
    medicationSchedule: Array<{ name: string; time: string; dosage: string }>
  ): Promise<Reminder[]> {
    const reminders: Reminder[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    for (const medication of medicationSchedule) {
      // Parse time (HH:MM format)
      const [hours, minutes] = medication.time.split(':').map(Number);

      // Create reminder for today
      const scheduledDate = new Date(today);
      scheduledDate.setHours(hours, minutes, 0, 0);

      // Only create if time hasn't passed yet today
      if (scheduledDate > new Date()) {
        const reminder = await this.createReminder(
          userId,
          'medication',
          scheduledDate.toISOString(),
          {
            medicationName: medication.name,
            dosage: medication.dosage
          }
        );
        reminders.push(reminder);
      }
    }

    this.logger.log(`✅ Created ${reminders.length} medication reminders for user ${userId}`);
    return reminders;
  }

  /**
   * Create daily check-in reminders (10 AM, 3 PM, 7 PM)
   */
  async createDailyCheckInReminders(userId: string): Promise<Reminder[]> {
    const reminders: Reminder[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkInTimes = [
      { hour: 10, minute: 0 },  // 10:00 AM
      { hour: 15, minute: 0 },  // 3:00 PM
      { hour: 19, minute: 0 }   // 7:00 PM
    ];

    for (const time of checkInTimes) {
      const scheduledDate = new Date(today);
      scheduledDate.setHours(time.hour, time.minute, 0, 0);

      // Only create if time hasn't passed yet today
      if (scheduledDate > new Date()) {
        const reminder = await this.createReminder(
          userId,
          'daily_check_in',
          scheduledDate.toISOString(),
          { checkInType: 'daily' }
        );
        reminders.push(reminder);
      }
    }

    this.logger.log(`✅ Created ${reminders.length} check-in reminders for user ${userId}`);
    return reminders;
  }
}
