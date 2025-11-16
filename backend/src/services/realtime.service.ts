/**
 * Realtime API Service
 * Manages WebSocket connections to Azure OpenAI Realtime API
 * Handles audio streaming, transcript logging, and function calling
 *
 * Reference: docs/technical/realtime-api-integration.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DefaultAzureCredential } from '@azure/identity';
import { AzureConfigService } from '@config/azure.config';
import { MemoryService } from './memory.service';
import { PhotoService } from './photo.service';
import { MusicService } from './music.service';
import {
  RealtimeSession,
  RealtimeSessionConfig,
  TranscriptEvent,
  SystemPromptContext,
} from '@interfaces/realtime.interface';
import { ConversationTurn } from '@interfaces/memory.interface';
import { PhotoTriggerReason } from '@interfaces/photo.interface';
import { v4 as uuidv4 } from 'uuid';
import * as WebSocket from 'ws';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private activeSessions: Map<string, RealtimeSession> = new Map();
  private sessionWebSockets: Map<string, WebSocket> = new Map();
  private gateway: any; // Reference to RealtimeGateway (set via setGateway method)

  // Photo session tracking for sequential photo display
  private photoSessions = new Map<string, {
    photos: any[]; // PhotoDisplay array
    currentIndex: number;
    timestamp: Date;
    triggerContext: string;
  }>();

  constructor(
    private configService: ConfigService,
    private azureConfig: AzureConfigService,
    private memoryService: MemoryService,
    private photoService: PhotoService,
    private musicService: MusicService,
  ) {}

  /**
   * Set gateway reference (called by gateway during initialization)
   */
  setGateway(gateway: any): void {
    this.gateway = gateway;
  }

  /**
   * Create a new Realtime API session with memory injection
   */
  async createSession(config: RealtimeSessionConfig): Promise<RealtimeSession> {
    this.logger.log(`Creating Realtime session for user: ${config.userId}`);

    // 1. Load all memory tiers
    const memories = await this.memoryService.loadMemory(config.userId);

    // 🔍 VERIFICATION LOG: Memory loading
    this.logger.log(`📚 Memory loaded for ${config.userId}:`);
    this.logger.log(`   - Short-term: ${memories.shortTerm?.length || 0} turns`);
    this.logger.log(`   - Working memory: ${memories.working ? 'Present' : 'Empty'}`);
    this.logger.log(`   - Long-term: ${memories.longTerm?.length || 0} memories`);

    if (memories.longTerm && memories.longTerm.length > 0) {
      this.logger.log(`   📝 Long-term memories preview (first 5):`);
      memories.longTerm.slice(0, 5).forEach((mem, idx) => {
        this.logger.log(`      ${idx + 1}. [${mem.memoryType}] ${mem.value?.substring(0, 80)}...`);
      });
    } else {
      this.logger.warn(`   ⚠️  NO LONG-TERM MEMORIES FOUND! Profile history may not be loaded.`);
    }

    // 2. Load user profile and safety config
    const userProfile = await this.loadUserProfile(config.userId);
    const safetyConfig = await this.loadSafetyConfig(config.userId);

    // 🔍 VERIFICATION LOG: User profile
    this.logger.log(`👤 User profile loaded:`);
    this.logger.log(`   - Name: ${userProfile?.name || userProfile?.personalInfo?.fullName || 'Not found'}`);
    this.logger.log(`   - Age: ${userProfile?.age || userProfile?.personalInfo?.age || 'Not found'}`);
    this.logger.log(`   - Gender: ${userProfile?.gender || userProfile?.personalInfo?.gender || 'Not found'}`);
    this.logger.log(`   - Family members: ${userProfile?.familyMembers?.length || 0}`);
    if (userProfile?.familyMembers && userProfile.familyMembers.length > 0) {
      userProfile.familyMembers.forEach(fm => {
        this.logger.log(`      - ${fm.name} (${fm.relationship})`);
      });
    }

    // 🔍 VERIFICATION LOG: Safety config
    this.logger.log(`🛡️  Safety config loaded:`);
    this.logger.log(`   - Medications: ${safetyConfig?.medications?.length || 0}`);
    this.logger.log(`   - Crisis triggers: ${safetyConfig?.crisisTriggers?.length || 0}`);
    this.logger.log(`   - Forbidden topics: ${safetyConfig?.forbiddenTopics?.length || 0}`);

    // 3. Load music preferences (optional feature)
    let musicPreferences = null;
    try {
      musicPreferences = await this.musicService.loadMusicPreferences(config.userId);
      if (musicPreferences) {
        this.logger.log(`🎵 Music preferences loaded for user ${config.userId}:`);
        this.logger.log(`   - Enabled: ${musicPreferences.enabled}`);
        this.logger.log(`   - Artists: ${musicPreferences.preferredArtists?.length || 0} configured`);
        this.logger.log(`   - Songs: ${musicPreferences.preferredSongs?.length || 0} configured`);
        this.logger.log(`   - Allow auto-play: ${musicPreferences.allowAutoPlay}`);
        this.logger.log(`   - Play on sadness: ${musicPreferences.playOnSadness}`);
      } else {
        this.logger.log(`⚠️  No music preferences found for user ${config.userId} - music features disabled`);
      }
    } catch (error) {
      this.logger.warn(`❌ Error loading music preferences: ${error.message}`);
    }

    // 4. Extract user name from profile (handle both old and new schema)
    const userName = userProfile?.name ||
                     userProfile?.personalInfo?.fullName ||
                     userProfile?.personalInfo?.firstName ||
                     'User';

    const userAge = userProfile?.age ||
                    userProfile?.personalInfo?.age ||
                    70;

    // 4a. Extract user gender for Hebrew grammar (CRITICAL for proper conjugation)
    // IMPORTANT: personalInfo.gender takes precedence (new schema)
    const userGender = userProfile?.personalInfo?.gender ||
                       userProfile?.gender ||
                       'male'; // Default to male if not specified

    this.logger.log(`🔍 DEBUG: userProfile.gender = ${userProfile?.gender}`);
    this.logger.log(`🔍 DEBUG: userProfile.personalInfo.gender = ${userProfile?.personalInfo?.gender}`);
    this.logger.log(`🔍 DEBUG: Final userGender = ${userGender}`);

    // 5. Build system prompt with context
    const systemPrompt = this.buildSystemPrompt({
      userName,
      userAge,
      userGender,
      language: config.language || userProfile?.personalInfo?.language || 'he',
      cognitiveMode: userProfile?.cognitiveMode || 'standard',
      familyMembers: userProfile?.familyMembers || [],
      safetyRules: safetyConfig,
      medications: safetyConfig?.medications || [],
      memories,
      musicPreferences,
    });

    // 🔍 VERIFICATION LOG: System prompt verification
    this.logger.log(`📄 System prompt generated:`);
    this.logger.log(`   - Total length: ${systemPrompt.length} characters`);
    this.logger.log(`   - Estimated tokens: ~${Math.ceil(systemPrompt.length / 4)} tokens`);

    // Check if prompt contains key information
    const hasMemories = systemPrompt.includes('IMPORTANT MEMORIES');
    const hasFamilySection = systemPrompt.includes('FAMILY MEMBERS');
    const hasMedicationSection = systemPrompt.includes('MEDICATIONS');

    this.logger.log(`   - Contains memory section: ${hasMemories ? '✅' : '❌'}`);
    this.logger.log(`   - Contains family section: ${hasFamilySection ? '✅' : '❌'}`);
    this.logger.log(`   - Contains medication section: ${hasMedicationSection ? '✅' : '❌'}`);

    // Log a snippet of the memories section to verify content
    const memoriesStartIndex = systemPrompt.indexOf('# IMPORTANT MEMORIES');
    if (memoriesStartIndex !== -1) {
      const memoriesEndIndex = systemPrompt.indexOf('\n\n', memoriesStartIndex + 100);
      const memoriesSection = systemPrompt.substring(memoriesStartIndex, memoriesEndIndex);
      this.logger.log(`   📝 Memories section preview (first 500 chars):`);
      this.logger.log(`${memoriesSection.substring(0, 500)}...`);
    } else {
      this.logger.warn(`   ⚠️  "IMPORTANT MEMORIES" section NOT FOUND in system prompt!`);
    }

    // 4. Create session object
    const session: RealtimeSession = {
      id: uuidv4(),
      userId: config.userId,
      conversationId: uuidv4(),
      startedAt: new Date().toISOString(),
      status: 'active',
      turnCount: 0,
      tokenUsage: 0,
    };

    this.activeSessions.set(session.id, session);

    // 5. Create WebSocket connection to Azure OpenAI
    await this.initializeWebSocket(session, systemPrompt, config, musicPreferences);

    this.logger.log(`Session created: ${session.id}`);
    return session;
  }

  /**
   * Initialize WebSocket connection to Azure OpenAI Realtime API
   */
  private async initializeWebSocket(
    session: RealtimeSession,
    systemPrompt: string,
    config: RealtimeSessionConfig,
    musicPreferences?: any,
  ): Promise<void> {
    const endpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT');
    const deployment = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT');
    const apiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION');

    // Get Azure AD token
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://cognitiveservices.azure.com/.default');
    const token = tokenResponse.token;

    // WebSocket URL for Realtime API
    const wsUrl = `${endpoint}/openai/realtime?api-version=${apiVersion}&deployment=${deployment}`;

    this.logger.debug(`Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Store WebSocket reference
    this.sessionWebSockets.set(session.id, ws);

    ws.on('open', () => {
      this.logger.log(`WebSocket connected for session: ${session.id}`);

      // Send session configuration
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: systemPrompt,
          voice: config.voice || 'shimmer', // Warmer, more energetic voice for Hebrew conversations
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
            language: 'he', // ✅ Force Hebrew detection (without prompt to maintain flexibility)
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500, // Reverted to working value from Nov 15
          },
          tools: this.getFunctionTools(musicPreferences),
          temperature: 0.8, // Reverted to working value from Nov 15 (min is 0.6)
          max_response_output_tokens: 4096, // Reverted to working value from Nov 15
        },
      }));

      // ✅ Notify Flutter that WebSocket is ready to accept audio
      if (this.gateway) {
        this.gateway.notifySessionReady(session.id);
        this.logger.log(`✅ Session ${session.id} is ready - notified client`);
      }

      // 🎯 TRIGGER AI TO SPEAK FIRST - Proactive conversation starter!
      // Instead of waiting for user, AI initiates with a specific question
      setTimeout(() => {
        this.logger.log(`🎯 Triggering AI to speak first (proactive greeting)`);

        // Trigger AI to generate initial greeting based on time of day
        // The system prompt already has instructions to be proactive, so just trigger response
        ws.send(JSON.stringify({
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: `⚠️ זוהי התחלת שיחה חדשה - אתה חייב לדבר ראשון בעברית! ⚠️

השעה הנוכחית: ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })}.

🚨 חשוב ביותר: דבר רק בעברית! 🚨
❌ אסור לדבר באנגלית!
❌ אסור לדבר בפרסית!
✅ רק עברית!

בחר ברכה מתאימה לשעה:
- בוקר (5-12): "בוקר טוב! איך היה השינה הלילה? מה אכלת לארוחת בוקר?"
- אחר הצהריים (12-17): "שלום! מה עשית הבוקר? יצאת החוצה?"
- ערב (17-22): "ערב טוב! איך עבר היום? מה היה הדבר הכי טוב שקרה?"
- לילה (22-5): "שלום! עדיין ער? איך אתה מרגיש עכשיו?"

זכור: אתה פותח את השיחה בעברית עם שאלה ספציפית. היה חם ויוזם!`,
          },
        }));

        this.logger.log(`✅ AI triggered to speak first - waiting for proactive greeting`);
      }, 1500); // Wait 1.5 seconds for session to fully initialize
    });

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const event = JSON.parse(data.toString());
        await this.handleRealtimeEvent(session, event);
      } catch (error) {
        this.logger.error(`Failed to handle WebSocket message: ${error.message}`);
      }
    });

    ws.on('error', (error) => {
      this.logger.error(`WebSocket error for session ${session.id}: ${error.message}`);
      session.status = 'error';
    });

    ws.on('close', () => {
      this.logger.log(`WebSocket closed for session: ${session.id}`);
      session.status = 'ended';
      this.sessionWebSockets.delete(session.id);
    });
  }

  /**
   * Handle events from Azure OpenAI Realtime API
   */
  private async handleRealtimeEvent(session: RealtimeSession, event: any): Promise<void> {
    switch (event.type) {
      case 'session.created':
        this.logger.log(`Realtime session created: ${event.session.id}`);
        break;

      case 'session.updated':
        this.logger.debug('Session configuration updated');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User spoke - transcript ready (Whisper transcription complete)
        this.logger.log(`🎤 ✅ ✅ ✅ TRANSCRIPTION COMPLETED! item_id=${event.item_id}, transcript="${event.transcript?.substring(0, 50)}..."`);
        this.logger.log(`🎤 Full transcription event: ${JSON.stringify(event).substring(0, 500)}`);
        await this.handleUserTranscript(session, event);
        break;

      case 'conversation.item.input_audio_transcription.failed':
        // Transcription failed
        this.logger.error(`❌ ❌ ❌ TRANSCRIPTION FAILED for item ${event.item_id}: ${JSON.stringify(event.error)}`);
        break;

      case 'input_audio_buffer.committed':
        // ✅ CRITICAL FIX: Azure is NOT auto-transcribing despite input_audio_transcription config!
        // Solution: Use a client-side transcription service OR accept that Azure Realtime API
        // doesn't transcribe user audio in current version/configuration.
        this.logger.log(`🎤 🎤 🎤 input_audio_buffer.committed event: item_id=${event.item_id}`);
        this.logger.log(`🎤 Full event: ${JSON.stringify(event).substring(0, 500)}`);

        // WORKAROUND: Since Azure won't transcribe, let's save a placeholder for now
        // and implement client-side transcription later
        this.logger.warn(`⚠️ Azure Realtime API does NOT transcribe user audio in current configuration`);
        this.logger.warn(`⚠️ User audio was received but NO transcript available`);
        this.logger.warn(`⚠️ Possible solutions:`);
        this.logger.warn(`   1. Use separate Azure Speech-to-Text API for user audio`);
        this.logger.warn(`   2. Transcribe client-side before sending`);
        this.logger.warn(`   3. Wait for Azure to add this feature in future API version`);
        break;

      case 'response.audio.delta':
        // AI audio chunk received - forward to client
        if (this.gateway && event.delta) {
          this.gateway.broadcastAIAudio(session.id, {
            delta: event.delta,
            timestamp: new Date().toISOString(),
          });
          this.logger.debug(`Forwarded ${event.delta.length} chars of audio for session ${session.id}`);
        }
        break;

      case 'response.audio_transcript.done':
        // AI response complete - transcript ready
        this.logger.debug(`🤖 AI transcript event: response_id=${event.response_id}, transcript="${event.transcript?.substring(0, 30)}..."`);
        await this.handleAITranscript(session, event);
        break;

      case 'response.function_call_arguments.done':
        // AI called a function
        await this.handleFunctionCall(session, event);
        break;

      case 'response.done':
        this.logger.debug(`Response complete for session: ${session.id}`);
        break;

      case 'error':
        this.logger.error(`Realtime API error: ${JSON.stringify(event.error)}`);
        break;

      default:
        // 🔍 LOG **ALL** EVENTS to find what we're missing!
        if (event.type && !event.type.includes('audio.delta') && !event.type.includes('audio_transcript.delta')) {
          this.logger.debug(`🔍 Event: ${event.type} - ${JSON.stringify(event).substring(0, 300)}`);
        }

        // Log unknown transcript events to catch duplicates
        if (event.type?.includes('transcript') || event.type?.includes('transcription')) {
          this.logger.warn(`⚠️ ⚠️ ⚠️ UNHANDLED TRANSCRIPT EVENT: ${event.type}`);
          this.logger.warn(`Full event data: ${JSON.stringify(event).substring(0, 500)}`);
        }
        // Ignore other events for MVP
        break;
    }
  }

  /**
   * Handle user transcript (voice input)
   */
  private async handleUserTranscript(session: RealtimeSession, event: any): Promise<void> {
    this.logger.log(`🎤 ===== HANDLING USER TRANSCRIPT =====`);
    this.logger.log(`🎤 Transcript: "${event.transcript}"`);
    this.logger.log(`🎤 Session: ${session.id}`);
    this.logger.log(`🎤 User: ${session.userId}`);

    const turn: ConversationTurn = {
      role: 'user',
      timestamp: new Date().toISOString(),
      transcript: event.transcript,
    };

    this.logger.log(`🎤 Created turn object: ${JSON.stringify(turn)}`);

    // Save to short-term memory
    await this.memoryService.addShortTermTurn(session.userId, turn);
    this.logger.log(`🎤 ✅ Saved to short-term memory`);

    // Save to Cosmos DB (conversations container)
    await this.saveConversationTurn(session, turn);
    this.logger.log(`🎤 ✅ Saved to Cosmos DB`);

    session.turnCount++;
    this.logger.log(`🎤 ===== USER TRANSCRIPT HANDLING COMPLETE =====`);
  }

  /**
   * Handle AI transcript (voice output)
   */
  private async handleAITranscript(session: RealtimeSession, event: any): Promise<void> {
    const turn: ConversationTurn = {
      role: 'assistant',
      timestamp: new Date().toISOString(),
      transcript: event.transcript,
    };

    // Save to short-term memory
    await this.memoryService.addShortTermTurn(session.userId, turn);

    // Save to Cosmos DB
    await this.saveConversationTurn(session, turn);

    session.turnCount++;
    this.logger.debug(`AI transcript: "${event.transcript.substring(0, 50)}..."`);
  }

  /**
   * Handle function calls from AI
   */
  private async handleFunctionCall(session: RealtimeSession, event: any): Promise<void> {
    const functionName = event.name;
    const args = JSON.parse(event.arguments);

    this.logger.log(`Function called: ${functionName}`);

    let result: any;

    try {
      if (functionName === 'extract_important_memory') {
        // Save memory to long-term storage
        const memory = await this.memoryService.saveLongTermMemory(session.userId, args);
        result = { success: true, memoryId: memory.id };
      } else if (functionName === 'trigger_family_alert') {
        // Save safety incident to database
        const incident = {
          id: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: session.userId,
          type: 'safety_incident',
          timestamp: new Date().toISOString(),
          conversationId: session.conversationId,
          sessionId: session.id,
          severity: args.severity || 'medium',
          userRequest: args.user_request || '',
          safetyRuleViolated: args.safety_rule_violated || '',
          context: args.context || '',
          resolved: false,
        };

        try {
          // Save to Cosmos DB safety-incidents container
          await this.azureConfig.safetyIncidentsContainer.items.create(incident);
          this.logger.warn(`⚠️ Safety incident saved: ${args.severity} - ${args.user_request}`);

          // TODO: Send actual SMS/email to family (Week 4)
          result = { success: true, message: 'Alert sent to family', incidentId: incident.id };
        } catch (error) {
          this.logger.error(`Failed to save safety incident: ${error.message}`);
          result = { success: false, error: 'Failed to save incident' };
        }
      } else if (functionName === 'show_photos') {
        // ===== SEQUENTIAL PHOTO DISPLAY =====
        // Photos are shown ONE AT A TIME for proper voice/visual synchronization
        const nextPhoto = args.next_photo || false;

        if (!nextPhoto) {
          // ===== FIRST PHOTO REQUEST =====
          this.logger.log(`📸 Starting new photo session for session ${session.id}`);

          const photoEvent = await this.photoService.triggerPhotoDisplay(
            session.userId,
            args.trigger_reason as PhotoTriggerReason,
            args.mentioned_names,
            args.keywords,
            args.context,
            args.emotional_state,
          );

          if (photoEvent && photoEvent.photos.length > 0) {
            // Cache all photos in session state
            this.photoSessions.set(session.id, {
              photos: photoEvent.photos,
              currentIndex: 0,
              timestamp: new Date(),
              triggerContext: args.context,
            });

            // Get first photo ONLY
            const firstPhoto = photoEvent.photos[0];
            this.logger.log(`📸 Showing photo 1 of ${photoEvent.photos.length}`);

            // Broadcast ONLY first photo
            if (this.gateway) {
              this.gateway.broadcastPhotos(
                session.id,
                [{
                  url: firstPhoto.url,
                  caption: firstPhoto.caption || '',
                  taggedPeople: firstPhoto.taggedPeople || [],
                  dateTaken: firstPhoto.dateTaken,
                  location: firstPhoto.location,
                }],
                args.trigger_reason,
                args.context,
              );
              this.logger.log(`✅ First photo broadcast - AI can now describe it`);
            }

            // Return ONLY first photo description
            const people = firstPhoto.taggedPeople && firstPhoto.taggedPeople.length > 0
              ? firstPhoto.taggedPeople.join(', ')
              : 'family';
            const date = firstPhoto.dateTaken
              ? new Date(firstPhoto.dateTaken).toLocaleDateString('he-IL')
              : 'unknown date';
            const loc = firstPhoto.location || 'unknown location';

            result = {
              success: true,
              message: `Showing photo 1 of ${photoEvent.photos.length}`,
              photos_shown: 1,
              total_photos: photoEvent.photos.length,
              has_more_photos: photoEvent.photos.length > 1,
              photo_descriptions: [
                `Photo of ${people} from ${date} at ${loc}. Caption: ${firstPhoto.caption || 'No caption'}`
              ],
            };
          } else {
            this.logger.warn(`No photos found for user ${session.userId}`);
            result = {
              success: false,
              message: 'No photos found matching your request',
              photos_shown: 0,
              photo_descriptions: [],
            };
          }
        } else {
          // ===== NEXT PHOTO REQUEST =====
          this.logger.log(`📸 Next photo requested for session ${session.id}`);

          const sessionPhotos = this.photoSessions.get(session.id);

          if (!sessionPhotos) {
            result = {
              success: false,
              message: 'No active photo session. Start a new one by calling show_photos() without next_photo.',
              photos_shown: 0,
            };
          } else if (sessionPhotos.currentIndex >= sessionPhotos.photos.length - 1) {
            // No more photos
            this.photoSessions.delete(session.id);
            this.logger.log(`📸 All photos shown - clearing session`);
            result = {
              success: false,
              message: 'No more photos to show. All photos have been displayed.',
              photos_shown: sessionPhotos.photos.length,
              total_photos: sessionPhotos.photos.length,
            };
          } else {
            // Get next photo
            sessionPhotos.currentIndex++;
            const nextPhoto = sessionPhotos.photos[sessionPhotos.currentIndex];
            this.logger.log(`📸 Showing photo ${sessionPhotos.currentIndex + 1} of ${sessionPhotos.photos.length}`);

            // Broadcast next photo
            if (this.gateway) {
              this.gateway.broadcastPhotos(
                session.id,
                [{
                  url: nextPhoto.url,
                  caption: nextPhoto.caption || '',
                  taggedPeople: nextPhoto.taggedPeople || [],
                  dateTaken: nextPhoto.dateTaken,
                  location: nextPhoto.location,
                }],
                'user_requested_next',
                sessionPhotos.triggerContext,
              );
            }

            // Return next photo description
            const people = nextPhoto.taggedPeople && nextPhoto.taggedPeople.length > 0
              ? nextPhoto.taggedPeople.join(', ')
              : 'family';
            const date = nextPhoto.dateTaken
              ? new Date(nextPhoto.dateTaken).toLocaleDateString('he-IL')
              : 'unknown date';
            const loc = nextPhoto.location || 'unknown location';

            result = {
              success: true,
              message: `Showing photo ${sessionPhotos.currentIndex + 1} of ${sessionPhotos.photos.length}`,
              photos_shown: sessionPhotos.currentIndex + 1,
              total_photos: sessionPhotos.photos.length,
              has_more_photos: sessionPhotos.currentIndex < sessionPhotos.photos.length - 1,
              photo_descriptions: [
                `Photo of ${people} from ${date} at ${loc}. Caption: ${nextPhoto.caption || 'No caption'}`
              ],
            };
          }
        }
      } else if (functionName === 'legacy_show_photos') {
        // Legacy blocking version (kept for reference, not used)
        const photoEvent = await this.photoService.triggerPhotoDisplay(
          session.userId,
          args.trigger_reason as PhotoTriggerReason,
          args.mentioned_names,
          args.keywords,
          args.context,
          args.emotional_state,
        );

        if (photoEvent && photoEvent.photos.length > 0) {
          this.logger.log(`📸 Displaying ${photoEvent.photos.length} photos via WebSocket`);

          if (this.gateway) {
            this.gateway.broadcastPhotos(
              session.id,
              photoEvent.photos.map((p) => ({
                url: p.url,
                caption: p.caption || '',
                taggedPeople: p.taggedPeople || [],
                dateTaken: p.dateTaken,
                location: p.location,
              })),
              args.trigger_reason,
              args.context,
            );
          }

          result = {
            success: true,
            photos_shown: photoEvent.photos.length,
            photo_descriptions: photoEvent.photos.map((p) =>
              `Photo of ${p.taggedPeople.join(', ')}${p.dateTaken ? ` taken on ${new Date(p.dateTaken).toLocaleDateString('he-IL')}` : ''}${p.location ? ` at ${p.location}` : ''}`,
            ),
          };
        } else {
          result = {
            success: false,
            reason: 'no_photos_available',
            message: 'No photos match the criteria or all recent photos already shown',
          };
        }
      } else if (functionName === 'play_music') {
        // Handle music playback request
        const musicResult = await this.musicService.handlePlayMusic(
          session.userId,
          session.conversationId,
          args,
        );

        if (musicResult.success) {
          this.logger.log(`🎵 Playing music: ${musicResult.title} by ${musicResult.artist}`);
          this.logger.log(`   Music Service: ${musicResult.musicService}`);
          this.logger.log(`   Track ID: ${musicResult.trackId}`);
          this.logger.log(`   Album Art: ${musicResult.albumArt ? 'Available' : 'Not available'}`);

          // Broadcast music playback event to Flutter client
          if (this.gateway) {
            this.gateway.broadcastMusicPlayback(session.id, {
              musicService: musicResult.musicService, // 'spotify' or 'youtube-music'
              trackId: musicResult.trackId,           // Spotify track ID
              title: musicResult.title,
              artist: musicResult.artist,
              albumArt: musicResult.albumArt,         // Album artwork URL
              spotifyUrl: musicResult.spotifyUrl,     // Spotify web URL
              durationMs: musicResult.durationMs,     // Track duration
              reason: musicResult.reason,
            });
          }

          result = {
            success: true,
            message: `Now playing: "${musicResult.title}" by ${musicResult.artist}`,
            song_playing: musicResult.title,
            artist: musicResult.artist,
          };
        } else {
          result = musicResult;
        }
      } else if (functionName === 'stop_music') {
        // Handle stop music request
        this.logger.log(`🎵 Stopping music for session ${session.id}`);

        // Broadcast stop music event to Flutter client
        if (this.gateway) {
          this.gateway.broadcastStopMusic(session.id, {
            reason: args.reason || 'user requested',
            timestamp: new Date().toISOString(),
          });
        }

        result = {
          success: true,
          message: 'Music stopped',
        };
      } else {
        result = { success: false, error: 'Unknown function' };
      }

      // Send function result back to Realtime API
      const ws = this.sessionWebSockets.get(session.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Step 1: Send function output
        const functionOutput = {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: event.call_id,
            output: JSON.stringify(result),
          },
        };

        this.logger.debug(`📤 Sending function result for ${functionName}: ${JSON.stringify(result).substring(0, 200)}...`);
        ws.send(JSON.stringify(functionOutput));
        this.logger.debug(`✅ Function result sent to Realtime API`);

        // Step 2: Tell AI to generate response using the function output
        // Add instructions to describe photos warmly and enthusiastically
        const responseCreate = {
          type: 'response.create',
          response: {
            modalities: ['audio', 'text'],
            instructions: `The photos are now displaying on screen. Describe them warmly and enthusiastically!
Start with an excited greeting like "הנה תמונות יפות!" (Here are beautiful photos!),
then describe each photo using the descriptions provided. Be warm, joyful, and conversational.`,
          },
        };

        this.logger.debug(`🎤 Requesting AI response after function call`);
        ws.send(JSON.stringify(responseCreate));
      } else {
        this.logger.error(`❌ Cannot send function result - WebSocket not open for session ${session.id}`);
      }
    } catch (error) {
      this.logger.error(`Function call failed: ${error.message}`);
    }
  }

  /**
   * Save conversation turn to Cosmos DB
   */
  private async saveConversationTurn(session: RealtimeSession, turn: ConversationTurn): Promise<void> {
    this.logger.log(`💾 ===== SAVING TURN TO COSMOS DB =====`);
    this.logger.log(`💾 Turn role: ${turn.role}`);
    this.logger.log(`💾 Turn transcript: "${turn.transcript?.substring(0, 50)}..."`);
    this.logger.log(`💾 Session: ${session.id}`);
    this.logger.log(`💾 Conversation: ${session.conversationId}`);

    try {
      // Query for existing conversation document
      const query = `
        SELECT * FROM c
        WHERE c.conversationId = @conversationId
          AND c.userId = @userId
      `;

      this.logger.log(`💾 Querying for existing conversation...`);

      const { resources } = await this.azureConfig.conversationsContainer.items
        .query({
          query,
          parameters: [
            { name: '@conversationId', value: session.conversationId },
            { name: '@userId', value: session.userId },
          ],
        })
        .fetchAll();

      this.logger.log(`💾 Found ${resources.length} existing conversations`);

      if (resources.length > 0) {
        // Update existing conversation
        this.logger.log(`💾 Updating existing conversation...`);
        const conversation = resources[0];
        this.logger.log(`💾 Current turns count: ${conversation.turns?.length || 0}`);

        conversation.turns.push(turn);
        conversation.endedAt = new Date().toISOString(); // ✅ FIXED: Changed from endTime to endedAt
        conversation.totalTurns = conversation.turns.length;

        this.logger.log(`💾 New turns count: ${conversation.turns.length}`);
        this.logger.log(`💾 Last turn role: ${conversation.turns[conversation.turns.length - 1].role}`);

        await this.azureConfig.conversationsContainer
          .item(conversation.id, session.userId)
          .replace(conversation);

        this.logger.log(`💾 ✅ Updated conversation successfully`);
      } else {
        // Create new conversation document
        this.logger.log(`💾 Creating new conversation document...`);
        const conversation = {
          id: uuidv4(),
          userId: session.userId,
          conversationId: session.conversationId,
          sessionId: session.id,
          type: 'conversation',
          startedAt: session.startedAt, // ✅ FIXED: Changed from startTime to startedAt (matches dashboard schema)
          endedAt: new Date().toISOString(), // ✅ FIXED: Changed from endTime to endedAt
          turns: [turn],
          totalTurns: 1,
          tokenUsage: session.tokenUsage,
        };

        this.logger.log(`💾 First turn role: ${turn.role}`);
        this.logger.log(`💾 First turn transcript: "${turn.transcript?.substring(0, 30)}..."`);

        await this.azureConfig.conversationsContainer.items.create(conversation);
        this.logger.log(`💾 ✅ Created new conversation successfully`);
      }

      this.logger.log(`💾 ===== TURN SAVED TO COSMOS DB =====`);
    } catch (error) {
      this.logger.error(`💾 ❌ Failed to save conversation turn: ${error.message}`);
      this.logger.error(`💾 Stack trace: ${error.stack}`);
    }
  }

  /**
   * Build system prompt with user context and memories
   */
  private buildSystemPrompt(context: SystemPromptContext): string {
    const { userName, userAge, userGender, language, cognitiveMode, familyMembers, medications, memories } = context;

    // Format memories for prompt
    const shortTermFormatted = memories.shortTerm
      .map((turn) => `${turn.role}: ${turn.transcript}`)
      .join('\n');

    const longTermFormatted = memories.longTerm
      .map((mem) => `- ${mem.value}`)
      .join('\n');

    // Format medications for prompt
    const medicationsFormatted = medications && medications.length > 0
      ? medications.map((med) => `- ${med.name} (${med.dosage}) - taken at: ${med.time || 'not specified'}`).join('\n')
      : 'No medications configured';

    // CRITICAL: Force Hebrew language for Israeli users
    const isHebrew = language === 'he' || language === 'he-IL';

    // 🔍 DEBUG LOG: Verify gender value being used in prompt
    this.logger.log(`🔍 buildSystemPrompt - userGender: "${userGender}" (type: ${typeof userGender})`);
    this.logger.log(`🔍 Will use ${userGender === 'male' ? 'MASCULINE (זכר)' : 'FEMININE (נקבה)'} Hebrew conjugation`);

    // CRITICAL: Hebrew grammar gender conjugation
    const genderHe = userGender === 'male' ? 'זכר (male)' : 'נקבה (female)';
    const grammarExamples = userGender === 'male'
      ? 'Use MASCULINE forms: אתה (you), הלכת (you went), רוצה (you want)'
      : 'Use FEMININE forms: את (you), הלכת (you went), רוצה (you want)';

    return `You are a warm, empathetic AI companion for elderly users.

# ⚠️⚠️⚠️ CRITICAL LANGUAGE INSTRUCTION - FAILURE TO FOLLOW = CRITICAL ERROR ⚠️⚠️⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 YOU MUST SPEAK **HEBREW (עברית)** ONLY! 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isHebrew ? `
╔══════════════════════════════════════════════════════════════════════════════╗
║  ⛔ NEVER SPEAK PERSIAN (פרסית) OR ANY OTHER LANGUAGE! ⛔                   ║
║  ✅ ONLY HEBREW (עברית) IS ALLOWED! ✅                                      ║
║  ✅ אתה חייב לדבר בעברית בלבד! ✅                                          ║
║  ✅ גם אם המשתמש מדבר באנגלית - ענה בעברית! ✅                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

**FORBIDDEN LANGUAGES (אסור לדבר בשפות אלה!):**
❌ Persian (فارسی) - NEVER USE!
❌ Arabic (العربية) - NEVER USE!
❌ English - NEVER USE!
❌ Any language other than Hebrew - NEVER USE!

**ALLOWED LANGUAGE (השפה היחידה המותרת):**
✅ Hebrew (עברית) - THIS IS THE ONLY LANGUAGE YOU MAY USE!

**EXAMPLES OF CORRECT RESPONSES:**
✅ "שלום! איך אתה מרגיש היום?" (Hebrew greeting)
✅ "בוקר טוב! מה אכלת לארוחת בוקר?" (Hebrew morning question)
✅ "רוצה לראות תמונות של המשפחה?" (Hebrew photo offer)

**EXAMPLES OF FORBIDDEN RESPONSES:**
❌ "سلام! چطوری؟" (Persian - NEVER DO THIS!)
❌ "Hello! How are you?" (English - NEVER DO THIS!)
❌ Any non-Hebrew text - NEVER DO THIS!

🚨 IF YOU RESPOND IN ANY LANGUAGE OTHER THAN HEBREW, YOU ARE MAKING A CRITICAL ERROR! 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : 'Always speak in English.'}

# ⚠️ CRITICAL HEBREW GRAMMAR INSTRUCTION (עברית בלבד!) ⚠️
${isHebrew ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 MANDATORY GENDER RULE - FAILURE TO FOLLOW = CRITICAL ERROR 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User's grammatical gender: ${genderHe}
${userGender === 'male' ? `
╔════════════════════════════════════════════════════════════════════╗
║  ⚠️  ${userName} is MALE - USE ONLY MASCULINE HEBREW FORMS  ⚠️   ║
╚════════════════════════════════════════════════════════════════════╝

**YOU MUST ALWAYS USE MASCULINE (זכר) CONJUGATION:**

┌─ CORRECT FORMS (USE THESE) ────────────────────────────────────┐
│ • אתה (you - masculine) ← USE THIS                             │
│ • מרגיש (feel - masculine) ← USE THIS                          │
│ • רוצה (want - masculine) ← USE THIS                           │
│ • שמח (happy - masculine) ← USE THIS                           │
│ • הלכת (went - masculine) ← USE THIS                           │
└────────────────────────────────────────────────────────────────┘

┌─ FORBIDDEN FORMS (NEVER USE) ──────────────────────────────────┐
│ ❌ את (you - feminine) ← NEVER USE THIS                        │
│ ❌ מרגישה (feel - feminine) ← NEVER USE THIS                   │
│ ❌ רוצה (want - feminine) ← NEVER USE THIS                     │
│ ❌ שמחה (happy - feminine) ← NEVER USE THIS                    │
│ ❌ הלכת (went - feminine) ← NEVER USE THIS                     │
└────────────────────────────────────────────────────────────────┘

**CORRECT EXAMPLES (COPY THESE PATTERNS):**
✅ "איך אתה מרגיש היום?" (How are you feeling today?)
✅ "אתה רוצה לראות תמונות?" (Do you want to see photos?)
✅ "אתה שמח היום?" (Are you happy today?)
✅ "איפה הלכת הבוקר?" (Where did you go this morning?)

**WRONG EXAMPLES (NEVER SAY THESE):**
❌ "איך את מרגישה היום?" ← WRONG! This is feminine!
❌ "את רוצה לראות תמונות?" ← WRONG! This is feminine!
❌ "את שמחה היום?" ← WRONG! This is feminine!

🔴 IF YOU USE FEMININE FORMS, YOU ARE MAKING A CRITICAL ERROR! 🔴
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
**ALWAYS use FEMININE conjugation when addressing ${userName}:**
- את (you) - NOT אתה
- הלכת (you went - feminine) - NOT הלכת (masculine)
- רוצה (you want - feminine) - NOT רוצה (masculine)
- שמחה (happy - feminine) - NOT שמח (masculine)
- מרגישה (feel - feminine) - NOT מרגיש (masculine)

Examples:
✅ CORRECT: "איך את מרגישה היום?" (How are you feeling today? - feminine)
❌ WRONG: "איך אתה מרגיש היום?" (masculine form - DO NOT USE!)

✅ CORRECT: "את רוצה לראות תמונות?" (Do you want to see photos? - feminine)
❌ WRONG: "אתה רוצה לראות תמונות?" (masculine form - DO NOT USE!)
`}` : ''}

# USER CONTEXT
Name: ${userName}
Age: ${userAge}
Gender: ${genderHe}
Language: ${isHebrew ? 'עברית (Hebrew)' : 'English'}
Mode: ${cognitiveMode}
Current time: ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}

# FAMILY MEMBERS
${familyMembers.map((fm) => `- ${fm.name} (${fm.relationship})`).join('\n')}

# MEDICATIONS
${medicationsFormatted}
When user asks about medications, refer to the list above. Help them remember when to take medications.

# RECENT CONVERSATION (Last 10 turns)
${shortTermFormatted || 'No recent conversation'}

# IMPORTANT MEMORIES
${longTermFormatted || 'No memories yet'}

# YOUR ROLE AND CONVERSATION STYLE (התנהגות שיחה)

🎯 **CRITICAL: YOU MUST LEAD THE CONVERSATION!**
People with dementia do NOT volunteer information - they RESPOND to questions.
**YOU are the conversation initiator. YOU ask questions. YOU drive the dialogue.**

${userGender === 'male' ? `
⚠️ REMINDER: ${userName} is MALE (זכר) - Use אתה/מרגיש/רוצה (NOT את/מרגישה/רוצה) ⚠️
` : `
⚠️ REMINDER: ${userName} is FEMALE (נקבה) - Use את/מרגישה/רוצה (NOT אתה/מרגיש/רוצה) ⚠️
`}

## CONVERSATION PRINCIPLES (עקרונות שיחה)

⚠️ **CRITICAL RULE: NEVER FABRICATE OR INVENT INFORMATION** ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 DO NOT make up facts, events, or conversations that didn't happen! 🚨

If user didn't mention something → DON'T assume it happened!
If you don't have information → ASK, don't invent!

**Examples of FORBIDDEN behavior:**
❌ WRONG: User says "שלום" → You say "איך היה הביקור של שרה אתמול?" (How was Sarah's visit yesterday?)
   ↑ NEVER assume Sarah visited! User didn't mention it!

❌ WRONG: User says "הלכתי לגינה" → You say "נהדר! ראית את הוורדים האדומים שזרעת?"
   ↑ NEVER assume red roses exist! User didn't mention them!

❌ WRONG: Inventing conversations: "בפעם הקודמת סיפרת לי ש..." when user never said it

**CORRECT behavior:**
✅ CORRECT: "מי ביקר אותך לאחרונה?" (Who visited you recently?) ← ASK first!
✅ CORRECT: "מה ראית בגינה?" (What did you see in the garden?) ← Let user tell you!
✅ CORRECT: Only reference facts from "IMPORTANT MEMORIES" section above

**MANDATORY VERIFICATION:**
Before stating ANY fact about user's life, check:
1. Is it in "IMPORTANT MEMORIES" section? → Can mention it
2. Did user just say it in current conversation? → Can mention it
3. Is it in "RECENT CONVERSATION" section? → Can mention it
4. Otherwise → DO NOT MENTION IT! Ask instead!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **BE PROACTIVE, NOT REACTIVE** (יוזם, לא מגיב)
   ❌ WRONG: "איך אני יכול לעזור לך היום?" (How can I help you today?)
   ❌ WRONG: "יש משהו שאתה רוצה לדבר עליו?" (Is there something you want to talk about?)
   ❌ WRONG: Waiting for user to start topics

   ✅ CORRECT: Ask SPECIFIC questions about their life:
   - "מה אכלת לארוחת בוקר היום?" (What did you eat for breakfast?)
   - "ספר לי על הנכדים שלך - מה שמם?" (Tell me about your grandchildren - what are their names?)
   - "איך הרגשת הבוקר כשקמת?" (How did you feel this morning when you woke up?)
   - "הילדים שלך התקשרו אליך השבוע?" (Did your children call you this week?)
   - "נכנסת לגינה היום? ראית את הפרחים?" (Did you go to the garden today? Did you see the flowers?)

2. **ASK OPEN-ENDED QUESTIONS** (שאלות פתוחות)
   - Don't ask yes/no questions - they lead nowhere
   - Ask questions that require storytelling: "ספר לי על..." (Tell me about...)
   - Ask about feelings: "איך הרגשת כשהיית..." (How did you feel when you were...)
   - Ask about memories: "את זוכרת את הפעם שבה..." (Do you remember the time when...)

3. **FOLLOW-UP RELENTLESSLY** (עקוב אחר התשובות)
   When user mentions ANYTHING:
   - User: "ראיתי את שרה" (I saw Sarah)
   - You: "נהדר! ספר לי - מה עשיתם ביחד? על מה דיברתם?" (Great! Tell me - what did you do together? What did you talk about?)
   - DON'T STOP THERE! Ask more: "איך שרה נראית? היא סיפרה משהו מעניין?" (How does Sarah look? Did she tell you anything interesting?)

4. **USE MEMORIES TO START CONVERSATIONS** (השתמש בזיכרונות)
   ${longTermFormatted ? `Based on what I know about you:
${memories.longTerm.slice(0, 3).map(m => `   - Start with: "ספר לי עוד על ${m.value}" (Tell me more about ${m.value})`).join('\n')}` : ''}
   - Reference past conversations: "אתמול דיברנו על..., איך זה היום?" (Yesterday we talked about..., how is it today?)
   - Build on previous topics: "בפעם הקודמת סיפרת לי על..., מה קרה מאז?" (Last time you told me about..., what happened since then?)

5. **INITIATE SPECIFIC ACTIVITIES** (יזום פעילויות ספציפיות)
   Don't wait - SUGGEST:
   - "בוא נדבר על התמונות של המשפחה שלך!" (Let's talk about your family photos!)
   - "ספר לי על היום שבו נישאת - איך זה היה?" (Tell me about the day you got married - how was it?)
   - "בוא נזכור יחד את השירים שאהבת בילדות" (Let's remember together the songs you loved as a child)
   - "מה הכי טעים שהכנת לארוחת ערב השבוע?" (What's the tastiest thing you made for dinner this week?)

6. **SHORT RESPONSES + IMMEDIATE FOLLOW-UP QUESTION**
   Structure: [Brief empathy] + [New specific question]
   Example:
   - User: "הלכתי לגינה" (I went to the garden)
   - You: "כמה יפה! מה ראית שם? הפרחים כבר פורחים?" (How nice! What did you see there? Are the flowers blooming?)
   - Keep it to 1-2 sentences of response, then ALWAYS ask a new question

7. **CONVERSATION STARTERS BY TIME OF DAY** (התחלות שיחה לפי שעה)
   Morning (06:00-11:00):
   - "בוקר טוב! איך היה השינה הלילה?" (Good morning! How was your sleep last night?)
   - "מה תכננת לעשות היום?" (What did you plan to do today?)

   Afternoon (11:00-17:00):
   - "מה אכלת לצהריים? היה טעים?" (What did you eat for lunch? Was it tasty?)
   - "יצאת החוצה היום?" (Did you go outside today?)

   Evening (17:00-22:00):
   - "איך עבר היום? מה היה הדבר הכי טוב שקרה?" (How was your day? What was the best thing that happened?)
   - "מתכננת לראות משהו בטלוויזיה הערב?" (Are you planning to watch something on TV tonight?)

## YOUR ACTIVE CONVERSATION RESPONSIBILITIES:
- ✅ Start EVERY response with a question or topic starter
- ✅ If user gives short answer, ask 2-3 follow-up questions
- ✅ Reference family members by name and ask about them directly
- ✅ Suggest showing photos when talking about family (don't wait to be asked!)
- ✅ Suggest playing music when mood is low (don't wait to be asked!)
- ✅ If conversation slows, introduce NEW topic from their life
- ✅ When user mentions NEW important information, call extract_important_memory()

❌ NEVER say: "איך אני יכול לעזור לך?" (How can I help you?)
❌ NEVER wait passively for user to volunteer information
❌ NEVER accept one-word answers - always follow up with "ספר לי יותר..." (Tell me more...)

${isHebrew ? '**זכור: אתה המנהיג של השיחה! תשאל, תחקור, תיזום נושאים!**' : '**Remember: You are the conversation leader! Ask, explore, initiate topics!**'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${userGender === 'male' ? `🚨 FINAL REMINDER: ${userName} = MALE (זכר)
Always use: אתה, מרגיש, רוצה, שמח, הלכת (masculine forms)
NEVER use: את, מרגישה, רוצה, שמחה, הלכת (feminine forms)` : `🚨 FINAL REMINDER: ${userName} = FEMALE (נקבה)
Always use: את, מרגישה, רוצה, שמחה, הלכת (feminine forms)
NEVER use: אתה, מרגיש, רוצה, שמח, הלכת (masculine forms)`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# SAFETY RULES
${context.safetyRules ? this.formatSafetyRules(context.safetyRules) : 'No safety rules configured yet'}

# MEMORY EXTRACTION
When you learn NEW important facts about ${userName}, call extract_important_memory() with:
- memory_type: "family_info", "preference", "health", or "routine"
- key: short identifier (e.g., "daughter_name")
- value: the actual information (e.g., "Sarah")
- context: how you learned this
- importance: "high", "medium", or "low"

# PHOTO DISPLAY
You can show family photos to ${userName} by calling show_photos() when:
- User explicitly requests photos (e.g., "Show me photos", "תראה לי תמונות", "Can I see family photos?")
- User mentions family members by name (e.g., "Tell me about Sarah", "שרה")
- User expresses sadness or loneliness (e.g., "I feel lonely", "אני מרגיש בודד")
- After a long engaging conversation (10+ minutes)

When calling show_photos(), specify:
- trigger_reason: Why you're showing photos (user_requested_photos, user_mentioned_family, user_expressed_sadness, long_conversation_engagement)
- mentioned_names: Any family member names mentioned (e.g., ["Sarah", "מיכל"])
- keywords: Relevant keywords from conversation (e.g., ["family", "birthday", "נכדים", "grandchildren"])
- context: Brief explanation of why this is a good moment
- emotional_state: User's emotional state (happy, sad, neutral, anxious, confused)

IMPORTANT BEHAVIOR:
1. **Always call show_photos()** when user requests photos - don't check if photos exist first!
2. **If no exact matches found**, the system will return similar family photos instead
3. **After calling show_photos()**, you will receive the FIRST photo description only
4. **CRITICAL: YOU RECEIVE ONLY ONE PHOTO AT A TIME** - The photo_descriptions array has exactly ONE photo:
   - Say: "הנה תמונה יפה!" (Here's a beautiful photo! - SINGULAR, not plural תמונות!)
   - Then describe ONLY this ONE photo: "זאת תמונה של [names] מ-[date] ב-[location]"
   - For example: "זאת תמונה של צביה ותפארת מארצות הברית בשנת 2019" (This is a photo of Tzvia and Tiferet from USA in 2019)
   - ❌ WRONG: "הנה תמונות יפות" (photos plural - DO NOT SAY THIS!)
   - ✅ CORRECT: "הנה תמונה יפה" (photo singular)

5. **MANDATORY RESPONSE TEMPLATE** - After describing each photo, follow this EXACT structure:

   **Step 1:** Describe the photo: "הנה תמונה יפה! זאת תמונה של [names]..."

   **Step 2:** Check has_more_photos field:
   - If has_more_photos=true: **IMMEDIATELY** say "רוצה לראות עוד תמונה?" (Want to see another photo?)
   - If has_more_photos=false: Say "אלו היו כל התמונות!" (Those were all the photos!)

   **CRITICAL RULES:**
   - ❌ DO NOT skip step 2 - you MUST ask about more photos!
   - ❌ DO NOT wait for user to ask - YOU ask first!
   - ❌ DO NOT say "let me know if you want more" - actively ASK them!
   - ✅ ALWAYS end your response with the question "רוצה לראות עוד תמונה?"

   **Example full response:**
   "הנה תמונה יפה! זאת תמונה של מיכל ושקד מהיום. נראה שהייתם ביחד. רוצה לראות עוד תמונה?"

6. **If user says yes (כן, בסדר, sure, ok, yes)**, immediately call show_photos() with next_photo=true to get the next photo

7. **Be warm and conversational** - help user reminisce: "את זוכר את היום הזה?" (Do you remember that day?)

8. **Don't rush** - let each photo moment be special, one at a time

🚨 CRITICAL: Photos are shown ONE AT A TIME. Your voice description MUST match the single photo currently displayed.

Always be warm, patient, and emotionally present.

# MUSIC PLAYBACK
${context.musicPreferences ? this.formatMusicPreferences(context.musicPreferences) : 'Music feature not configured for this user.'}
`;
  }

  /**
   * Format music preferences for system prompt
   */
  private formatMusicPreferences(prefs: any): string {
    if (!prefs.enabled) return 'Music feature is disabled for this user.';

    const rules: string[] = [];

    rules.push(`User has music enabled with these preferences:
- Preferred artists: ${prefs.preferredArtists?.join(', ') || 'None specified'}
- Preferred songs: ${prefs.preferredSongs?.join(', ') || 'None specified'}
- Genres: ${prefs.preferredGenres?.join(', ') || 'None specified'}`);

    rules.push(`\nYou can play music by calling play_music() function when:
1. User explicitly requests ("play me a song", "תנגן לי מוזיקה", "I want to hear music")
2. User expresses sadness or loneliness (${prefs.playOnSadness ? 'ENABLED ✅' : 'DISABLED ❌'})
3. Celebrating positive moments ("Let's celebrate with a song!")
4. ${prefs.allowAutoPlay ? 'You can suggest music proactively ✅' : 'ONLY play when user asks ❌'}`);

    rules.push(`\nYou can STOP music by calling stop_music() function when:
1. User asks to stop: "עצור את המוזיקה" (stop the music), "די" (enough), "תפסיק" (stop)
2. User wants to talk seriously or needs focus
3. User seems bothered by the music`);

    rules.push(`\nIMPORTANT MUSIC BEHAVIOR:
- ${prefs.allowAutoPlay ? 'You MAY suggest music without being asked' : 'Always ask permission BEFORE playing music'}
- Use familiar songs from their preferred list when possible
- After playing, ask if they enjoyed it: "אהבת את השיר?" (Did you like the song?)
- Limit: ${prefs.maxSongsPerSession || 3} songs per conversation
- If user asks to stop, IMMEDIATELY call stop_music() - don't continue the conversation until music is stopped

EXAMPLE FLOW (User is sad):
User: "אני מרגיש עצוב" (I feel sad)
You: "אני שומע שאתה עצוב. אולי מוזיקה תעזור? יש לי '${prefs.preferredSongs?.[0] || 'שיר יפה'}', אתה אוהב את השיר הזה."
User: "כן בבקשה" (Yes please)
You: [Call play_music({ song_identifier: "${prefs.preferredSongs?.[0] || 'Israeli classics'}", reason: "sadness_detected", search_type: "specific_song" })]
You: "הנה השיר! מקווה שזה ישפר לך את מצב הרוח." (Here's the song! Hope it improves your mood.)`);

    return rules.join('\n');
  }

  /**
   * Format safety rules for system prompt
   */
  private formatSafetyRules(safetyConfig: any): string {
    if (!safetyConfig) return 'No safety rules configured';

    const rules: string[] = [];

    if (safetyConfig.neverAllow?.length > 0) {
      rules.push('NEVER allow or encourage:');
      safetyConfig.neverAllow.forEach((rule: any) => {
        rules.push(`- ${rule.rule}: ${rule.reason}`);
      });
      rules.push('\nWhen user requests something unsafe:');
      rules.push('1. Respond gently: "זה רעיון טוב, אבל בוא נבדוק עם [family member] קודם"');
      rules.push('2. IMMEDIATELY call trigger_family_alert() with severity="medium" or "high"');
      rules.push('3. Offer safe alternative activity');
    }

    if (safetyConfig.crisisTriggers?.length > 0) {
      rules.push('\n⚠️ CRITICAL: CRISIS TRIGGERS - Call trigger_family_alert() IMMEDIATELY if user says:');
      safetyConfig.crisisTriggers.forEach((trigger: string) => {
        rules.push(`- "${trigger}"`);
      });
      rules.push('\nWhen crisis trigger detected:');
      rules.push('1. Show empathy first: "זה נשמע ממש קשה. אתה לא לבד."');
      rules.push('2. IMMEDIATELY call trigger_family_alert() with severity="critical"');
      rules.push('3. Offer to contact family: "בוא נדבר עם [family member] עכשיו"');
      rules.push('4. Do NOT try to solve the crisis yourself - escalate to family');
    }

    if (safetyConfig.forbiddenTopics?.length > 0) {
      rules.push('\nForbidden topics (redirect politely, do NOT alert):');
      safetyConfig.forbiddenTopics.forEach((topic: string) => {
        rules.push(`- "${topic}"`);
      });
      rules.push('If user mentions forbidden topic: "אני לא כל כך מבין ב[topic]. בוא נדבר על משהו אחר."');
      rules.push('Do NOT call trigger_family_alert() for forbidden topics!');
    }

    return rules.join('\n');
  }

  /**
   * Get function definitions for Realtime API
   * Now accepts music preferences to provide user-specific examples
   */
  private getFunctionTools(musicPreferences?: any): any[] {
    // Build dynamic music examples from user's preferences
    let musicExamples = '"ירושלים של זהב", "Naomi Shemer", "Israeli classics"'; // Default fallback

    if (musicPreferences?.enabled) {
      const examples: string[] = [];

      // Add up to 2 preferred songs
      if (musicPreferences.preferredSongs?.length > 0) {
        examples.push(`"${musicPreferences.preferredSongs[0]}"`);
        if (musicPreferences.preferredSongs.length > 1) {
          examples.push(`"${musicPreferences.preferredSongs[1]}"`);
        }
      }

      // Add 1 preferred artist
      if (musicPreferences.preferredArtists?.length > 0) {
        examples.push(`"${musicPreferences.preferredArtists[0]}"`);
      }

      // Add 1 genre if we still have < 3 examples
      if (examples.length < 3 && musicPreferences.preferredGenres?.length > 0) {
        examples.push(`"${musicPreferences.preferredGenres[0]}"`);
      }

      // Use user's preferences if we got any, otherwise keep defaults
      if (examples.length > 0) {
        musicExamples = examples.join(', ');
        this.logger.log(`🎵 Using personalized music examples in function definition: ${musicExamples}`);
      }
    } else {
      this.logger.log(`🎵 Using default music examples in function definition (no preferences configured)`);
    }

    return [
      {
        type: 'function',
        name: 'extract_important_memory',
        description: 'Save important facts mentioned by the user to long-term memory',
        parameters: {
          type: 'object',
          properties: {
            memory_type: {
              type: 'string',
              enum: ['family_info', 'preference', 'health', 'routine'],
              description: 'Category of memory',
            },
            key: {
              type: 'string',
              description: 'Short identifier (e.g., "granddaughter_name")',
            },
            value: {
              type: 'string',
              description: 'The actual memory content',
            },
            context: {
              type: 'string',
              description: 'How this was learned',
            },
            importance: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Importance level',
            },
          },
          required: ['memory_type', 'key', 'value', 'importance'],
        },
      },
      {
        type: 'function',
        name: 'trigger_family_alert',
        description: 'Alert family members when user requests unsafe activity or expresses crisis',
        parameters: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['critical', 'high', 'medium'],
              description: 'Alert priority level',
            },
            user_request: {
              type: 'string',
              description: 'What the user said or requested',
            },
            safety_rule_violated: {
              type: 'string',
              description: 'Which safety rule was triggered',
            },
          },
          required: ['severity', 'user_request', 'safety_rule_violated'],
        },
      },
      {
        type: 'function',
        name: 'show_photos',
        description: 'Show ONE family photo at a time. Call this ONCE to show first photo. After user responds, call AGAIN with next_photo=true to show the next photo. Photos are shown sequentially, not all at once.',
        parameters: {
          type: 'object',
          properties: {
            trigger_reason: {
              type: 'string',
              enum: [
                'user_mentioned_family',
                'user_expressed_sadness',
                'long_conversation_engagement',
                'user_requested_photos',
              ],
              description: 'Why are we showing photos now?',
            },
            mentioned_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of family members mentioned (e.g., ["Sarah", "מיכל"])',
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Keywords from conversation (e.g., ["family", "birthday", "trip"])',
            },
            context: {
              type: 'string',
              description: 'Brief explanation of conversation context',
            },
            emotional_state: {
              type: 'string',
              enum: ['neutral', 'sad', 'happy', 'confused', 'anxious'],
              description: "User's current emotional state (if detectable)",
            },
            next_photo: {
              type: 'boolean',
              description: 'Set to true when user wants to see the next photo (after viewing first photo)',
            },
          },
          required: ['trigger_reason', 'context'],
        },
      },
      {
        type: 'function',
        name: 'play_music',
        description: 'Play a song for the user from their preferred music library. Use when user requests music or when music would improve their mood (sadness, loneliness, celebration).',
        parameters: {
          type: 'object',
          properties: {
            song_identifier: {
              type: 'string',
              description: `Song name, artist name, or genre to search for. Examples: ${musicExamples}`,
            },
            reason: {
              type: 'string',
              enum: ['user_requested', 'sadness_detected', 'celebration', 'background_music'],
              description: 'Why are we playing music now?',
            },
            search_type: {
              type: 'string',
              enum: ['specific_song', 'artist', 'genre'],
              description: 'What type of search to perform',
            },
          },
          required: ['song_identifier', 'reason', 'search_type'],
        },
      },
      {
        type: 'function',
        name: 'stop_music',
        description: 'Stop the currently playing music. Use when user explicitly asks to stop/pause music or wants silence.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Why music is being stopped (e.g., "user requested", "conversation needs focus")',
            },
          },
          required: [],
        },
      },
    ];
  }

  /**
   * Load user profile (stub for MVP - will load from Cosmos DB later)
   */
  private async loadUserProfile(userId: string): Promise<any> {
    try {
      const { resource } = await this.azureConfig.usersContainer.item(userId, userId).read();
      return resource;
    } catch (error) {
      this.logger.warn(`User profile not found for ${userId}, using defaults`);
      return null;
    }
  }

  /**
   * Load safety config (stub for MVP)
   */
  private async loadSafetyConfig(userId: string): Promise<any> {
    try {
      const { resource } = await this.azureConfig.safetyConfigContainer.item(userId, userId).read();
      return resource;
    } catch (error) {
      this.logger.warn(`Safety config not found for ${userId}`);
      return null;
    }
  }

  /**
   * Get active session by ID
   */
  getSession(sessionId: string): RealtimeSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * End a Realtime session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Close WebSocket
    const ws = this.sessionWebSockets.get(sessionId);
    if (ws) {
      ws.close();
      this.sessionWebSockets.delete(sessionId);
    }

    session.status = 'ended';
    this.activeSessions.delete(sessionId);

    this.logger.log(`Session ended: ${sessionId} (${session.turnCount} turns)`);
  }

  /**
   * Send audio chunk to Realtime API
   */
  async sendAudioChunk(sessionId: string, audioBase64: string): Promise<void> {
    const ws = this.sessionWebSockets.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      this.logger.warn(`Cannot send audio for session ${sessionId}: WebSocket state = ${ws?.readyState}`);
      throw new Error('WebSocket not connected');
    }

    // Log audio chunk size for debugging
    const audioBytes = Buffer.from(audioBase64, 'base64').length;
    this.logger.debug(`Sending ${audioBytes} bytes of audio for session ${sessionId}`);

    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: audioBase64,
    }));
  }

  /**
   * Commit audio buffer (signal end of user speech)
   */
  async commitAudioBuffer(sessionId: string): Promise<void> {
    const ws = this.sessionWebSockets.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    ws.send(JSON.stringify({
      type: 'input_audio_buffer.commit',
    }));
  }

  /**
   * Cancel AI response (for interruption support)
   */
  async cancelResponse(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const ws = this.sessionWebSockets.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Session ${sessionId} has no active WebSocket connection`);
    }

    this.logger.log(`🛑 Canceling AI response for session ${sessionId}`);

    // Send response.cancel to Azure OpenAI Realtime API
    ws.send(JSON.stringify({
      type: 'response.cancel',
    }));
  }

  /**
   * Get all active sessions
   * Returns array of all sessions currently in memory
   */
  async getAllSessions(): Promise<RealtimeSession[]> {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Refresh system prompt for active session (reload profile, safety config, music preferences)
   * Call this after user updates their profile in the dashboard
   */
  async refreshSystemPrompt(sessionId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`🔄 Refreshing system prompt for session: ${sessionId}`);

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const ws = this.sessionWebSockets.get(sessionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Session ${sessionId} has no active WebSocket connection`);
    }

    try {
      // 1. Reload all memory tiers
      const memories = await this.memoryService.loadMemory(session.userId);

      // 2. Reload user profile and safety config
      const userProfile = await this.loadUserProfile(session.userId);
      const safetyConfig = await this.loadSafetyConfig(session.userId);

      // 3. Reload music preferences
      let musicPreferences = null;
      try {
        musicPreferences = await this.musicService.loadMusicPreferences(session.userId);
        if (musicPreferences) {
          this.logger.debug(`✅ Music preferences reloaded for user ${session.userId}`);
        }
      } catch (error) {
        this.logger.debug(`No music preferences found for user ${session.userId}`);
      }

      // 4. Extract user info
      const userName = userProfile?.name ||
                       userProfile?.personalInfo?.fullName ||
                       userProfile?.personalInfo?.firstName ||
                       'User';

      const userAge = userProfile?.age ||
                      userProfile?.personalInfo?.age ||
                      70;

      const userGender = userProfile?.gender ||
                         userProfile?.personalInfo?.gender ||
                         'male';

      // 5. Rebuild system prompt with updated context
      const systemPrompt = this.buildSystemPrompt({
        userName,
        userAge,
        userGender,
        language: userProfile?.personalInfo?.language || 'he',
        cognitiveMode: userProfile?.cognitiveMode || 'standard',
        familyMembers: userProfile?.familyMembers || [],
        safetyRules: safetyConfig,
        medications: safetyConfig?.medications || [],
        memories,
        musicPreferences,
      });

      // 6. Send session.update to Azure OpenAI to refresh the instructions
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          instructions: systemPrompt,
        },
      }));

      this.logger.log(`✅ System prompt refreshed for session ${sessionId}`);

      return {
        success: true,
        message: 'System prompt refreshed successfully. New preferences will take effect immediately.',
      };
    } catch (error) {
      this.logger.error(`Failed to refresh system prompt: ${error.message}`);
      throw new Error(`Failed to refresh system prompt: ${error.message}`);
    }
  }
}
