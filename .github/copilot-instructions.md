# GitHub Copilot Instructions for Never Alone

**Project:** Never Alone - AI Companion for Elderly & Dementia Patients  
**Purpose:** Help GitHub Copilot understand project structure, tech stack, and coding patterns

---

## 📋 Project Overview

**What we're building:**
Memory-enabled AI voice companion that helps elderly users (especially those with dementia) through medication reminders, daily check-ins, and natural conversation. The AI remembers facts across days/weeks to provide continuity.

**Key features:**
- Real-time voice conversations (Azure OpenAI Realtime API)
- 3-tier memory system (Redis + Cosmos DB)
- Medication reminders (pre-recorded audio + escalation)
- Photo context triggering (show family photos during conversation)
- Safety monitoring (crisis detection, emergency contacts)
- Music playback (optional - YouTube Music integration)

---

## 🛠️ Tech Stack

### Backend:
- **Framework:** NestJS (TypeScript)
- **Language:** TypeScript 5.x
- **APIs:** Azure OpenAI Realtime API (gpt-4o-realtime-preview)
- **Database:** Azure Cosmos DB (NoSQL API)
- **Cache:** Redis (Azure Cache for Redis)
- **Storage:** Azure Blob Storage (audio files, photos)
- **Deployment:** Azure App Service

### Frontend:
- **Framework:** Flutter (Dart)
- **Platform:** macOS desktop (MVP), iOS/Android later
- **Audio:** WebRTC for real-time audio streaming
- **UI:** Material Design 3 with accessibility focus

### Language:
- **UI Language:** Hebrew (he-IL)
- **Code:** English (comments, variable names)

---

## 📐 Architecture Principles

### MVP Simplifications (IMPORTANT):
- ✅ **Simple over complex:** 50-turn sliding window (no summarization)
- ✅ **Keyword search over embeddings:** No vector search in MVP
- ✅ **Pre-recorded audio over TTS:** 5 Hebrew MP3 files for reminders
- ✅ **Manual testing over E2E:** No automated tests in MVP
- ✅ **Single region:** East US 2 only
- ❌ **Defer:** Embeddings, wake word, multi-region, advanced analytics

See [docs/technical/mvp-simplifications.md](../docs/technical/mvp-simplifications.md) for full list.

### Key architectural decisions:
1. **Memory is core:** Every conversation loads/saves 3 memory tiers
2. **Safety first:** Crisis triggers, emergency contacts, forbidden topics
3. **Azure-native:** Use Azure services for everything (no mixing cloud providers)
4. **Accessibility:** Large text, high contrast, screen reader support

---

## 📂 Project Structure

```
Never Alone/
├── backend/ (NestJS)
│   ├── src/
│   │   ├── services/
│   │   │   ├── memory.service.ts (3-tier memory system)
│   │   │   ├── realtime.service.ts (Azure OpenAI WebSocket)
│   │   │   ├── reminder.service.ts (medication reminders)
│   │   │   └── safety.service.ts (crisis detection, alerts)
│   │   ├── controllers/
│   │   │   ├── memory.controller.ts
│   │   │   └── reminder.controller.ts
│   │   └── config/
│   │       └── azure.config.ts
│   └── scripts/
│       └── generate-audio.ts (Hebrew TTS generation)
├── frontend/ (Flutter)
│   ├── lib/
│   │   ├── services/
│   │   │   ├── realtime_client.dart (WebSocket client)
│   │   │   └── audio_service.dart (audio recording/playback)
│   │   ├── screens/
│   │   │   ├── conversation_screen.dart
│   │   │   └── settings_screen.dart
│   │   └── widgets/
│   │       ├── photo_overlay.dart
│   │       └── transcript_view.dart
└── docs/ (comprehensive documentation)
    ├── technical/
    │   ├── GETTING_STARTED.md (👈 START HERE for new developers)
    │   ├── IMPLEMENTATION_TASKS.md (prioritized task list)
    │   ├── mvp-simplifications.md (what's in MVP vs. deferred)
    │   ├── memory-architecture.md (3-tier memory system)
    │   └── reminder-system.md (reminder logic)
    └── planning/
        └── onboarding-flow.md (family setup process)
```

---

## 💻 Coding Standards

### TypeScript (Backend):
```typescript
// Use dependency injection (NestJS pattern)
@Injectable()
export class MemoryService {
  constructor(
    private readonly redis: RedisService,
    private readonly cosmos: CosmosService,
  ) {}

  // Use async/await (not promises)
  async loadMemory(userId: string): Promise<Memory> {
    const shortTerm = await this.redis.get(`memory:short-term:${userId}`);
    // ...
  }

  // Use descriptive method names
  async saveShortTermMemory(userId: string, turns: ConversationTurn[]): Promise<void> {
    // Implement 50-turn sliding window
    const truncated = turns.slice(-50);
    await this.redis.set(`memory:short-term:${userId}`, JSON.stringify(truncated));
  }
}
```

### Dart (Frontend):
```dart
// Use Flutter best practices
class ConversationScreen extends StatefulWidget {
  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  // Use descriptive variable names
  final RealtimeClient _realtimeClient = RealtimeClient();
  List<ConversationTurn> _transcript = [];

  @override
  Widget build(BuildContext context) {
    // Use Material Design 3
    return Scaffold(
      appBar: AppBar(title: Text('שיחה')), // Hebrew UI
      body: TranscriptView(transcript: _transcript),
    );
  }
}
```

### Naming Conventions:
- **TypeScript:** camelCase for variables/methods, PascalCase for classes
- **Dart:** camelCase for variables/methods, PascalCase for classes
- **Files:** kebab-case (e.g., `memory-service.ts`, `realtime_client.dart`)
- **Database fields:** camelCase (e.g., `userId`, `createdAt`)
- **Environment variables:** UPPER_SNAKE_CASE (e.g., `AZURE_OPENAI_KEY`)

---

## 🧠 Key Patterns

### 1. Memory System Pattern:
```typescript
// Always load all 3 memory tiers at session start
async initializeSession(userId: string) {
  const memory = {
    shortTerm: await this.loadShortTermMemory(userId), // Last 50 turns (Redis)
    working: await this.loadWorkingMemory(userId),     // Recent themes (Redis, 7 days)
    longTerm: await this.searchMemories(userId, []),   // All facts (Cosmos DB)
  };

  // Inject into system prompt
  const systemPrompt = this.buildSystemPrompt(memory);
  return systemPrompt;
}
```

### 2. Realtime API Function Calling:
```typescript
// Define function schemas for Realtime API
const functions = [
  {
    name: 'extract_important_memory',
    description: 'Save important facts mentioned by the user',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        category: { enum: ['family', 'preference', 'health', 'routine'] },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['content', 'category'],
    },
  },
];

// Handle function calls
async handleFunctionCall(functionCall) {
  if (functionCall.name === 'extract_important_memory') {
    const { content, category, tags } = JSON.parse(functionCall.arguments);
    await this.memoryService.saveLongTermMemory(userId, { content, category, tags });
  }
}
```

### 3. Safety Pattern:
```typescript
// Always check crisis triggers in transcript
async monitorTranscript(transcript: string, userId: string) {
  const safetyConfig = await this.loadSafetyConfig(userId);
  
  for (const trigger of safetyConfig.crisisTriggers) {
    if (transcript.toLowerCase().includes(trigger.toLowerCase())) {
      // IMMEDIATELY notify emergency contacts
      await this.notifyEmergencyContacts(userId, transcript);
      await this.logAlert(userId, trigger, transcript);
    }
  }
}
```

---

## 🔐 Environment Variables

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_KEY=<key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview

# Cosmos DB
COSMOS_CONNECTION_STRING=<connection-string>
COSMOS_DATABASE=never-alone

# Redis
REDIS_URL=redis://<host>:6380?password=<key>

# Blob Storage
BLOB_STORAGE_CONNECTION_STRING=<connection-string>
BLOB_CONTAINER=audio-files
```

---

## 📊 Database Schemas

### Cosmos DB Containers:

**1. memories (long-term facts):**
```typescript
{
  id: string;           // UUID
  userId: string;       // Partition key
  content: string;      // "User's daughter Sarah lives in Tel Aviv"
  category: 'family' | 'preference' | 'health' | 'routine';
  tags: string[];       // ["Sarah", "Tel Aviv"]
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

**2. conversations (transcript history):**
```typescript
{
  id: string;           // UUID
  userId: string;       // Partition key
  sessionId: string;
  turns: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  startedAt: string;
  endedAt: string;
  tokenUsage: number;
  ttl: 7776000;         // 90 days
}
```

**3. reminders:**
```typescript
{
  id: string;           // UUID
  userId: string;       // Partition key
  type: 'medication' | 'check-in' | 'appointment';
  scheduledTime: string; // ISO timestamp
  status: 'pending' | 'completed' | 'snoozed' | 'declined';
  declineCount: number;
  completedAt?: string;
}
```

---

## 🧪 Testing Approach

### Manual Testing (MVP):
- No automated tests in MVP (see mvp-simplifications.md)
- Test scenarios documented in IMPLEMENTATION_TASKS.md
- Use console.log for debugging
- Monitor Azure logs for production issues

### Future (Post-MVP):
- Jest for backend unit tests
- Flutter widget tests
- E2E tests with Playwright

---

## 🚨 Common Pitfalls to Avoid

1. **Don't over-engineer:** Keep MVP simple (50-turn window, not summarization)
2. **Don't skip memory injection:** Every session MUST load 3 memory tiers
3. **Don't ignore safety triggers:** Crisis detection is critical - test thoroughly
4. **Don't hardcode strings:** Use Hebrew constants for UI text
5. **Don't forget TTLs:** Set appropriate TTLs on Redis keys (30 min for short-term)
6. **Don't bypass keyword search:** No embeddings in MVP - use simple string matching

---

## 📚 Key Documents for Reference

**When implementing memory features:**
- [docs/technical/memory-architecture.md](../docs/technical/memory-architecture.md)

**When implementing reminders:**
- [docs/technical/reminder-system.md](../docs/technical/reminder-system.md)

**When integrating Realtime API:**
- [docs/technical/realtime-api-integration.md](../docs/technical/realtime-api-integration.md)

**When implementing music playback:**
- [docs/technical/music-integration.md](../docs/technical/music-integration.md)

**When questioning "should this be in MVP?":**
- [docs/technical/mvp-simplifications.md](../docs/technical/mvp-simplifications.md)

**When starting new tasks:**
- [docs/technical/GETTING_STARTED.md](../docs/technical/GETTING_STARTED.md)
- [docs/technical/IMPLEMENTATION_TASKS.md](../docs/technical/IMPLEMENTATION_TASKS.md)

---

## 🎯 Current Sprint Focus

**Week 1 (Current):**
- ✅ Documentation complete
- ⏳ Azure infrastructure setup (Task 1.1)
- ⏳ Memory service implementation (Task 1.3, 1.4)
- ⏳ Pre-recorded audio generation (Task 1.5)

**Next:**
- Week 2: Realtime API integration
- Week 3: Reminder system
- Week 4: Onboarding form

See [IMPLEMENTATION_TASKS.md](../docs/technical/IMPLEMENTATION_TASKS.md) for full roadmap.

---

## 💡 Tips for Using Copilot

1. **Reference docs in prompts:** "Implement memory loading as described in memory-architecture.md"
2. **Be specific about MVP constraints:** "Use keyword search, not embeddings (MVP approach)"
3. **Include schema context:** "Create Cosmos DB document matching the 'memories' schema"
4. **Mention safety requirements:** "Add crisis trigger detection as specified in onboarding-flow.md"
5. **Request Hebrew UI text:** "Add Hebrew label for 'Settings' button"

---

*Last updated: November 9, 2025*
