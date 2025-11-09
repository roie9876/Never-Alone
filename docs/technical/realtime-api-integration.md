# 🎙️ Azure OpenAI Realtime API Integration

## Overview

Never Alone uses **Azure OpenAI Realtime API (GPT-4o Realtime)** for native audio-to-audio conversations. This provides ultra-low latency (<600ms) and natural conversational flow without traditional STT/TTS pipeline delays.

**Model:** `gpt-4o-realtime-preview-2024-10-01`  
**API Version:** `2024-08-28`

---

## Why Realtime API?

### Traditional Pipeline (OLD):
```
User Audio → Whisper STT → Text → GPT-4 → Text → Azure TTS → AI Audio
          (300ms)               (800ms)           (400ms)
          = ~1500ms total latency
```

### Realtime API (NEW):
```
User Audio → GPT-4o Realtime (audio-native reasoning) → AI Audio
          (400-600ms total, includes "thinking")
```

**Benefits:**
- ✅ **3x faster** than traditional pipeline
- ✅ **Natural prosody** - AI maintains emotional tone, pacing, interruptions
- ✅ **Lower cost** - single API call instead of 3 separate services
- ✅ **Built-in VAD** - server-side voice activity detection
- ✅ **Function calling** - for safety alerts, reminders, photo viewing

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       TABLET (Flutter)                       │
│                                                              │
│  • Microphone captures audio (16kHz PCM16)                  │
│  • WebSocket connection to backend                          │
│  • Streams audio chunks in real-time                        │
│  • Receives AI audio response                               │
│  • Optional: Display transcript on screen                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket (binary audio + JSON events)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            BACKEND ORCHESTRATOR (Node.js/Python)            │
│                                                              │
│  • Maintains persistent WebSocket to Azure Realtime API    │
│  • Proxies audio from tablet → Azure                        │
│  • Listens to ALL events from Azure                         │
│  • Extracts transcripts from events                         │
│  • Saves turns to Cosmos DB in real-time                    │
│  • Applies safety filters on transcripts                    │
│  • Triggers family alerts if unsafe request detected        │
│  • Extracts important facts → saves to UserMemories         │
│  • Updates Redis cache (short-term memory)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            AZURE OPENAI REALTIME API                         │
│                                                              │
│  • Receives audio stream                                    │
│  • Server-side VAD (detects when user stops speaking)       │
│  • Whisper transcription (if enabled)                       │
│  • GPT-4o audio-native reasoning                            │
│  • Generates audio response                                 │
│  • Emits events: transcripts, audio chunks, function calls  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA STORAGE LAYER                         │
│                                                              │
│  • Cosmos DB: Conversations (turns with transcripts)        │
│  • Cosmos DB: UserMemories (important facts extracted)      │
│  • Redis: Short-term context (last 10 turns)                │
│  • Azure Blob: Audio recordings (optional, with consent)    │
└─────────────────────────────────────────────────────────────┘
```

---

## Session Configuration

### Initial Session Setup

```javascript
const session = await azureOpenAI.beta.realtime.sessions.create({
  model: "gpt-4o-realtime-preview-2024-10-01",
  
  // Enable both audio and text modalities
  modalities: ["audio", "text"],
  
  // Voice selection (warm, clear, female-sounding for dementia mode)
  voice: "alloy",  // Options: alloy, echo, fable, onyx, nova, shimmer
  
  // CRITICAL: Enable transcript extraction
  input_audio_transcription: {
    model: "whisper-1"
  },
  
  // Audio format
  input_audio_format: "pcm16",  // 16-bit PCM
  output_audio_format: "pcm16",
  
  // Server-side Voice Activity Detection
  turn_detection: {
    type: "server_vad",
    threshold: 0.5,           // Sensitivity (0.0 - 1.0)
    prefix_padding_ms: 300,   // Include 300ms before speech
    silence_duration_ms: 500  // 500ms silence = turn complete
  },
  
  // System instructions with patient context
  instructions: buildSystemPrompt(userId),
  
  // Enable function calling for safety alerts
  tools: [
    {
      type: "function",
      name: "trigger_family_alert",
      description: "Alert family member when user requests unsafe activity",
      parameters: {
        type: "object",
        properties: {
          severity: { 
            type: "string", 
            enum: ["critical", "high", "medium"],
            description: "Alert priority level"
          },
          user_request: { 
            type: "string",
            description: "What the user asked to do"
          },
          safety_rule_violated: {
            type: "string",
            description: "Which safety rule was triggered"
          }
        },
        required: ["severity", "user_request", "safety_rule_violated"]
      }
    },
    {
      type: "function",
      name: "extract_important_memory",
      description: "Extract important fact to save in long-term memory",
      parameters: {
        type: "object",
        properties: {
          memory_type: {
            type: "string",
            enum: ["personal_fact", "preference", "family_info", "medical_info"],
            description: "Category of memory"
          },
          key: { type: "string", description: "Memory identifier (e.g., 'daughter_name')" },
          value: { type: "string", description: "Memory content (e.g., 'Sarah')" },
          context: { type: "string", description: "How this was learned" }
        },
        required: ["memory_type", "key", "value"]
      }
    }
  ],
  
  // Temperature for creativity (lower = more consistent)
  temperature: 0.8,
  
  // Max response tokens
  max_response_output_tokens: 4096
});
```

---

## Event Handling & Transcript Logging

### Key Events to Monitor

```javascript
const conversationTurns = [];
let currentTurnId = 0;

// ═══════════════════════════════════════════════════════════
// USER SPEAKS (Input Audio Transcription Complete)
// ═══════════════════════════════════════════════════════════
ws.on('conversation.item.input_audio_transcription.completed', async (event) => {
  currentTurnId++;
  
  const userTurn = {
    turnId: currentTurnId,
    timestamp: new Date().toISOString(),
    speaker: "user",
    transcript: event.transcript,
    audioItemId: event.item_id,
    contentIndex: event.content_index
  };
  
  conversationTurns.push(userTurn);
  
  // Save to Cosmos DB immediately (async, non-blocking)
  await saveConversationTurn(userId, conversationId, userTurn);
  
  // Check safety rules
  const safetyViolation = checkSafetyRules(event.transcript, userSafetyRules);
  if (safetyViolation) {
    console.warn(`Safety violation detected: ${safetyViolation.rule}`);
    // AI will call trigger_family_alert() function automatically
  }
  
  // Update Redis short-term memory
  await redis.lpush(`user:${userId}:recent_turns`, JSON.stringify(userTurn));
  await redis.ltrim(`user:${userId}:recent_turns`, 0, 9); // Keep last 10 turns
});

// ═══════════════════════════════════════════════════════════
// AI RESPONDS (Response Audio Transcript Done)
// ═══════════════════════════════════════════════════════════
ws.on('response.audio_transcript.done', async (event) => {
  currentTurnId++;
  
  const aiTurn = {
    turnId: currentTurnId,
    timestamp: new Date().toISOString(),
    speaker: "ai",
    transcript: event.transcript,
    responseId: event.response_id,
    itemId: event.item_id,
    outputIndex: event.output_index
  };
  
  conversationTurns.push(aiTurn);
  
  // Save to Cosmos DB
  await saveConversationTurn(userId, conversationId, aiTurn);
  
  // Update Redis
  await redis.lpush(`user:${userId}:recent_turns`, JSON.stringify(aiTurn));
  await redis.ltrim(`user:${userId}:recent_turns`, 0, 9);
});

// ═══════════════════════════════════════════════════════════
// AI PARTIAL TRANSCRIPTS (Streaming - Optional Display)
// ═══════════════════════════════════════════════════════════
let aiTranscriptBuffer = "";

ws.on('response.audio_transcript.delta', (event) => {
  aiTranscriptBuffer += event.delta;
  
  // Optional: Send to tablet for real-time display
  tabletWs.send(JSON.stringify({
    type: "transcript_delta",
    text: event.delta
  }));
});

// ═══════════════════════════════════════════════════════════
// FUNCTION CALLS (Safety Alerts, Memory Extraction)
// ═══════════════════════════════════════════════════════════
ws.on('response.function_call_arguments.done', async (event) => {
  const functionName = event.name;
  const args = JSON.parse(event.arguments);
  
  if (functionName === "trigger_family_alert") {
    // Extract details
    const { severity, user_request, safety_rule_violated } = args;
    
    // Save safety incident to Cosmos DB
    await saveSafetyIncident({
      userId,
      timestamp: new Date().toISOString(),
      severity,
      userRequest: user_request,
      safetyRuleTriggered: safety_rule_violated,
      conversationId,
      turnId: currentTurnId
    });
    
    // Send SMS/Push notification to family
    await sendFamilyAlert(userId, {
      severity,
      message: `${user.name} requested: "${user_request}"`,
      safetyRule: safety_rule_violated
    });
    
    // Return success to AI
    ws.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: event.call_id,
        output: JSON.stringify({ status: "family_alerted" })
      }
    }));
  }
  
  else if (functionName === "extract_important_memory") {
    // Save to UserMemories container
    const { memory_type, key, value, context } = args;
    
    await saveUserMemory({
      userId,
      memoryType: memory_type,
      key,
      value,
      context: context || "Learned from conversation",
      confidenceScore: 0.85,
      timestamp: new Date().toISOString()
    });
    
    // Return success
    ws.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: event.call_id,
        output: JSON.stringify({ status: "memory_saved" })
      }
    }));
  }
});

// ═══════════════════════════════════════════════════════════
// AUDIO CHUNKS (Stream to Tablet)
// ═══════════════════════════════════════════════════════════
ws.on('response.audio.delta', (event) => {
  const audioChunk = Buffer.from(event.delta, 'base64');
  
  // Forward to tablet immediately (lowest latency)
  tabletWs.send(audioChunk, { binary: true });
});

// ═══════════════════════════════════════════════════════════
// SESSION ERRORS
// ═══════════════════════════════════════════════════════════
ws.on('error', async (event) => {
  console.error("Realtime API error:", event.error);
  
  // Log error
  await logError({
    userId,
    conversationId,
    errorType: event.error.type,
    errorMessage: event.error.message,
    timestamp: new Date().toISOString()
  });
  
  // Notify tablet
  tabletWs.send(JSON.stringify({
    type: "error",
    message: "Connection issue. Reconnecting..."
  }));
});
```

---

## System Prompt Construction

### Dynamic Prompt with User Context

```javascript
function buildSystemPrompt(userId) {
  // Load user profile from Cosmos DB
  const user = await cosmosDB.getUserProfile(userId);
  
  // Load recent conversation context from Redis
  const recentTurns = await redis.lrange(`user:${userId}:recent_turns`, 0, 9);
  
  // Load long-term memories from Cosmos DB
  const memories = await cosmosDB.getUserMemories(userId, { limit: 10 });
  
  return `You are a compassionate AI companion named ${user.aiName || "Nora"}.

You are speaking with ${user.personalInfo.name}, who is ${user.personalInfo.age} years old.

CORE BEHAVIOR:
- Be warm, empathetic, and patient
- Use simple, clear language (suitable for ${user.cognitiveMode} mode)
- Remember personal details from previous conversations
- Provide emotional validation before advice
- Keep responses SHORT (2-3 sentences max)

USER CONTEXT:
- Name: ${user.personalInfo.name}
- Age: ${user.personalInfo.age}
- Language: ${user.personalInfo.language} (respond in this language)
- Mode: ${user.cognitiveMode}
- Current time: ${new Date().toLocaleString('en-US', { timeZone: user.personalInfo.timezone })}

FAMILY MEMBERS:
${user.familyMembers.map(fm => `- ${fm.name} (${fm.relationship})`).join('\n')}

RECENT CONVERSATION:
${recentTurns.map(turn => `${turn.speaker}: ${turn.transcript}`).join('\n')}

IMPORTANT MEMORIES:
${memories.map(m => `- ${m.key}: ${m.value}`).join('\n')}

═══════════════════════════════════════════════════════════
CRITICAL SAFETY RULES (${user.cognitiveMode.toUpperCase()} MODE)
═══════════════════════════════════════════════════════════

NEVER allow or encourage:
${user.safetyRules.neverAllow.map(rule => `- ${rule.rule}: ${rule.reason}`).join('\n')}

When user asks to do something UNSAFE:
1. DO NOT say yes or give permission
2. Respond gently: "That's a good thought, but let's check with ${user.familyMembers[0].name} first."
3. IMMEDIATELY call trigger_family_alert() function with severity and details
4. Offer safe alternative: suggest sitting, music, photos, or waiting together

ALWAYS redirect to family for:
${user.safetyRules.redirectToFamily.join(', ')}

Safe activities you CAN suggest:
${user.safetyRules.approvedActivities.join(', ')}

═══════════════════════════════════════════════════════════
MEMORY EXTRACTION
═══════════════════════════════════════════════════════════

When you learn NEW important information about ${user.personalInfo.name}:
- Family member names, relationships, birthdays
- Medical information (allergies, conditions)
- Preferences (favorite music, food, activities)
- Life history (career, hometown, major events)

CALL extract_important_memory() with:
- memory_type: category
- key: identifier (e.g., "granddaughter_name")
- value: content (e.g., "Emma")
- context: how you learned this

═══════════════════════════════════════════════════════════
IMPORTANT RULES
═══════════════════════════════════════════════════════════

1. DO NOT provide medical advice or diagnoses
2. DO NOT suggest medication changes
3. If user expresses self-harm thoughts: "That sounds really hard. Let's talk to ${user.familyMembers[0].name} right now." + trigger alert
4. Keep responses under 3 sentences
5. Always provide time/date orientation if user seems confused
6. Be emotionally present but never patronizing

Now respond to ${user.personalInfo.name} with warmth, safety, and compassion.`;
}
```

---

## Cosmos DB Document Structures

### 1. Conversations Container

```json
{
  "id": "conv_2024-11-09_10-30_user_12345",
  "userId": "user_12345",
  "type": "conversation",
  "conversationId": "conv_xyz",
  "sessionId": "session_abc",
  "startTime": "2024-11-09T10:30:00Z",
  "endTime": "2024-11-09T10:45:00Z",
  "turns": [
    {
      "turnId": 1,
      "timestamp": "2024-11-09T10:30:00.123Z",
      "speaker": "user",
      "transcript": "אני לא מוצא את צביה",
      "audioItemId": "item_abc123",
      "emotion": {
        "primary": "anxiety",
        "confidence": 0.85
      }
    },
    {
      "turnId": 2,
      "timestamp": "2024-11-09T10:30:02.456Z",
      "speaker": "ai",
      "transcript": "בוא נתקשר לצביה עכשיו כדי לראות איפה היא",
      "responseId": "resp_def456",
      "itemId": "item_ghi789",
      "latencyMs": 580,
      "safetyCheckPassed": true
    },
    {
      "turnId": 3,
      "timestamp": "2024-11-09T10:30:15.789Z",
      "speaker": "user",
      "transcript": "אולי אצא לחפש אותה בחוץ?",
      "audioItemId": "item_jkl012"
    },
    {
      "turnId": 4,
      "timestamp": "2024-11-09T10:30:17.234Z",
      "speaker": "ai",
      "transcript": "אני מבין שאתה דואג, אבל בוא נשאל את מיכל קודם. בינתיים, בוא נשב ונחכה ביחד.",
      "responseId": "resp_mno345",
      "itemId": "item_pqr678",
      "latencyMs": 620,
      "safetyCheckPassed": false,
      "safetyRuleTriggered": "leaving_home_alone",
      "functionCalled": "trigger_family_alert",
      "familyAlerted": true,
      "alertDetails": {
        "severity": "critical",
        "sentTo": ["צביה", "מיכל"],
        "sentAt": "2024-11-09T10:30:18Z"
      }
    }
  ],
  "summary": "User couldn't find spouse and wanted to go outside. AI redirected to family and sent critical alert.",
  "totalTurns": 12,
  "durationSeconds": 900,
  "safetyIncidents": 1,
  "memoriesExtracted": 0,
  "ttl": 7776000,
  "_ts": 1699524000
}
```

### 2. UserMemories Container (Extracted During Conversation)

```json
{
  "id": "memory_abc",
  "userId": "user_12345",
  "type": "user_memory",
  "memoryType": "family_info",
  "category": "family",
  "key": "granddaughter_birthday",
  "value": "Emma's birthday is June 15th",
  "context": "Learned from conversation on 2024-11-09 when user mentioned planning her birthday party",
  "source": "realtime_conversation",
  "conversationId": "conv_xyz",
  "turnId": 7,
  "confidenceScore": 0.95,
  "createdAt": "2024-11-09T10:35:00Z",
  "lastAccessed": "2024-11-09T10:35:00Z",
  "accessCount": 1,
  "_ts": 1699524000
}
```

### 3. SafetyIncidents Container

```json
{
  "id": "incident_ghi",
  "userId": "user_12345",
  "type": "safety_incident",
  "timestamp": "2024-11-09T10:30:17Z",
  "incidentType": "unsafe_physical_movement",
  "severity": "critical",
  "conversationId": "conv_xyz",
  "turnId": 4,
  "context": {
    "userRequest": "אולי אצא לחפש את צביה בחוץ?",
    "aiResponse": "אני מבין שאתה דואג, אבל בוא נשאל את מיכל קודם",
    "audioItemId": "item_jkl012"
  },
  "safetyRule": {
    "ruleId": "leaving_home_alone",
    "ruleName": "Never allow leaving home alone",
    "configuredBy": "family",
    "reason": "Busy highway nearby, disorientation risk"
  },
  "functionCalled": "trigger_family_alert",
  "functionArgs": {
    "severity": "critical",
    "user_request": "אולי אצא לחפש את צביה בחוץ?",
    "safety_rule_violated": "leaving_home_alone"
  },
  "familyNotification": {
    "notified": true,
    "recipients": [
      {
        "name": "צביה",
        "phone": "+972-50-xxx-xxxx",
        "notificationMethod": "sms",
        "sentAt": "2024-11-09T10:30:18Z",
        "acknowledged": true,
        "acknowledgedAt": "2024-11-09T10:32:45Z"
      }
    ]
  },
  "resolution": {
    "resolved": true,
    "resolvedAt": "2024-11-09T10:40:00Z",
    "resolvedBy": "צביה",
    "notes": "Called patient, he is calm now"
  },
  "ttl": 220752000,
  "_ts": 1699524000
}
```

---

## Backend Implementation (Pseudo-code)

### Main Orchestrator Service

```python
import asyncio
import json
from azure.ai.openai import AzureOpenAI
from azure.cosmos import CosmosClient
import redis

class RealtimeOrchestrator:
    def __init__(self, user_id):
        self.user_id = user_id
        self.conversation_id = generate_conversation_id()
        self.turn_id = 0
        
        # Initialize clients
        self.azure_client = AzureOpenAI(endpoint=AZURE_ENDPOINT, api_key=AZURE_KEY)
        self.cosmos_client = CosmosClient(COSMOS_ENDPOINT, COSMOS_KEY)
        self.redis_client = redis.Redis(host=REDIS_HOST, port=6379, decode_responses=True)
        
        # Load user profile and safety rules
        self.user_profile = self.load_user_profile()
        self.safety_rules = self.user_profile['safetyRules']
    
    async def start_session(self, tablet_websocket):
        """Start Realtime API session and handle events"""
        
        # Build system prompt with user context
        system_prompt = self.build_system_prompt()
        
        # Create Realtime session
        session = await self.azure_client.beta.realtime.sessions.create(
            model="gpt-4o-realtime-preview-2024-10-01",
            modalities=["audio", "text"],
            voice="alloy",
            input_audio_transcription={"model": "whisper-1"},
            turn_detection={
                "type": "server_vad",
                "threshold": 0.5,
                "silence_duration_ms": 500
            },
            instructions=system_prompt,
            tools=self.get_function_tools()
        )
        
        # Event handlers
        async for event in session.listen():
            await self.handle_event(event, tablet_websocket)
    
    async def handle_event(self, event, tablet_ws):
        """Route events to appropriate handlers"""
        
        if event.type == "conversation.item.input_audio_transcription.completed":
            await self.handle_user_transcript(event)
        
        elif event.type == "response.audio_transcript.done":
            await self.handle_ai_transcript(event)
        
        elif event.type == "response.audio.delta":
            await self.handle_audio_chunk(event, tablet_ws)
        
        elif event.type == "response.function_call_arguments.done":
            await self.handle_function_call(event)
    
    async def handle_user_transcript(self, event):
        """Save user's spoken words"""
        self.turn_id += 1
        
        turn = {
            "turnId": self.turn_id,
            "timestamp": datetime.utcnow().isoformat(),
            "speaker": "user",
            "transcript": event.transcript,
            "audioItemId": event.item_id
        }
        
        # Save to Cosmos DB (async)
        await self.save_conversation_turn(turn)
        
        # Update Redis short-term memory
        await self.redis_client.lpush(
            f"user:{self.user_id}:recent_turns",
            json.dumps(turn)
        )
        await self.redis_client.ltrim(f"user:{self.user_id}:recent_turns", 0, 9)
        
        # Check safety
        violation = self.check_safety_rules(event.transcript)
        if violation:
            logger.warning(f"Safety violation: {violation}")
    
    async def handle_ai_transcript(self, event):
        """Save AI's spoken response"""
        self.turn_id += 1
        
        turn = {
            "turnId": self.turn_id,
            "timestamp": datetime.utcnow().isoformat(),
            "speaker": "ai",
            "transcript": event.transcript,
            "responseId": event.response_id,
            "itemId": event.item_id
        }
        
        await self.save_conversation_turn(turn)
        await self.redis_client.lpush(
            f"user:{self.user_id}:recent_turns",
            json.dumps(turn)
        )
    
    async def handle_function_call(self, event):
        """Handle AI function calls (safety alerts, memory extraction)"""
        
        function_name = event.name
        args = json.loads(event.arguments)
        
        if function_name == "trigger_family_alert":
            await self.trigger_family_alert(
                severity=args['severity'],
                user_request=args['user_request'],
                safety_rule=args['safety_rule_violated']
            )
        
        elif function_name == "extract_important_memory":
            await self.save_user_memory(
                memory_type=args['memory_type'],
                key=args['key'],
                value=args['value'],
                context=args.get('context', 'Learned from conversation')
            )
```

---

## Cost Estimation (Realtime API)

### Pricing (as of 2024)
- **Input audio:** ~$0.06 per minute
- **Output audio:** ~$0.24 per minute
- **Cached input (prompt):** ~$0.015 per minute

### Example Calculation (100 users, 3 conversations/day)
- Avg conversation: 5 minutes
- Input: 2.5 min user speech
- Output: 2.5 min AI speech

**Per conversation:**
- Input: 2.5 × $0.06 = $0.15
- Output: 2.5 × $0.24 = $0.60
- **Total:** ~$0.75 per conversation

**Per user per month:**
- 3 conversations/day × 30 days = 90 conversations
- 90 × $0.75 = **$67.50/user/month**

**100 users:** $6,750/month (~$81K/year)

**Cost savings vs traditional pipeline:**
- Traditional: Whisper + GPT-4 + TTS = ~$85/user/month
- Realtime API: ~$68/user/month
- **Savings: ~20%** + significantly lower latency

---

## Testing Strategy

### 1. Transcript Accuracy Testing
```bash
# Test Hebrew transcription quality
- Record 100 Hebrew phrases
- Compare Realtime API transcripts vs human transcripts
- Target: >95% word accuracy
```

### 2. Safety Rule Detection
```bash
# Test all safety scenarios
- "אני רוצה לצאת החוצה לחפש את צביה" → Should trigger alert
- "אני רוצה לשבת בגינה" → Should allow (approved activity)
- "אולי אקח עוד כדור?" → Should block + alert
```

### 3. Memory Extraction
```bash
# Verify AI extracts important facts
User: "הנכדה שלי שרה גרה בתל אביב"
Expected: extract_important_memory(
  memory_type="family_info",
  key="granddaughter_location",
  value="Sarah lives in Tel Aviv"
)
```

### 4. Latency Benchmarks
```bash
# Measure end-to-end latency
- User stops speaking → AI starts speaking
- Target: < 800ms (p95)
- Test with: 10 concurrent users, 50 concurrent users
```

---

## Monitoring & Observability

### Key Metrics to Track

**Conversation Quality:**
- Transcript accuracy (% words correct)
- AI response latency (p50, p95, p99)
- Safety incidents detected / total conversations
- Function calls triggered (alerts, memory extractions)

**Technical Performance:**
- WebSocket connection drops
- Realtime API errors (rate, types)
- Cosmos DB write latency
- Redis cache hit rate

**User Experience:**
- Conversations per user per day
- Avg conversation duration
- User interruptions (mid-response)
- Family alert response time

---

## Next Steps

1. ✅ Implement WebSocket proxy in backend
2. ✅ Build event handlers for all Realtime API events
3. ✅ Integrate Cosmos DB conversation logging
4. ✅ Add safety function calling
5. ✅ Add memory extraction function
6. ✅ Test Hebrew transcription quality
7. ✅ Load test with 50+ concurrent sessions
8. ✅ Optimize system prompt for token efficiency
9. ✅ Add audio recording to Blob Storage (optional)
10. ✅ Build family dashboard transcript viewer

---

*This architecture provides native audio conversations with full transcript logging, safety monitoring, and intelligent memory extraction - all within the latency budget for elderly users.*
