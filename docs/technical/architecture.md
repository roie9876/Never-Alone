# ⚙️ Technical Architecture

## System Overview

Never Alone is built as a cloud-native, AI-powered application with offline-first capabilities for reliability. The architecture prioritizes **low latency**, **high availability**, and **privacy**.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      USER DEVICE                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Tablet App (Flutter/React Native)      │  │
│  │                                                   │  │
│  │  • Voice UI  • Reminder Display  • Photo View    │  │
│  │  • Local TTS/STT Cache  • Offline Queue          │  │
│  └───────────┬──────────────────────────┬────────────┘  │
└──────────────┼──────────────────────────┼───────────────┘
               │                          │
               │ HTTPS/WSS                │ HTTPS
               │                          │
┌──────────────▼──────────────────────────▼───────────────┐
│                   API GATEWAY (AWS/Azure)                │
│              Authentication • Rate Limiting              │
└──────────┬───────────────────────────┬──────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────────┐
│  CONVERSATION        │    │  FAMILY DASHBOARD        │
│  ORCHESTRATOR        │    │  SERVICE                 │
│                      │    │                          │
│  • GPT-5 Calls       │    │  • User Management       │
│  • Context Mgmt      │    │  • Photo Uploads         │
│  • Safety Filter     │    │  • Reminder CRUD         │
│  • Emotion Detection │    │  • Analytics             │
└──────────┬───────────┘    └───────────┬──────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│                   SHARED SERVICES LAYER                  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Memory     │  │  Scheduler   │  │ Notification │  │
│  │   Store      │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  STT/TTS     │  │  Media       │  │   Logging    │  │
│  │  Pipeline    │  │  Storage     │  │   & Metrics  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────┐    ┌──────────────────────────┐
│   DATABASE LAYER    │    │   EXTERNAL SERVICES      │
│                     │    │                          │
│  • User Profiles    │    │  • OpenAI API (GPT-5)    │
│  • Conversations    │    │  • Whisper (STT)         │
│  • Reminders        │    │  • ElevenLabs (TTS)      │
│  • Photos/Media     │    │  • Twilio (SMS Alerts)   │
│  • Analytics        │    │  • SendGrid (Email)      │
└─────────────────────┘    └──────────────────────────┘
```

---

## Component Details

### 1. Tablet Application (Frontend)

**Technology Options:**
- **Flutter** (preferred for cross-platform)
- **React Native** (if web dashboard needed)

**Core Responsibilities:**
- Voice capture and playback
- UI rendering and interaction
- Local caching (reminders, TTS audio)
- Offline queue management
- Background wake word detection (Loneliness Mode)

**Key Features:**
- **Offline-first:** Critical reminders work without internet
- **Low battery mode:** Reduces wake word listening
- **Adaptive quality:** Adjusts audio based on connection
- **Secure storage:** Encrypted local database

**Libraries:**
- Voice Activity Detection (VAD): Silero VAD
- Wake word: Porcupine (Picovoice)
- Audio codec: Opus for compression
- Networking: gRPC or WebSocket for low latency

---

### 2. API Gateway

**Technology:** AWS API Gateway or Azure API Management

**Responsibilities:**
- Authentication (JWT tokens)
- Rate limiting (prevent abuse)
- Request routing
- SSL/TLS termination
- CORS handling

---

### 3. Conversation Orchestrator Service

**Core Service:** The "brain" of the system

**Technology:** Node.js or Python (FastAPI)

**Responsibilities:**
1. **Receive voice from tablet** → Send to STT
2. **Load user context** from Memory Store
3. **Build prompt** with:
   - User profile
   - Recent conversation history
   - Current time/date
   - Active reminders
   - Safety guardrails
4. **Call GPT-5** for response generation
5. **Apply safety filters** (content moderation)
6. **Detect emotion/sentiment** in response
7. **Send text to TTS** → Return audio to tablet
8. **Log interaction** (with privacy controls)

**Performance Requirements:**
- **End-to-end latency:** < 2 seconds (voice in → audio out)
- **Concurrent users:** Support 10,000+ simultaneous conversations
- **Availability:** 99.9% uptime SLA

---

### 4. Memory Store Service

**Technology:** Azure Cosmos DB (NoSQL) + Redis (cache)

**Container Structure:**

**1. Users Container** (partitioned by `userId`)
```json
{
  "id": "user_12345",
  "userId": "user_12345",
  "name": "תפארת",
  "language": "he",
  "cognitiveMode": "dementia",
  "familyMembers": [...],
  "preferences": {...},
  "safetyRules": {...},
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**2. Conversations Container** (partitioned by `userId`, TTL: 90 days)
```json
{
  "id": "conv_xyz",
  "userId": "user_12345",
  "conversationId": "conv_xyz",
  "turns": [
    {
      "timestamp": "2024-11-09T10:30:00Z",
      "speaker": "user",
      "transcript": "...",
      "audioUrl": "...",
      "emotion": "neutral"
    },
    {
      "timestamp": "2024-11-09T10:30:02Z",
      "speaker": "ai",
      "response": "...",
      "promptUsed": "...",
      "tokensUsed": 150
    }
  ],
  "ttl": 7776000
}
```

**3. User Memories Container** (partitioned by `userId`)
```json
{
  "id": "memory_abc",
  "userId": "user_12345",
  "memoryType": "personal_fact",
  "key": "daughter_name",
  "value": "Sarah",
  "confidenceScore": 0.95,
  "lastAccessed": "2024-11-09T10:30:00Z"
}
```

**4. Reminders Container** (partitioned by `userId`)
```json
{
  "id": "reminder_def",
  "userId": "user_12345",
  "type": "medication",
  "schedule": "08:00",
  "status": "pending",
  "medicationName": "Blue pill",
  "dosage": "10mg",
  "notes": "Take with food"
}
```

**5. Safety Incidents Container** (partitioned by `userId`, TTL: 7 years)
```json
{
  "id": "incident_ghi",
  "userId": "user_12345",
  "timestamp": "2024-11-09T17:32:00Z",
  "incidentType": "unsafe_physical_movement",
  "severity": "critical",
  "userRequest": "I'm going outside to find צביה",
  "aiResponse": "Let's call מיכל first...",
  "safetyRuleTriggered": "leaving_home_alone",
  "familyNotified": true,
  "ttl": 220752000
}
```

**Caching Strategy:**
- Redis caches:
  - Active user profiles (15-minute TTL)
  - Recent conversation history (5 messages)
  - Today's reminders
- Cache invalidation on family dashboard updates
- Cosmos DB change feed for real-time dashboard updates

---

### 5. Scheduler Service

**Technology:** Cron-based (AWS EventBridge or Temporal)

**Responsibilities:**
- Trigger reminder notifications at scheduled times
- Send proactive check-ins (Dementia Mode)
- Daily summary generation for family dashboard
- Cleanup old logs and conversations (retention policy)

**Example Reminder Flow:**
```
1. Scheduler: "Medication reminder for user 12345 at 8:00 AM"
2. Notification Service: Send push to tablet
3. Tablet: Display reminder UI + play audio
4. If no response in 5 min → Alert family member
```

---

### 6. Notification Service

**Technology:** Firebase Cloud Messaging (FCM) or AWS SNS

**Channels:**
- Push notifications (tablet app)
- SMS (Twilio) for family alerts
- Email (SendGrid) for daily summaries

**Priority Levels:**
- **Critical:** Missed medication, safety alert
- **High:** Reminder acknowledgment needed
- **Normal:** Daily summary
- **Low:** Feature updates, tips

---

### 7. Azure OpenAI Realtime API (Audio-Native)

**Provider:** Azure OpenAI GPT-4o Realtime  
**Model:** `gpt-4o-realtime-preview-2024-10-01`

**Why Realtime API?**
- **3x faster** than traditional STT→GPT→TTS pipeline (400-600ms vs 1500ms)
- **Native audio reasoning** - maintains prosody, emotion, timing
- **Built-in transcription** - automatic Whisper-powered transcripts for logging
- **Lower cost** - single API call vs 3 separate services

**Flow:**
```
1. Tablet streams audio (PCM16, 16kHz) via WebSocket
2. Backend proxies to Azure Realtime API
3. Server-side VAD detects when user stops speaking
4. GPT-4o processes audio natively (not text)
5. AI generates audio response + transcript
6. Backend logs transcript to Cosmos DB
7. Audio streams back to tablet
```

**Transcript Extraction:**
- Enable `input_audio_transcription: {model: "whisper-1"}`
- Events: `conversation.item.input_audio_transcription.completed` (user)
- Events: `response.audio_transcript.done` (AI)
- Both automatically saved to Cosmos DB for legal compliance

**Voice Configuration:**
- **Dementia Mode:** "alloy" voice (warm, clear, female-sounding)
- **Loneliness Mode:** "shimmer" voice (conversational, expressive)
- **Multilingual:** Native Hebrew and English support

---

### 8. Media Storage

**Technology:** AWS S3 or Azure Blob Storage

**Content Types:**
- User photos (Family uploads)
- Audio recordings (optional, with consent)
- TTS audio cache
- System assets (icons, sounds)

**Security:**
- Encryption at rest (AES-256)
- Signed URLs with expiration (1-hour)
- No public access

---

### 9. Family Dashboard Service

**Technology:** Web app (React/Next.js) + Mobile app (Flutter)

**Features:**
- User management
- Reminder CRUD operations
- Photo uploads with tagging
- Daily activity summary
- Mood/engagement trends
- Alert configuration
- Privacy settings

**API Endpoints:**
```
GET  /users/:id/summary          # Daily activity
GET  /users/:id/reminders        # List reminders
POST /users/:id/reminders        # Create reminder
PUT  /reminders/:id               # Update reminder
DELETE /reminders/:id             # Delete reminder
POST /users/:id/photos            # Upload photo
GET  /users/:id/conversations     # View transcripts (if enabled)
GET  /users/:id/alerts            # Recent alerts
```

---

## Data Flow: Typical Conversation (Realtime API)

```
1. User taps "Talk to Me" on tablet
2. Tablet opens WebSocket, streams audio to backend
3. Backend proxies audio to Azure Realtime API (persistent connection)
4. Server-side VAD detects user stopped speaking
5. Realtime API:
   a. Generates transcript (Whisper)
   b. Loads context from session prompt (cached)
   c. GPT-4o audio-native reasoning
   d. Generates audio response
   e. Emits events: user transcript, AI transcript, audio chunks
6. Backend receives events:
   a. Saves user transcript to Cosmos DB
   b. Checks safety rules on transcript
   c. Forwards audio chunks to tablet
   d. Saves AI transcript to Cosmos DB
   e. Triggers family alert if unsafe (via function calling)
   f. Extracts important memories (via function calling)
7. Tablet plays audio in real-time
8. Listening continues (persistent connection)
9. Repeat from step 2
```

**Latency Budget (Realtime API):**
- Server-side VAD: 50ms
- Audio → GPT-4o audio reasoning: 400ms
- Audio generation: 100ms
- Network (WebSocket): 50ms
- **Total:** ~600ms (3x faster than traditional pipeline)

**Transcript Logging:**
- User speech: Automatically transcribed via Whisper (enabled in session config)
- AI response: Automatically transcribed (included in response events)
- Both saved to Cosmos DB immediately for legal defense

---

## Offline Capabilities

**What Works Offline:**
- ✅ Scheduled reminders (cached locally)
- ✅ Photo viewing
- ✅ Basic UI navigation
- ✅ Pre-cached TTS audio (common phrases)

**What Requires Internet:**
- ❌ Real-time conversation (GPT calls)
- ❌ New reminders from family dashboard
- ❌ Photo uploads
- ❌ Dynamic TTS

**Sync Strategy:**
- Queue failed requests
- Retry with exponential backoff
- Notify user if offline > 24 hours
- Alert family if critical reminder missed

---

## Security Architecture

### Authentication
- **User devices:** OAuth 2.0 + device fingerprinting
- **Family members:** Username/password + 2FA
- **API calls:** JWT tokens with 1-hour expiration

### Data Encryption
- **In transit:** TLS 1.3
- **At rest:** AES-256
- **Database:** Column-level encryption for sensitive fields

### Privacy Controls
- **Conversation logging:** Opt-in (default off)
- **Voice recordings:** Never stored (only transcripts)
- **Family access:** Granular permissions
- **Data retention:** 90-day automatic deletion of conversations

### Compliance
- GDPR-compliant (EU users)
- HIPAA-ready (not a medical device, but protects health data)
- COPPA-compliant (no users under 13)

---

## Scalability Strategy

### Horizontal Scaling
- All services containerized (Docker + Kubernetes)
- Auto-scaling based on CPU/memory
- Load balancing across regions

### Database Scaling
- Cosmos DB global distribution (multi-region)
- Automatic partitioning by userId
- Consistent indexing policies for low latency
- Redis cluster for short-term cache

### CDN for Assets
- CloudFront or Azure CDN
- Edge locations for low latency
- Cached photos and TTS audio

---

## Monitoring & Observability

**Metrics:**
- Conversation latency (p50, p95, p99)
- STT/TTS success rates
- GPT API errors and retries
- Reminder delivery success
- Active users (DAU/MAU)
- Family dashboard engagement

**Logging:**
- Structured logs (JSON)
- ELK stack or Datadog
- PII redaction in logs

**Alerting:**
- Latency > 3 seconds
- Error rate > 1%
- API gateway 5xx errors
- Database connection failures

---

## Cost Estimation (MVP)

**Per User/Month (Realtime API):**
- Realtime API: $67.50 (3 conversations/day × 5 min avg)
- Cloud hosting: $1
- Storage: $0.50
- Cosmos DB: $0.60
- **Total:** ~$69.60/user/month

**At Scale (100 users):**
- Total: $6,960/month (~$83.5K/year)
- Target pricing: $29.99/month → $2,999 revenue
- **Need ~350 users to break even on AI costs**

**At Scale (1,000 users):**
- Total: $69,600/month (~$835K/year)
- Revenue at $29.99: $29,990/month
- **Need volume pricing negotiation with Azure**

**Cost Optimization Strategies:**
- Azure Reserved Instances (20-40% discount)
- Prompt caching (reduce input tokens by 60%)
- Shorter conversations (encourage focused interactions)
- Tiered pricing (basic vs premium features)

---

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Flutter (iOS/Android/iPad) |
| **API Gateway** | Azure API Management |
| **Backend** | Node.js (NestJS) or Python (FastAPI) |
| **Database** | Azure Cosmos DB + Redis |
| **AI/Voice** | Azure OpenAI Realtime API (GPT-4o audio-native) |
| **Transcription** | Built-in Whisper (via Realtime API) |
| **Storage** | Azure Blob Storage |
| **Hosting** | Azure Kubernetes Service (AKS) |
| **Monitoring** | Azure Monitor + Application Insights |
| **Notifications** | Firebase Cloud Messaging + Twilio |

---

*This architecture will be refined during MVP development based on performance testing and user feedback.*
