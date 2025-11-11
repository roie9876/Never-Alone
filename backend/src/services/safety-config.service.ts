/**
 * Safety Configuration Service
 * Loads and manages user-specific safety rules from onboarding
 */

import { Injectable, Logger } from '@nestjs/common';
import { Container } from '@azure/cosmos';
import { AzureConfigService } from '../config/azure.config';
import {
  SafetyConfig,
  SafetyAlert,
  CrisisTrigger,
  CrisisDetectionResult,
} from '../interfaces/safety-config.interface';

@Injectable()
export class SafetyConfigService {
  private readonly logger = new Logger(SafetyConfigService.name);
  private safetyConfigContainer: Container;
  private safetyIncidentsContainer: Container;

  constructor(private readonly azureConfig: AzureConfigService) {
    // Containers will be accessed via azureConfig
    this.logger.log('SafetyConfigService instantiated');
  }

  /**
   * Load safety configuration for a user
   * @param userId - User ID
   * @returns Safety configuration or null if not found
   */
  async loadSafetyConfig(userId: string): Promise<SafetyConfig | null> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }],
      };

      const { resources } = await this.azureConfig.safetyConfigContainer.items
        .query<SafetyConfig>(querySpec)
        .fetchAll();

      if (resources.length === 0) {
        this.logger.warn(`⚠️  No safety config found for user: ${userId}`);
        return null;
      }

      // Return most recent config
      const config = resources[0];
      this.logger.log(`✅ Loaded safety config for user: ${userId}`);
      this.logger.log(`   - Patient: ${config.patientBackground?.fullName}, Age: ${config.patientBackground?.age}`);
      this.logger.log(`   - Emergency contacts: ${config.emergencyContacts.length}`);
      this.logger.log(`   - Medications: ${config.medications.length}`);
      this.logger.log(`   - Crisis triggers: ${config.crisisTriggers.length}`);
      this.logger.log(`   - Forbidden topics: ${config.boundaries.forbiddenTopics.length}`);

      return config;
    } catch (error) {
      this.logger.error(`❌ Error loading safety config for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Inject safety rules into system prompt for Realtime API
   * @param basePrompt - Base system prompt
   * @param config - Safety configuration
   * @returns Enhanced system prompt with safety rules
   */
  injectSafetyRules(basePrompt: string, config: SafetyConfig): string {
    const patientBackgroundSection = config.patientBackground ? `

═══════════════════════════════════════════════════════════
👤 PATIENT BACKGROUND - WHO YOU'RE SPEAKING WITH
═══════════════════════════════════════════════════════════

## Patient Information
- Name: ${config.patientBackground.fullName}
- Age: ${config.patientBackground.age} years old
- Medical Condition: ${config.patientBackground.medicalCondition}

## Personality & Character
${config.patientBackground.personality}

## Hobbies & Interests
${config.patientBackground.hobbies}

${config.patientBackground.familyContext ? `## Family Context\n${config.patientBackground.familyContext}\n` : ''}
${config.patientBackground.importantMemories ? `## Important Life Memories\n${config.patientBackground.importantMemories}\n` : ''}

💡 USE THIS CONTEXT TO:
- Address them by name naturally
- Reference their hobbies in conversation ("How are your roses doing in the garden?")
- Show empathy based on their medical condition
- Connect with their personality (warm, storytelling, proud of family)
- Reference their life history when relevant

═══════════════════════════════════════════════════════════
` : '';

    const safetySection = `

═══════════════════════════════════════════════════════════
🚨 CRITICAL SAFETY RULES (MUST FOLLOW STRICTLY)
═══════════════════════════════════════════════════════════

## Emergency Contacts
${config.emergencyContacts
  .map(
    (contact, i) =>
      `${i + 1}. ${contact.name} (${contact.relationship}) - ${contact.phone}`,
  )
  .join('\n')}

## Medications
${config.medications
  .map(
    (med) =>
      `- ${med.name} (${med.dosage}) at ${med.time}${med.specialInstructions ? ` - ${med.specialInstructions}` : ''}`,
  )
  .join('\n')}

## Daily Routine
- Wake: ${config.routines.wakeTime}
- Breakfast: ${config.routines.breakfastTime}
- Lunch: ${config.routines.lunchTime}
- Dinner: ${config.routines.dinnerTime}
- Sleep: ${config.routines.sleepTime}

## FORBIDDEN TOPICS (NEVER DISCUSS)
${config.boundaries.forbiddenTopics.length > 0 ? config.boundaries.forbiddenTopics.map((topic) => `- ${topic}`).join('\n') : '- (None specified)'}
${config.boundaries.notes ? `\nNotes: ${config.boundaries.notes}` : ''}

⚠️  If user mentions any forbidden topic, politely redirect:
"That's an interesting thought, but let's talk about something else. How about [suggest safe topic]?"

## 🚨 CRISIS TRIGGERS (IMMEDIATE ALERT)
${config.crisisTriggers
  .map(
    (trigger) =>
      `- Keyword: "${trigger.keyword}" (${trigger.severity.toUpperCase()})
  Action: ${trigger.action}`,
  )
  .join('\n')}

⚠️  CRITICAL PROTOCOL FOR CRISIS TRIGGERS:
1. If user says ANY crisis trigger keyword:
   a) DO NOT say yes, agree, or encourage
   b) Respond calmly: "I understand you're feeling [emotion]. Let's talk to ${config.emergencyContacts[0]?.name || 'your family'} right now."
   c) IMMEDIATELY call trigger_crisis_alert() function
   d) Stay on conversation until help arrives

2. Examples of what to NEVER say:
   ❌ "That sounds like a good idea"
   ❌ "I can help you with that"
   ❌ "Go ahead and do it"

3. Always offer alternatives:
   ✅ "Let's take some deep breaths together"
   ✅ "Would you like to talk about what's bothering you?"
   ✅ "Let me call ${config.emergencyContacts[0]?.name || 'someone who cares about you'}"

═══════════════════════════════════════════════════════════
END OF SAFETY RULES
═══════════════════════════════════════════════════════════
`;

    return basePrompt + patientBackgroundSection + safetySection;
  }

  /**
   * Check transcript for crisis triggers
   * @param transcript - User's spoken text
   * @param triggers - Crisis triggers to check
   * @returns Detection result with matched triggers
   */
  checkCrisisTriggers(
    transcript: string,
    triggers: CrisisTrigger[],
  ): CrisisDetectionResult {
    const lowerTranscript = transcript.toLowerCase();
    const matchedTriggers: CrisisTrigger[] = [];

    for (const trigger of triggers) {
      const lowerKeyword = trigger.keyword.toLowerCase();

      // Check for exact phrase match
      if (lowerTranscript.includes(lowerKeyword)) {
        this.logger.warn(
          `🚨 CRISIS TRIGGER DETECTED: "${trigger.keyword}" (${trigger.severity})`,
        );
        matchedTriggers.push(trigger);
      }
    }

    return {
      detected: matchedTriggers.length > 0,
      matchedTriggers,
      transcript,
      detectedAt: new Date().toISOString(),
    };
  }

  /**
   * Create and log safety alert
   * @param userId - User ID
   * @param detection - Crisis detection result
   * @param conversationId - Optional conversation ID
   * @returns Created alert
   */
  async createSafetyAlert(
    userId: string,
    detection: CrisisDetectionResult,
    conversationId?: string,
  ): Promise<SafetyAlert> {
    try {
      // Load safety config to get emergency contacts
      const config = await this.loadSafetyConfig(userId);
      if (!config) {
        throw new Error(`No safety config found for user ${userId}`);
      }

      // Create alert document
      const alert: SafetyAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        timestamp: detection.detectedAt,
        severity: detection.matchedTriggers[0].severity, // Use highest severity
        triggerKeyword: detection.matchedTriggers[0].keyword,
        triggerAction: detection.matchedTriggers[0].action,
        transcript: detection.transcript,
        conversationId,
        notificationsSent: [], // Will be populated by notifyEmergencyContacts
        resolved: false,
      };

      // Save to Cosmos DB safety-incidents container
      // Note: Container will be created if doesn't exist
      const { resource } = await this.azureConfig.safetyConfigContainer.database
        .container('safety-incidents')
        .items.create(alert);

      this.logger.warn('🚨 SAFETY ALERT CREATED:');
      this.logger.warn(`   Alert ID: ${alert.id}`);
      this.logger.warn(`   User: ${userId}`);
      this.logger.warn(`   Severity: ${alert.severity}`);
      this.logger.warn(`   Trigger: "${alert.triggerKeyword}"`);
      this.logger.warn(`   Action: ${alert.triggerAction}`);

      return resource;
    } catch (error) {
      this.logger.error('❌ Error creating safety alert:', error);
      throw error;
    }
  }

  /**
   * Notify emergency contacts about crisis
   * @param userId - User ID
   * @param alert - Safety alert
   */
  async notifyEmergencyContacts(
    userId: string,
    alert: SafetyAlert,
  ): Promise<void> {
    try {
      const config = await this.loadSafetyConfig(userId);
      if (!config) {
        this.logger.error(`Cannot notify: No config for user ${userId}`);
        return;
      }

      this.logger.warn('📞 NOTIFYING EMERGENCY CONTACTS:');

      const notifications = [];

      for (const contact of config.emergencyContacts) {
        const notification = {
          contactName: contact.name,
          contactPhone: contact.phone,
          method: 'sms' as const, // MVP: Log only (no actual SMS)
          sentAt: new Date().toISOString(),
          acknowledged: false,
        };

        // MVP: Console log instead of actual SMS
        this.logger.warn(`   📱 [MVP-MOCK] SMS to ${contact.name} (${contact.phone}):`);
        this.logger.warn(`      "🚨 URGENT: Crisis detected for patient."`);
        this.logger.warn(`      "Trigger: ${alert.triggerKeyword}"`);
        this.logger.warn(`      "Please check on them immediately."`);
        this.logger.warn(`      "Alert ID: ${alert.id}"`);

        notifications.push(notification);
      }

      // Update alert with notification details
      alert.notificationsSent = notifications;
      await this.azureConfig.safetyConfigContainer.database
        .container('safety-incidents')
        .item(alert.id, userId)
        .replace(alert);

      this.logger.warn(`✅ Notified ${notifications.length} emergency contacts`);
    } catch (error) {
      this.logger.error('❌ Error notifying emergency contacts:', error);
      throw error;
    }
  }

  /**
   * Get all safety alerts for a user
   * @param userId - User ID
   * @param limit - Maximum number of alerts to return
   * @returns Array of safety alerts
   */
  async getSafetyAlerts(userId: string, limit: number = 10): Promise<SafetyAlert[]> {
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@limit', value: limit },
        ],
      };

      const { resources } = await this.azureConfig.safetyConfigContainer.database
        .container('safety-incidents')
        .items.query<SafetyAlert>(querySpec)
        .fetchAll();

      return resources;
    } catch (error) {
      this.logger.error(`❌ Error fetching safety alerts for user ${userId}:`, error);
      throw error;
    }
  }
}
