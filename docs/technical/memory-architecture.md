# 🧠 Memory Architecture - Technical Specification

## Overview

The Never Alone memory system enables **conversation continuity** across sessions and days, allowing the AI companion to remember personal facts, preferences, and recent interactions. This is critical for dementia/Alzheimer's patients who benefit from AI "remembering" details they may forget.

**Design Philosophy (MVP):** Start simple, scale later. Focus on reliable memory storage/retrieval over complex optimization.

---

## Problem Statement

### Azure OpenAI Realtime API is Stateless

Each WebSocket session starts with **zero memory** of previous conversations:
- Session 1 (Monday): User mentions "My granddaughter Sarah is a teacher"
- Session 2 (Tuesday): AI has no memory of Sarah being mentioned

### Business Requirement

Dementia patients need:
- **Personal continuity:** AI remembers family names, preferences, routines
- **Recent context:** "Yesterday we talked about your garden"
- **Long-term knowledge:** Important facts accumulated over weeks/months

---

## Three-Tier Memory System

```
┌────────────────────────────────────────────────────────────┐
│  SHORT-TERM MEMORY (Current Conversation)                  │
│  • Last 10 conversation turns (user + AI)                  │
│  • Storage: Redis (in-memory)                              │
│  • Duration: Current session only (30 min inactivity TTL)  │
│  • Retrieval: < 10ms                                       │
└────────────────────────────────────────────────────────────┘
                           ↓ (Session end)
┌────────────────────────────────────────────────────────────┐
│  WORKING MEMORY (Recent Activity)                          │
│  • Last 3 days of conversation themes                      │
│  • Storage: Redis (with 7-day TTL)                         │
│  • Duration: 7 days                                        │
│  • Retrieval: < 10ms                                       │
└────────────────────────────────────────────────────────────┘
                           ↓ (AI extracts important facts)
┌────────────────────────────────────────────────────────────┐
│  LONG-TERM MEMORY (Persistent Knowledge)                   │
│  • Personal facts, family info, preferences                │
│  • Storage: Azure Cosmos DB (permanent, no TTL)            │
│  • Duration: Forever (or until manually deleted)           │
│  • Retrieval: 50-100ms (indexed query)                     │
└────────────────────────────────────────────────────────────┘
```

---

## MVP Implementation (Simple Approach)

### Design Decisions for MVP

1. **No semantic search (embeddings)** - Use simple keyword matching for MVP
2. **No automatic summarization** - Manual memory extraction via function calling
3. **Fixed memory limits** - 10 short-term turns, 5 working memory facts, 50 long-term facts
4. **No memory pruning** - Keep everything until manual deletion (post-MVP: importance decay)

---

## 1. Short-Term Memory (Current Session)

**Purpose:** Maintain conversation coherence within a single session  
**Technology:** Redis List  
**TTL:** 30 minutes after last activity

### Data Structure

```typescript
// Redis key: `conversation:{userId}:recent_turns`
// Value: JSON array (LIFO - Last In First Out)

interface ConversationTurn {
  role: "user" | "assistant";
  timestamp: string;
  transcript: string;
  audioUrl?: string; // null for MVP (audio deleted)
}

// Example:
[
  {
    "role": "user",
    "timestamp": "2025-11-09T14:23:15Z",
    "transcript": "היום יש לי פגישה עם הרופא"
  },
  {
    "role": "assistant",
    "timestamp": "2025-11-09T14:23:20Z",
    "transcript": "אה כן! הפגישה בשעה 11:00. מיכל תבוא לאסוף אותך בשעה 10:50."
  }
]
```

### MVP Implementation

```typescript
// memory.service.ts

class ShortTermMemoryService {
  private readonly MAX_TURNS = 10;
  private readonly TTL_SECONDS = 1800; // 30 minutes

  async addTurn(userId: string, turn: ConversationTurn): Promise<void> {
    const key = `conversation:${userId}:recent_turns`;
    
    // Add to end of list
    await redis.rpush(key, JSON.stringify(turn));
    
    // Keep only last 10 turns
    await redis.ltrim(key, -this.MAX_TURNS, -1);
    
    // Reset TTL on activity
    await redis.expire(key, this.TTL_SECONDS);
  }

  async getRecentTurns(userId: string): Promise<ConversationTurn[]> {
    const key = `conversation:${userId}:recent_turns`;
    const turns = await redis.lrange(key, 0, -1);
    return turns.map(t => JSON.parse(t));
  }

  async clearSession(userId: string): Promise<void> {
    await redis.del(`conversation:${userId}:recent_turns`);
  }
}
```

---

## 2. Working Memory (Recent Context)

**Purpose:** Remember recent conversation themes for continuity across sessions  
**Technology:** Redis JSON  
**TTL:** 7 days

### Data Structure

```typescript
// Redis key: `working_memory:{userId}`
// Value: JSON object

interface WorkingMemory {
  lastUpdated: string;
  recentThemes: string[];      // Last 5 conversation topics
  recentMood: string;           // "happy" | "sad" | "anxious" | "neutral"
  recentActivities: string[];   // What user did in last 3 days
  upcomingEvents: string[];     // Appointments, visits
}

// Example:
{
  "lastUpdated": "2025-11-09T14:30:00Z",
  "recentThemes": [
    "Doctor appointment tomorrow at 11:00 AM",
    "Talked about garden and roses blooming",
    "Mentioned granddaughter Sarah visited last week"
  ],
  "recentMood": "happy",
  "recentActivities": [
    "Took morning walk in garden",
    "Video call with daughter מיכל"
  ],
  "upcomingEvents": [
    "Doctor appointment Nov 10 at 11:00 AM",
    "Sarah visiting Friday evening"
  ]
}
```

### MVP Implementation (Manual Update)

```typescript
class WorkingMemoryService {
  private readonly TTL_SECONDS = 604800; // 7 days

  async updateWorkingMemory(
    userId: string,
    updates: Partial<WorkingMemory>
  ): Promise<void> {
    const key = `working_memory:${userId}`;
    
    // Get existing memory
    const existing = await redis.get(key);
    const current = existing ? JSON.parse(existing) : this.getEmptyMemory();
    
    // Merge updates
    const updated = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    // Keep arrays limited (MVP: max 5 items each)
    if (updated.recentThemes) {
      updated.recentThemes = updated.recentThemes.slice(-5);
    }
    if (updated.recentActivities) {
      updated.recentActivities = updated.recentActivities.slice(-5);
    }
    
    await redis.set(key, JSON.stringify(updated), 'EX', this.TTL_SECONDS);
  }

  async getWorkingMemory(userId: string): Promise<WorkingMemory | null> {
    const key = `working_memory:${userId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  private getEmptyMemory(): WorkingMemory {
    return {
      lastUpdated: new Date().toISOString(),
      recentThemes: [],
      recentMood: "neutral",
      recentActivities: [],
      upcomingEvents: []
    };
  }
}
```

**Update Trigger (MVP):** At end of each Realtime API session, backend manually extracts themes:

```typescript
async function onSessionEnd(userId: string, conversationTranscript: Turn[]) {
  // Simple extraction: Last 3 assistant responses = themes
  const assistantMessages = conversationTranscript
    .filter(t => t.role === 'assistant')
    .slice(-3)
    .map(t => t.transcript);
  
  await workingMemoryService.updateWorkingMemory(userId, {
    recentThemes: assistantMessages
  });
}
```

---

## 3. Long-Term Memory (Persistent Facts)

**Purpose:** Store important personal information permanently  
**Technology:** Azure Cosmos DB (NoSQL)  
**TTL:** None (permanent)

### Cosmos DB Schema

**Container:** `UserMemories`  
**Partition Key:** `/userId`

```typescript
interface UserMemory {
  id: string;                    // "mem_abc123"
  userId: string;                // Partition key
  memoryType: MemoryType;        // Category of memory
  key: string;                   // Searchable key
  value: string;                 // The actual memory content
  extractedAt: string;           // ISO timestamp
  context: string;               // Conversation context when extracted
  importance: "high" | "medium" | "low";
  confidence: number;            // 0.0 - 1.0 (how sure AI is)
  lastAccessed?: string;         // ISO timestamp
  accessCount: number;           // How many times used
  // NO embedding field for MVP - add in post-MVP
}

enum MemoryType {
  FAMILY_INFO = "family_info",        // Names, relationships
  MEDICAL_INFO = "medical_info",      // Conditions, medications
  PREFERENCES = "preferences",        // Likes, dislikes, hobbies
  ROUTINE = "routine",                // Daily habits, schedules
  PERSONAL_HISTORY = "personal_history" // Career, life events
}
```

### Example Documents

```json
[
  {
    "id": "mem_001",
    "userId": "user_xyz",
    "memoryType": "family_info",
    "key": "granddaughter_sarah_job",
    "value": "Granddaughter Sarah works as a teacher in Tel Aviv",
    "extractedAt": "2025-11-09T14:30:00Z",
    "context": "User mentioned during daily check-in conversation",
    "importance": "high",
    "confidence": 0.95,
    "accessCount": 0
  },
  {
    "id": "mem_002",
    "userId": "user_xyz",
    "memoryType": "preferences",
    "key": "loves_roses_in_garden",
    "value": "Has a garden with roses that are currently blooming. Very proud of them.",
    "extractedAt": "2025-11-08T10:15:00Z",
    "context": "User talked about morning walk and seeing roses",
    "importance": "medium",
    "confidence": 0.90,
    "accessCount": 3,
    "lastAccessed": "2025-11-09T09:00:00Z"
  }
]
```

### MVP Memory Extraction (AI Function Calling)

AI calls `extract_important_memory()` function during conversation when it detects important facts:

```typescript
// Function definition passed to Realtime API
const memoryExtractionTool = {
  name: "extract_important_memory",
  description: "Save important information about the user to long-term memory",
  parameters: {
    type: "object",
    properties: {
      memory_type: {
        type: "string",
        enum: ["family_info", "medical_info", "preferences", "routine", "personal_history"]
      },
      key: {
        type: "string",
        description: "Short searchable key (e.g., 'granddaughter_sarah_job')"
      },
      value: {
        type: "string",
        description: "The actual memory content to store"
      },
      importance: {
        type: "string",
        enum: ["high", "medium", "low"]
      }
    },
    required: ["memory_type", "key", "value", "importance"]
  }
};

// Backend handler
async function handleExtractMemory(userId: string, args: any) {
  const memory: UserMemory = {
    id: `mem_${generateId()}`,
    userId: userId,
    memoryType: args.memory_type,
    key: args.key,
    value: args.value,
    extractedAt: new Date().toISOString(),
    context: getCurrentConversationContext(),
    importance: args.importance,
    confidence: 0.95, // MVP: fixed confidence
    accessCount: 0
  };
  
  await cosmosDB.upsert('UserMemories', memory);
  
  return {
    success: true,
    message: "Memory saved successfully"
  };
}
```

### MVP Memory Retrieval (Simple Keyword Search)

**No embeddings/semantic search for MVP** - use simple text search:

```typescript
class LongTermMemoryService {
  async searchMemories(userId: string, keywords: string[]): Promise<UserMemory[]> {
    // Simple approach: Query by memoryType or keyword in key/value
    const query = `
      SELECT * FROM UserMemories m
      WHERE m.userId = @userId
        AND (
          CONTAINS(LOWER(m.key), @keyword)
          OR CONTAINS(LOWER(m.value), @keyword)
        )
      ORDER BY m.importance DESC, m.extractedAt DESC
      OFFSET 0 LIMIT 5
    `;
    
    const results = await cosmosDB.query(query, {
      userId: userId,
      keyword: keywords[0].toLowerCase() // MVP: use first keyword only
    });
    
    // Update access tracking
    for (const memory of results) {
      await this.trackAccess(memory.id);
    }
    
    return results;
  }
  
  async getAllMemories(userId: string, limit: number = 50): Promise<UserMemory[]> {
    // MVP: Just get all memories, sorted by importance
    const query = `
      SELECT * FROM UserMemories m
      WHERE m.userId = @userId
      ORDER BY m.importance DESC, m.extractedAt DESC
      OFFSET 0 LIMIT @limit
    `;
    
    return await cosmosDB.query(query, { userId, limit });
  }
  
  private async trackAccess(memoryId: string): Promise<void> {
    // Update lastAccessed and increment accessCount
    await cosmosDB.patch('UserMemories', memoryId, [
      { op: 'set', path: '/lastAccessed', value: new Date().toISOString() },
      { op: 'incr', path: '/accessCount', value: 1 }
    ]);
  }
}
```

---

## Realtime API Integration

### Session Initialization (Memory Injection)

At the start of each Realtime API session, inject all 3 memory tiers into system instructions:

```typescript
async function startRealtimeSession(userId: string): Promise<RealtimeSession> {
  // 1. Load all memory tiers
  const shortTerm = await shortTermMemory.getRecentTurns(userId);
  const working = await workingMemory.getWorkingMemory(userId);
  const longTerm = await longTermMemory.getAllMemories(userId, 50);
  
  // 2. Build system instructions with memories
  const systemInstructions = buildSystemPrompt({
    shortTermMemory: shortTerm,
    workingMemory: working,
    longTermMemory: longTerm,
    safetyRules: await getSafetyRules(userId)
  });
  
  // 3. Create Realtime API session
  const session = await azureRealtimeAPI.createSession({
    instructions: systemInstructions,
    voice: "alloy",
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    tools: [
      memoryExtractionTool,
      photoTriggerTool,
      familyAlertTool
    ]
  });
  
  return session;
}
```

### System Prompt Template (MVP)

```typescript
function buildSystemPrompt(context: MemoryContext): string {
  return `
You are a warm, patient AI companion for תפארת (Tiferet), an elderly person living with dementia.

## CONVERSATION CONTEXT

### Recent Conversation (Last 10 Turns)
${formatShortTermMemory(context.shortTermMemory)}

### Recent Activity (Last 7 Days)
${formatWorkingMemory(context.workingMemory)}

### Personal Information (Long-Term Memory)
${formatLongTermMemory(context.longTermMemory)}

## YOUR ROLE
- Provide companionship and conversation
- Remind about medications, appointments, daily routines
- Show family photos when contextually appropriate
- Always speak in Hebrew
- Be patient with repetition - dementia patients may ask same question multiple times

## MEMORY EXTRACTION
When user mentions NEW important information, call extract_important_memory() function:
- Family members (names, relationships, jobs, locations)
- Medical conditions or medications
- Personal preferences (hobbies, favorite foods)
- Daily routines or habits

## SAFETY RULES
${formatSafetyRules(context.safetyRules)}
`;
}

function formatLongTermMemory(memories: UserMemory[]): string {
  if (memories.length === 0) return "No long-term memories yet.";
  
  const grouped = groupBy(memories, m => m.memoryType);
  
  return Object.entries(grouped)
    .map(([type, mems]) => {
      const items = mems.map(m => `- ${m.value}`).join('\n');
      return `**${type}:**\n${items}`;
    })
    .join('\n\n');
}
```

**Example Injected Memory Section:**

```
### Personal Information (Long-Term Memory)

**family_info:**
- Granddaughter Sarah works as a teacher in Tel Aviv
- Daughter מיכל lives in Haifa, calls every Tuesday evening
- Deceased wife צביה, passed away 5 years ago

**preferences:**
- Has a garden with roses that are currently blooming. Very proud of them.
- Loves classical music, especially Mozart
- Enjoys watching birds from kitchen window

**medical_info:**
- Takes Metformin 500mg twice daily (morning and evening)
- Has Type 2 diabetes, diagnosed 10 years ago
- Allergic to penicillin
```

---

## Performance Characteristics

| Operation | Latency | Cost (per operation) | Notes |
|-----------|---------|----------------------|-------|
| **Load short-term memory** | < 10ms | Negligible (Redis) | 10 turns = ~1KB data |
| **Load working memory** | < 10ms | Negligible (Redis) | ~2KB JSON object |
| **Load long-term memory** | 50-100ms | ~$0.0001 | 50 memories = ~10KB |
| **Total session start overhead** | **< 150ms** | **~$0.0001** | Acceptable for MVP |
| **Memory injection tokens** | ~800 tokens | ~$0.0016 | At $0.002 per 1K input tokens |
| **Extract new memory** | 100-200ms | ~$0.0001 | Cosmos DB write |

**Total cost per session start:** ~$0.0017 (less than 0.2 cents)

---

## Multi-Day Continuity Example

### Day 1: November 9, 2025 (Morning)

**User:** "הנכדה שלי שרה עובדת מורה בתל אביב"  
(My granddaughter Sarah works as a teacher in Tel Aviv)

**AI Internal:**
```javascript
// AI calls extract_important_memory()
{
  memory_type: "family_info",
  key: "granddaughter_sarah_job",
  value: "Granddaughter Sarah works as a teacher in Tel Aviv",
  importance: "high"
}
```

**AI Response:** "כמה יפה! שרה מורה בתל אביב. מה היא מלמדת?"  
(How lovely! Sarah is a teacher in Tel Aviv. What does she teach?)

---

### Day 1: November 9, 2025 (Evening - New Session)

**Session starts → Backend loads memories:**
- Short-term: Empty (morning session ended hours ago)
- Working memory: "Talked about granddaughter Sarah being a teacher"
- Long-term: "Granddaughter Sarah works as a teacher in Tel Aviv"

**AI (proactively):** "שלום תפארת! איך היה לך היום? דיברנו הבוקר על שרה המורה."  
(Hello Tiferet! How was your day? We talked this morning about Sarah the teacher.)

---

### Day 2: November 10, 2025

**User:** "שרה התקשרה אלי אתמול"  
(Sarah called me yesterday)

**AI:** "נהדר ששרה התקשרה! מה שמעת ממנה? היא עדיין מלמדת בתל אביב?"  
(Great that Sarah called! What did you hear from her? Is she still teaching in Tel Aviv?)

**Note:** AI remembered Sarah = teacher in Tel Aviv from Day 1

---

### Day 7: November 16, 2025

**Session starts → Memory still intact:**
- Short-term: Empty
- Working memory: Expired (> 7 days ago)
- Long-term: Still has "Granddaughter Sarah works as a teacher in Tel Aviv"

**AI can still reference:** "איך שרה? היא עדיין מלמדת בתל אביב?"  
(How is Sarah? Is she still teaching in Tel Aviv?)

---

## MVP Simplifications

### What We're NOT Doing (Post-MVP)

1. ❌ **Semantic search with embeddings** - No text-embedding-ada-002, no vector queries
2. ❌ **Automatic summarization** - No GPT-4 summarizing old conversations
3. ❌ **Memory importance decay** - No automatic downranking of old memories
4. ❌ **Memory deduplication** - If AI extracts same fact twice, we keep both (manual cleanup later)
5. ❌ **Memory conflict resolution** - If contradictory facts (e.g., "Sarah is teacher" vs "Sarah is doctor"), no automatic resolution
6. ❌ **Privacy-aware filtering** - No automatic detection of "sensitive" memories to exclude
7. ❌ **Memory pruning** - Keep all memories forever (no 50-memory limit enforcement)

### What We ARE Doing (MVP)

1. ✅ **Simple keyword search** - CONTAINS() queries in Cosmos DB
2. ✅ **Manual memory extraction** - AI calls function when it detects important facts
3. ✅ **Fixed limits** - 10 short-term turns, 5 working memory themes, 50 long-term facts loaded per session
4. ✅ **Basic access tracking** - Count how many times each memory is used
5. ✅ **Three-tier system** - Redis + Redis + Cosmos DB as designed

---

## Testing Strategy

### Unit Tests

```typescript
describe('MemoryService', () => {
  it('should store and retrieve short-term memory', async () => {
    await shortTermMemory.addTurn(userId, {
      role: 'user',
      timestamp: new Date().toISOString(),
      transcript: 'Hello'
    });
    
    const turns = await shortTermMemory.getRecentTurns(userId);
    expect(turns).toHaveLength(1);
    expect(turns[0].transcript).toBe('Hello');
  });
  
  it('should limit short-term memory to 10 turns', async () => {
    // Add 15 turns
    for (let i = 0; i < 15; i++) {
      await shortTermMemory.addTurn(userId, createTurn(`Turn ${i}`));
    }
    
    const turns = await shortTermMemory.getRecentTurns(userId);
    expect(turns).toHaveLength(10);
    expect(turns[0].transcript).toBe('Turn 5'); // First 5 dropped
  });
  
  it('should extract and store long-term memory', async () => {
    await longTermMemory.extractMemory(userId, {
      memory_type: 'family_info',
      key: 'granddaughter_sarah',
      value: 'Sarah is a teacher',
      importance: 'high'
    });
    
    const memories = await longTermMemory.getAllMemories(userId);
    expect(memories).toHaveLength(1);
    expect(memories[0].value).toBe('Sarah is a teacher');
  });
});
```

### Integration Tests

```typescript
describe('Memory Integration (E2E)', () => {
  it('should maintain memory across sessions', async () => {
    // Session 1: User mentions Sarah
    const session1 = await startRealtimeSession(userId);
    await simulateUserSpeech(session1, 'הנכדה שלי שרה עובדת מורה');
    await session1.end();
    
    // Wait for memory extraction
    await sleep(1000);
    
    // Session 2: AI should remember Sarah
    const session2 = await startRealtimeSession(userId);
    const systemPrompt = session2.getSystemInstructions();
    expect(systemPrompt).toContain('Sarah');
    expect(systemPrompt).toContain('teacher');
  });
});
```

---

## Monitoring & Metrics

### Key Metrics (Azure Application Insights)

| Metric | Target | Notes |
|--------|--------|-------|
| **Memory load latency** | < 150ms | Time to load all 3 tiers |
| **Memory injection tokens** | < 1000 tokens | Size of injected memories |
| **Memories extracted per session** | 1-3 | How many new facts AI learns |
| **Memory retrieval accuracy** | N/A (MVP) | Post-MVP: relevance scoring |

### Dashboard Queries

```kusto
// Memories extracted per day
UserMemories
| where timestamp > ago(7d)
| summarize MemoriesExtracted = count() by bin(timestamp, 1d), userId
| render timechart

// Most accessed memories (top 10)
UserMemories
| top 10 by accessCount desc
| project userId, key, value, accessCount, lastAccessed
```

---

## Future Enhancements (Post-MVP)

### 1. Semantic Search with Embeddings

Add `embedding` field to `UserMemory` schema:

```typescript
interface UserMemory {
  // ... existing fields
  embedding?: number[]; // 1536-dim vector (text-embedding-ada-002)
}

// Generate embedding when extracting memory
const embedding = await azureOpenAI.embeddings.create({
  model: "text-embedding-ada-002",
  input: memory.value
});

memory.embedding = embedding.data[0].embedding;
```

Query with cosine similarity:

```sql
SELECT * FROM UserMemories m
WHERE m.userId = @userId
  AND VectorDistance(m.embedding, @queryEmbedding) < 0.3
ORDER BY VectorDistance(m.embedding, @queryEmbedding)
LIMIT 5
```

### 2. Automatic Summarization

At end of session, summarize last 30 turns:

```typescript
async function summarizeSession(transcript: Turn[]): Promise<string> {
  const summary = await gpt4.chatCompletion({
    messages: [
      { role: 'system', content: 'Summarize this conversation in 2-3 sentences' },
      { role: 'user', content: JSON.stringify(transcript) }
    ]
  });
  
  return summary.choices[0].message.content;
}
```

### 3. Memory Importance Decay

Lower importance score over time for unused memories:

```typescript
// Weekly cron job
async function decayMemoryImportance() {
  const oldMemories = await cosmosDB.query(`
    SELECT * FROM UserMemories m
    WHERE m.lastAccessed < @thirtyDaysAgo
      AND m.importance != 'high'
  `);
  
  for (const memory of oldMemories) {
    // Reduce importance: medium → low
    if (memory.importance === 'medium') {
      await cosmosDB.patch(memory.id, [
        { op: 'set', path: '/importance', value: 'low' }
      ]);
    }
  }
}
```

---

## Open Questions

1. **Memory conflicts:** How to handle contradictory facts? (e.g., "Sarah is teacher" vs "Sarah is doctor")
2. **Privacy:** Should certain topics never be remembered? (family conflicts, medical diagnoses)
3. **Memory limits:** Should we cap at 50 long-term memories per user? Or allow unlimited?
4. **Manual editing:** Should family members be able to edit/delete memories via dashboard?

---

**Document Version:** 1.0  
**Last Updated:** November 9, 2025  
**Next Review:** After MVP testing - gather feedback on memory accuracy and retrieval relevance
