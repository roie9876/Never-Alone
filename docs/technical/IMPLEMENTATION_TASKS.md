# 📋 Implementation Task List

**Purpose:** Prioritized, concrete tasks to build Never Alone MVP.  
**Format:** Week-by-week breakdown with dependencies, acceptance criteria, and time estimates.

---

## 🎯 MVP Goal

**Ship in 6-8 weeks:**
- Memory-enabled AI companion (3-tier memory system)
- Medication reminders + daily check-ins (pre-recorded audio)
- Mac desktop app (Flutter)
- Family dashboard (basic monitoring)
- Hebrew language support

**NOT in MVP:** Embeddings, wake word, multi-region, advanced analytics (see [mvp-simplifications.md](./mvp-simplifications.md))

---

## 📅 Week 1: Foundation (Infrastructure + Core Services)

### 🔹 Task 1.1: Azure Infrastructure Setup
**Owner:** DevOps/Backend Engineer  
**Time:** 4-6 hours  
**Priority:** P0 (blocks everything)  
**Dependencies:** None

**What to build:**
1. Create Azure resource group: `never-alone-mvp-rg`
2. Deploy Azure OpenAI resource (East US 2)
   - Deploy model: `gpt-4o-realtime-preview`
3. Create Cosmos DB account (NoSQL API)
   - Create database: `never-alone`
   - Create 6 containers (see schemas below)
4. Create Redis Cache (Standard C1, 1GB)
5. Create Blob Storage account
   - Container: `audio-files` (public read access)

**Acceptance criteria:**
- ✅ Can authenticate to all Azure services
- ✅ Can create Cosmos DB document via SDK
- ✅ Can set/get Redis key
- ✅ Can upload/download from Blob Storage
- ✅ Azure OpenAI model responds to test prompt

**Reference:** [cosmos-db-design.md](./cosmos-db-design.md), [architecture.md](./architecture.md)

**Cosmos DB Containers to Create:**
```json
[
  { "name": "users", "partitionKey": "/userId" },
  { "name": "conversations", "partitionKey": "/userId", "ttl": 7776000 },
  { "name": "memories", "partitionKey": "/userId" },
  { "name": "reminders", "partitionKey": "/userId" },
  { "name": "photos", "partitionKey": "/userId" },
  { "name": "safety-config", "partitionKey": "/userId" }
]
```

---

### 🔹 Task 1.2: NestJS Project Setup
**Owner:** Backend Engineer  
**Time:** 2-3 hours  
**Priority:** P0  
**Dependencies:** None

**What to build:**
1. Initialize NestJS project: `nest new backend`
2. Install Azure SDKs:
   ```bash
   npm install @azure/cosmos redis @azure/storage-blob @azure/openai
   ```
3. Create project structure:
   ```
   backend/
   ├── src/
   │   ├── services/
   │   │   ├── memory.service.ts
   │   │   ├── realtime.service.ts
   │   │   └── reminder.service.ts
   │   ├── controllers/
   │   │   ├── memory.controller.ts
   │   │   └── reminder.controller.ts
   │   └── config/
   │       └── azure.config.ts
   ```
4. Set up environment variables (`.env`)
5. Create health check endpoint: `GET /health`

**Acceptance criteria:**
- ✅ `npm run start:dev` works
- ✅ Health check returns 200
- ✅ Environment variables load correctly
- ✅ Can import Azure SDKs without errors

**Reference:** [architecture.md](./architecture.md) - Tech Stack section

---

### 🔹 Task 1.3: Memory Service - Short-Term Memory
**Owner:** Backend Engineer  
**Time:** 6-8 hours  
**Priority:** P0  
**Dependencies:** Task 1.1, Task 1.2

**What to build:**
1. Create `MemoryService` class
2. Implement Redis connection
3. Implement methods:
   - `saveShortTermMemory(userId, conversationTurns)` - Save last 50 turns
   - `loadShortTermMemory(userId)` - Retrieve from Redis
   - `clearShortTermMemory(userId)` - Session end cleanup
4. Implement 50-turn sliding window (array slicing)
5. Add 30-minute TTL on Redis keys

**Acceptance criteria:**
- ✅ Can save 100 conversation turns → Only last 50 stored
- ✅ Redis key: `memory:short-term:{userId}`
- ✅ TTL of 30 minutes applied
- ✅ Load time <50ms for 50 turns
- ✅ Unit tests pass (save/load/truncate)

**Reference:** [memory-architecture.md](./memory-architecture.md) - Short-Term Memory section

**Code structure:**
```typescript
// src/services/memory.service.ts
@Injectable()
export class MemoryService {
  private redis: RedisClient;

  async saveShortTermMemory(userId: string, turns: ConversationTurn[]) {
    const truncated = turns.slice(-50); // Keep last 50
    await this.redis.set(
      `memory:short-term:${userId}`,
      JSON.stringify(truncated),
      { EX: 1800 } // 30 min TTL
    );
  }

  async loadShortTermMemory(userId: string): Promise<ConversationTurn[]> {
    const data = await this.redis.get(`memory:short-term:${userId}`);
    return data ? JSON.parse(data) : [];
  }
}
```

---

### 🔹 Task 1.4: Memory Service - Long-Term Memory
**Owner:** Backend Engineer  
**Time:** 8-10 hours  
**Priority:** P0  
**Dependencies:** Task 1.1, Task 1.2

**What to build:**
1. Implement Cosmos DB connection
2. Implement methods:
   - `saveLongTermMemory(userId, memory)` - Save fact to Cosmos DB
   - `searchMemories(userId, keywords)` - Simple keyword search (no embeddings)
   - `loadAllMemories(userId)` - Get all memories for user
3. Implement keyword search:
   - Search in `content`, `tags`, `category` fields
   - Case-insensitive matching
   - Return top 10 matches
4. Add created/updated timestamps

**Acceptance criteria:**
- ✅ Can save memory: `{ userId, content, category, tags, createdAt }`
- ✅ Keyword search finds "daughter Sarah" or "hates mushrooms"
- ✅ Search returns results in <150ms
- ✅ Memories persist across sessions (no TTL)
- ✅ Unit tests pass

**Reference:** [memory-architecture.md](./memory-architecture.md) - Long-Term Memory section

**Schema:**
```typescript
interface LongTermMemory {
  id: string; // Auto-generated UUID
  userId: string; // Partition key
  content: string; // "User's daughter Sarah lives in Tel Aviv"
  category: 'family' | 'preference' | 'health' | 'routine' | 'other';
  tags: string[]; // ["Sarah", "Tel Aviv", "family"]
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

---

### 🔹 Task 1.5: Generate Pre-Recorded Audio Files
**Owner:** Backend Engineer  
**Time:** 4-6 hours  
**Priority:** P1  
**Dependencies:** Task 1.1 (Blob Storage)

**What to build:**
1. Create script: `scripts/generate-audio.ts`
2. Use Azure Text-to-Speech API (he-IL-AvriNeural voice)
3. Generate 5 MP3 files:
   - `medication-reminder-hebrew.mp3`
   - `check-in-hebrew.mp3`
   - `reminder-snoozed-10min-hebrew.mp3`
   - `check-in-declined-hebrew.mp3`
   - `appointment-30min-hebrew.mp3`
4. Upload to Blob Storage container: `audio-files`
5. Create `AudioService` to retrieve signed URLs

**Acceptance criteria:**
- ✅ All 5 MP3 files exist in Blob Storage
- ✅ Can retrieve signed URL: `GET /audio/:filename`
- ✅ Audio plays in browser
- ✅ Voice sounds warm and conversational
- ✅ File size <500KB per file

**Reference:** [reminder-system.md](./reminder-system.md) - Pre-Recorded Audio Library

**Hebrew scripts:**
```typescript
const scripts = [
  { 
    file: 'medication-reminder-hebrew.mp3', 
    text: 'שלום! זה הזמן לתרופות שלך. בואו נדבר רגע.' 
  },
  { 
    file: 'check-in-hebrew.mp3', 
    text: 'שלום! רציתי לבדוק איך אתה מרגיש היום. יש לך זמן לשיחה קצרה?' 
  },
  // Add other 3...
];
```

---

## 📅 Week 2: Realtime API Integration + Memory Extraction

### 🔹 Task 2.1: Realtime API Gateway Service
**Owner:** Backend Engineer  
**Time:** 10-12 hours  
**Priority:** P0  
**Dependencies:** Task 1.3, Task 1.4

**What to build:**
1. Create `RealtimeService` class
2. Implement WebSocket session creation:
   - Load memories from Redis + Cosmos DB
   - Inject memories into system prompt
   - Configure function calling
3. Implement session event handlers:
   - `conversation.item.created` → Log transcript
   - `response.audio.delta` → Stream audio to client
   - `response.function_call_arguments.done` → Handle memory extraction
4. Add token usage monitoring (log warning at 100K tokens)

**Acceptance criteria:**
- ✅ Can create WebSocket session with memory injection
- ✅ Session receives audio input and returns audio output
- ✅ Transcript logged to Cosmos DB (conversations container)
- ✅ Token count logged per session
- ✅ Function calls work (`extract_important_memory()`)

**Reference:** [realtime-api-integration.md](./realtime-api-integration.md), [memory-architecture.md](./memory-architecture.md)

**System prompt with memory:**
```typescript
const systemPrompt = `
You are a warm, empathetic AI companion for elderly users.

# User Memory
${shortTermMemory.map(turn => `${turn.role}: ${turn.content}`).join('\n')}

# Long-Term Facts
${longTermMemories.map(m => `- ${m.content}`).join('\n')}

# Instructions
- Reference memories naturally in conversation
- Extract important new facts using extract_important_memory()
- Be patient and repeat information if needed
`;
```

---

### 🔹 Task 2.2: Memory Extraction via Function Calling
**Owner:** Backend Engineer  
**Time:** 6-8 hours  
**Priority:** P0  
**Dependencies:** Task 2.1

**What to build:**
1. Define function schema for Realtime API:
   ```json
   {
     "name": "extract_important_memory",
     "description": "Save important facts mentioned by the user",
     "parameters": {
       "type": "object",
       "properties": {
         "content": { "type": "string" },
         "category": { "enum": ["family", "preference", "health", "routine"] },
         "tags": { "type": "array", "items": { "type": "string" } }
       }
     }
   }
   ```
2. Implement handler:
   - Parse function call arguments
   - Call `MemoryService.saveLongTermMemory()`
   - Return success message to Realtime API
3. Add validation (duplicate detection, required fields)

**Acceptance criteria:**
- ✅ User says "My daughter Sarah lives in Tel Aviv" → Memory saved
- ✅ Memory includes: content, category=family, tags=["Sarah", "Tel Aviv"]
- ✅ Duplicate memory not saved twice
- ✅ Invalid calls logged but don't crash session

**Reference:** [memory-architecture.md](./memory-architecture.md) - Memory Extraction section

---

### 🔹 Task 2.3: Working Memory (Redis 7-day cache)
**Owner:** Backend Engineer  
**Time:** 4-6 hours  
**Priority:** P1  
**Dependencies:** Task 1.3

**What to build:**
1. Implement Redis storage for working memory:
   - Key: `memory:working:{userId}`
   - TTL: 7 days (604,800 seconds)
2. Store recent conversation themes (top 3-5)
3. Implement update method:
   - Extract themes from last N conversations
   - Store as JSON array
4. Load working memory in session initialization

**Acceptance criteria:**
- ✅ Working memory persists for 7 days
- ✅ Can store/retrieve conversation themes
- ✅ Load time <50ms
- ✅ Automatically evicts after 7 days

**Reference:** [memory-architecture.md](./memory-architecture.md) - Working Memory section

**Schema:**
```typescript
interface WorkingMemory {
  recentThemes: string[]; // ["feeling lonely", "medication concerns", "missing Sarah"]
  recentFacts: string[]; // Top 3-5 facts from last 7 days
  lastUpdated: string; // ISO timestamp
}
```

---

## 📅 Week 3: Reminder System + Photo Triggers

### 🔹 Task 3.1: Reminder Scheduler Service
**Owner:** Backend Engineer  
**Time:** 8-10 hours  
**Priority:** P0  
**Dependencies:** Task 1.5

**What to build:**
1. Create `ReminderService` class
2. Implement scheduler (use `node-cron` or similar)
3. Implement reminder types:
   - Medication reminders (time-based)
   - Daily check-ins (10 AM, 3 PM, 7 PM)
   - Appointments (30 min before)
4. Create Cosmos DB queries:
   - `getActiveReminders(userId, currentTime)`
   - `updateReminderStatus(reminderId, status)`
5. Implement reminder actions:
   - Trigger audio playback (pre-recorded MP3)
   - Optionally escalate to Realtime API conversation
   - Log completion/snooze/decline

**Acceptance criteria:**
- ✅ Medication reminder fires at scheduled time (±30 seconds)
- ✅ Plays correct pre-recorded audio
- ✅ Can snooze for 10 minutes
- ✅ Escalates to Realtime API if declined 2x
- ✅ Family notified if declined 3x
- ✅ Reminder status saved to Cosmos DB

**Reference:** [reminder-system.md](./reminder-system.md) - Scheduling & Triggering

---

### 🔹 Task 3.2: Photo Context Triggering
**Owner:** Backend Engineer  
**Time:** 6-8 hours  
**Priority:** P1  
**Dependencies:** Task 2.1

**What to build:**
1. Implement photo triggering logic:
   - Detect conversation keywords ("Sarah", "family", "trip")
   - Query Cosmos DB for matching photos (manual tags)
   - Send photo URLs to Realtime API context
2. Define function schema: `show_photos()`
3. Implement handler:
   - Retrieve photo URLs from Blob Storage
   - Send to frontend via WebSocket
4. Add cooldown: Don't show same photo twice in 24 hours

**Acceptance criteria:**
- ✅ User mentions "Sarah" → Photo of Sarah shown
- ✅ Photo metadata retrieved from Cosmos DB (photos container)
- ✅ Frontend displays photo in overlay
- ✅ Same photo not shown again within 24 hours
- ✅ No photos shown if none match (graceful fallback)

**Reference:** [reminder-system.md](./reminder-system.md) - Photo Context Triggering

**Photo schema:**
```typescript
interface Photo {
  id: string;
  userId: string;
  blobUrl: string; // Azure Blob Storage URL
  manualTags: string[]; // ["Sarah", "family", "birthday"]
  capturedDate: string; // ISO timestamp
  lastShownAt?: string; // ISO timestamp (cooldown)
}
```

---

### 🔹 Task 3.3: Reminder Snooze & Decline Logic
**Owner:** Backend Engineer  
**Time:** 4-6 hours  
**Priority:** P1  
**Dependencies:** Task 3.1

**What to build:**
1. Implement snooze logic:
   - User says "later" or "in 10 minutes"
   - Detect via intent classification (function calling)
   - Reschedule reminder for +10 minutes
2. Implement decline logic:
   - User says "not now" or "no"
   - Increment decline counter
   - If declined 2x → Escalate to Realtime API conversation
   - If declined 3x → Notify family member
3. Create function schemas:
   - `snooze_reminder(duration_minutes)`
   - `decline_reminder(reason)`

**Acceptance criteria:**
- ✅ Snooze reschedules reminder correctly
- ✅ Decline increments counter in Cosmos DB
- ✅ 3rd decline triggers family notification
- ✅ Realtime API conversation initiated on 2nd decline
- ✅ Pre-recorded audio plays for snooze/decline confirmation

**Reference:** [reminder-system.md](./reminder-system.md) - Snooze & Decline Flow

---

## 📅 Week 4: Onboarding + Safety Configuration

### ✅ Task 4.1: Onboarding Form (Family Dashboard) - COMPLETE
**Owner:** Frontend Engineer  
**Time:** 10-12 hours (actual: ~12 hours)  
**Priority:** P0  
**Dependencies:** None (can work in parallel)  
**Status:** ✅ COMPLETE  
**Evidence:** `/dashboard/DASHBOARD_README.md`

**What to build:**
1. Create React/Next.js web dashboard
2. Implement 7-part onboarding form:
   - Part 1: Emergency contacts (min 1, max 3)
   - Part 2: Medications (name, time, dosage)
   - Part 3: Routines (wake time, meal times, sleep time)
   - Part 4: Conversation boundaries (forbidden topics)
   - Part 5: Crisis triggers (keywords to detect)
   - Part 6: Voice calibration (TBD - defer for MVP)
   - Part 7: Review & confirm
3. Add validation:
   - All emergency contact fields required
   - At least 1 medication
   - All times in HH:MM format
4. Generate YAML config file
5. Save to Cosmos DB (safety-config container)

**Acceptance criteria:**
- ✅ Form has progress indicator (1/7, 2/7, etc.)
- ✅ Auto-save to localStorage (recover on refresh)
- ✅ All validation errors shown clearly
- ✅ YAML config generated correctly
- ✅ Config saved to Cosmos DB
- ✅ Can edit/update config later

**Reference:** [onboarding-flow.md](../planning/onboarding-flow.md) - Phase 2

**Form structure:**
```typescript
interface SafetyConfig {
  userId: string;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  medications: Array<{
    name: string;
    time: string; // "08:00"
    dosage: string;
  }>;
  routines: {
    wakeTime: string;
    breakfastTime: string;
    lunchTime: string;
    dinnerTime: string;
    sleepTime: string;
  };
  boundaries: {
    forbiddenTopics: string[];
    crisisTriggers: string[];
  };
}
```

---

### ✅ Task 4.2: Safety Config Loading - COMPLETE
**Owner:** Backend Engineer  
**Time:** 4-6 hours (actual: ~6 hours)  
**Priority:** P0  
**Dependencies:** Task 4.1, Task 2.1  
**Status:** ✅ COMPLETE
**Evidence:** `/backend/TASK_4.2_STATUS.md`, `/backend/src/services/safety-config.service.ts`, test passing

**What was built:**
1. ✅ Created `SafetyConfigService` with full implementation
2. ✅ Implemented `loadSafetyConfig(userId)` method
3. ✅ Added crisis trigger detection logic
4. ✅ Implemented alert handler with family notifications
5. ✅ Created comprehensive test script (`test-safety-config.ts`)
6. ✅ RealtimeService integration ready
7. ✅ End-to-end testing completed after Cosmos DB access fixed

**Acceptance criteria:**
- ✅ Safety config loaded at session start
- ✅ Forbidden topics avoided by AI (e.g., politics)
- ✅ Crisis trigger detected ("I want to hurt myself") → Alert sent
- ✅ Emergency contact receives SMS/call
- ✅ Alert logged with timestamp + transcript

**Test results:** All safety config operations verified working correctly

**Reference:** [onboarding-flow.md](../planning/onboarding-flow.md), [ai-behavior.md](./ai-behavior.md)

---

### ✅ Task 4.3: Medication Reminder Configuration - COMPLETE
**Owner:** Backend Engineer  
**Time:** 4-6 hours (actual: ~4 hours)  
**Priority:** P1  
**Dependencies:** Task 4.1, Task 3.1  
**Status:** ✅ COMPLETE  
**Evidence:** `/backend/TASK_4.3_COMPLETE.md`, `/backend/src/services/reminder.service.ts`, test passing

**What was built:**
1. ✅ Read medication schedule from safety config
2. ✅ Create cron jobs for each medication time
3. ✅ Implement reminder logic:
   - Play pre-recorded audio: "זה הזמן לתרופות שלך"
   - Wait for confirmation ("I took it")
   - Log completion to Cosmos DB
4. ✅ Handle missed medications:
   - If not confirmed within 30 min → Notify family
   - Log as "missed" in database
5. ✅ Daily midnight cron job for reminder recreation
6. ✅ Created comprehensive test script (`test-medication-reminders.ts`)
7. ✅ Tested and verified after Cosmos DB access fixed

**Acceptance criteria:**
- ✅ Medication reminders created from onboarding config
- ✅ Reminder fires at correct time (e.g., 8:00 AM)
- ✅ Confirmation detected via function calling
- ✅ Family notified if missed
- ✅ History visible in dashboard

**Test results:** Medication reminder scheduling and configuration working correctly

**Reference:** [reminder-system.md](./reminder-system.md), [onboarding-flow.md](../planning/onboarding-flow.md)

---

## 📅 Week 5-6: Frontend (Mac Desktop App)

### 🔹 Task 5.1: Flutter Mac Desktop Setup
**Owner:** Frontend Engineer  
**Time:** 6-8 hours  
**Priority:** P0  
**Dependencies:** None

**What to build:**
1. Initialize Flutter project: `flutter create --platforms=macos never_alone`
2. Configure macOS entitlements (microphone access)
3. Set up WebSocket client for Realtime API
4. Implement audio recording + playback
5. Create basic UI layout:
   - Conversation transcript
   - Audio waveform animation
   - Photo display overlay
   - Settings panel

**Acceptance criteria:**
- ✅ App runs on macOS (debug mode)
- ✅ Microphone permission requested correctly
- ✅ Can record audio and send to backend
- ✅ Audio playback works (pre-recorded MP3)
- ✅ UI is accessible (large text, high contrast)

**Reference:** [ux-design.md](../product/ux-design.md)

---

### 🔹 Task 5.2: Realtime API WebSocket Client
**Owner:** Frontend Engineer  
**Time:** 8-10 hours  
**Priority:** P0  
**Dependencies:** Task 5.1, Task 2.1

**What to build:**
1. Implement WebSocket connection to backend gateway
2. Send audio input events:
   - Capture microphone audio
   - Convert to base64 PCM16
   - Send `conversation.item.create` events
3. Receive audio output events:
   - Handle `response.audio.delta`
   - Decode base64 audio
   - Play through speakers
4. Display transcript in real-time

**Acceptance criteria:**
- ✅ WebSocket connects successfully
- ✅ User speaks → Audio sent to backend → AI responds
- ✅ Transcript displays in UI
- ✅ Audio latency <2 seconds (acceptable for MVP)
- ✅ Connection recovers gracefully on disconnect

**Reference:** [realtime-api-integration.md](./realtime-api-integration.md)

---

### 🔹 Task 5.3: Photo Display Overlay
**Owner:** Frontend Engineer  
**Time:** 4-6 hours  
**Priority:** P1  
**Dependencies:** Task 5.2, Task 3.2

**What to build:**
1. Listen for `show_photos` function call responses
2. Display photo overlay:
   - Fade in photo from backend URL
   - Show for 10 seconds
   - Fade out automatically
3. Handle multiple photos (show one at a time)
4. Add accessibility: Alt text from photo metadata

**Acceptance criteria:**
- ✅ Photo appears when triggered by conversation
- ✅ Animation is smooth (fade in/out)
- ✅ Photo URL loads from Azure Blob Storage
- ✅ Multiple photos queued correctly (don't overlap)
- ✅ Alt text read by screen reader

**Reference:** [reminder-system.md](./reminder-system.md) - Photo Context Triggering

---

### 🔹 Task 5.4: Music Integration - Backend (NEW)
**Owner:** Backend Engineer  
**Time:** 6-8 hours  
**Priority:** P2 (Optional feature)  
**Dependencies:** Task 2.1

**What to build:**
1. Create `MusicService` class
2. Implement YouTube Data API integration:
   - Search for songs by name/artist/genre
   - Return video ID + metadata
3. Add `play_music()` function to Realtime API tools
4. Create Cosmos DB container: `user-music-preferences`
5. Create Cosmos DB container: `music-playback-history` (90-day TTL)
6. Handle Hebrew song names correctly

**Acceptance criteria:**
- ✅ Can search YouTube Music and return video ID
- ✅ Function call `play_music()` returns playback URL
- ✅ Music preferences saved to Cosmos DB
- ✅ Hebrew song search works (e.g., "ירושלים של זהב")
- ✅ Playback history logged

**Reference:** [music-integration.md](./music-integration.md)

---

### 🔹 Task 5.5: Music Integration - Onboarding Form (NEW)
**Owner:** Frontend Engineer  
**Time:** 4-6 hours  
**Priority:** P2 (Optional feature)  
**Dependencies:** Task 4.1

**What to build:**
1. Add optional Step 8 to onboarding form: "Music Preferences"
2. Form fields:
   - Enable/disable music checkbox
   - Preferred artists (comma-separated)
   - Preferred songs (comma-separated)
   - Music genres
   - Allow auto-play checkbox
   - Play on sadness checkbox
   - Max songs per session (1-5)
3. Save preferences to Cosmos DB
4. Validation: at least 1 artist or song if enabled

**Acceptance criteria:**
- ✅ Step 8 appears as optional in onboarding flow
- ✅ Can skip music configuration entirely
- ✅ Form validates input (comma-separated lists)
- ✅ Preferences saved correctly to Cosmos DB
- ✅ Can edit preferences later

**Reference:** [music-integration.md](./music-integration.md), [onboarding-flow.md](../planning/onboarding-flow.md)

---

### 🔹 Task 5.6: Music Integration - Flutter Player (NEW)
**Owner:** Frontend Engineer  
**Time:** 6-8 hours  
**Priority:** P2 (Optional feature)  
**Dependencies:** Task 5.2, Task 5.4

**What to build:**
1. Add `youtube_player_flutter` package
2. Create `MusicPlayerOverlay` widget:
   - YouTube video player (audio-only mode preferred)
   - Song title + artist display
   - Large control buttons (play, pause, stop)
   - Hebrew labels
3. Handle WebSocket event: `play_music`
4. Show overlay when music plays
5. Track playback duration (send to backend)

**Acceptance criteria:**
- ✅ YouTube video plays when triggered
- ✅ Controls are large and accessible
- ✅ Can pause/resume/stop music
- ✅ Hebrew labels correct ("עצור", "השהה", "נגן")
- ✅ Playback duration tracked and logged

**Reference:** [music-integration.md](./music-integration.md)

---

## 📅 Week 7-8: Testing + Polish

### 🔹 Task 7.1: Manual Testing Scenarios
**Owner:** QA/Entire Team  
**Time:** 10-15 hours  
**Priority:** P0  
**Dependencies:** All previous tasks

**What to test:**
1. **Memory continuity:**
   - Day 1: User mentions "daughter Sarah" → Verify saved
   - Day 2: New session → AI references Sarah naturally
2. **Medication reminders:**
   - Schedule reminder for 5 min from now
   - Verify audio plays, confirmation works, snooze works
3. **Crisis detection:**
   - User says "I want to hurt myself" → Emergency contact notified
4. **50-turn sliding window:**
   - Have 100-turn conversation → Verify only last 50 in Redis
5. **Photo triggering:**
   - User mentions "family" → Photo shown

**Acceptance criteria:**
- ✅ All 5 scenarios pass manual testing
- ✅ Bugs logged in GitHub Issues
- ✅ Critical bugs fixed before launch
- ✅ Performance metrics recorded (latency, memory usage)

**Reference:** [mvp-simplifications.md](./mvp-simplifications.md) - Testing Strategy

---

### 🔹 Task 7.2: Family Dashboard MVP
**Owner:** Frontend Engineer  
**Time:** 8-10 hours  
**Priority:** P1  
**Dependencies:** Task 4.1

**What to build:**
1. Create dashboard pages:
   - Home: Recent conversations summary
   - Reminders: Medication history (taken/missed)
   - Alerts: Crisis triggers + notifications
   - Settings: Edit safety config
2. Implement authentication (Azure AD B2C or simple email/password)
3. Add basic analytics:
   - Total conversation time today
   - Reminders completed this week
   - Alerts triggered (if any)

**Acceptance criteria:**
- ✅ Family member can log in
- ✅ Can view last 7 days of conversations (summaries only)
- ✅ Can see medication adherence rate
- ✅ Receives email notifications for alerts
- ✅ Can edit safety config

**Reference:** [features-modes.md](../product/features-modes.md)

---

### 🔹 Task 7.3: Cost Monitoring & Optimization
**Owner:** DevOps/Backend Engineer  
**Time:** 4-6 hours  
**Priority:** P1  
**Dependencies:** All previous tasks

**What to build:**
1. Add basic cost tracking:
   - Log Azure OpenAI token usage per session
   - Log Cosmos DB RU consumption
   - Log Redis cache hits/misses
2. Create simple dashboard (Grafana or Azure Monitor)
3. Set up cost alerts:
   - Alert if daily spend >$10
   - Alert if token usage >100K in single session
4. Optimize hot paths:
   - Add Redis caching for frequently accessed memories
   - Reduce Cosmos DB query complexity

**Acceptance criteria:**
- ✅ Can view daily cost breakdown
- ✅ Token usage logged per conversation
- ✅ Alerts trigger correctly
- ✅ MVP costs <$100/month for 10 users

**Reference:** [mvp-simplifications.md](./mvp-simplifications.md) - Cost Optimization

---

## 🚀 Launch Checklist (Week 8)

### Pre-Launch:
- [ ] All P0 tasks completed
- [ ] Manual testing scenarios pass
- [ ] Family dashboard works
- [ ] Safety config tested with real scenarios
- [ ] Cost monitoring in place
- [ ] Documentation updated

### Launch Day:
- [ ] Deploy to production (Azure App Service)
- [ ] Smoke test all critical paths
- [ ] Monitor error logs for 24 hours
- [ ] Collect feedback from first 3 families

### Post-Launch (Week 9+):
- [ ] Analyze usage metrics
- [ ] Fix critical bugs
- [ ] Plan Post-MVP features (see [mvp-simplifications.md](./mvp-simplifications.md))

---

## 📊 Task Summary

**Total estimated time:** 6-8 weeks (1 backend engineer + 1 frontend engineer)

**By priority:**
- **P0 (Critical):** 16 tasks, ~120 hours
- **P1 (Important):** 8 tasks, ~50 hours
- **P2 (Optional - Nice-to-have):** 3 tasks (music integration), ~16-22 hours

**By role:**
- **Backend Engineer:** ~106 hours (Weeks 1-4 + music backend)
- **Frontend Engineer:** ~70 hours (Weeks 5-6 + music UI)
- **DevOps:** ~20 hours (Week 1 + Week 7)
- **QA/Testing:** ~15 hours (Week 7)

---

## 🆘 Blockers & Risks

**Potential blockers:**
1. **Azure OpenAI quota:** May need to request higher TPM (tokens per minute)
2. **Hebrew TTS quality:** Test voice quality early (Task 1.5)
3. **WebSocket latency:** May exceed 2 seconds on slow connections
4. **Memory accuracy:** Keyword search may miss relevant facts (monitor in testing)

**Mitigation:**
- Request Azure OpenAI quota increase in Week 1
- Test Hebrew TTS with real users by Week 2
- Add latency monitoring + alerts
- Plan embeddings upgrade for Post-MVP if keyword search insufficient

---

*Last updated: November 9, 2025*
