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

**Technology:** PostgreSQL (relational) + Redis (cache)

**Schema Highlights:**
```sql
users (
  id, name, language, cognitive_mode, 
  family_members, preferences, created_at
)

conversations (
  id, user_id, timestamp, transcript, 
  ai_response, emotion_detected, duration
)

user_memory (
  id, user_id, memory_type, key, value, 
  confidence_score, last_accessed
)

reminders (
  id, user_id, type, schedule, status,
  medication_name, dosage, notes
)

photos (
  id, user_id, url, caption, 
  people_tagged, upload_date, context
)
```

**Caching Strategy:**
- Redis caches:
  - Active user profiles (15-minute TTL)
  - Recent conversation history (5 messages)
  - Today's reminders
- Cache invalidation on family dashboard updates

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

### 7. STT/TTS Pipeline

#### Speech-to-Text (STT)
**Provider:** OpenAI Whisper or Azure Speech

**Flow:**
```
1. Tablet captures audio (Opus codec, 16kHz)
2. Upload to STT service
3. Return transcript with confidence score
4. If confidence < 70% → Ask user to repeat
```

**Optimizations:**
- Language-specific models (Hebrew, English)
- Noise cancellation preprocessing
- Streaming STT for lower latency

#### Text-to-Speech (TTS)
**Provider:** ElevenLabs (most natural) or Azure Neural TTS

**Voice Characteristics:**
- **Dementia Mode:** Warm, slow, clear (female voice preferred)
- **Loneliness Mode:** Conversational, expressive (customizable)
- **Multilingual:** Hebrew and English voices

**Caching:**
- Cache common phrases (greetings, reminders) locally
- Dynamic responses generated on-demand
- Pre-generate reminder audio nightly

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

## Data Flow: Typical Conversation

```
1. User taps "Talk to Me" on tablet
2. Tablet starts recording audio
3. Audio streamed to STT service
4. Transcript sent to Conversation Orchestrator
5. Orchestrator loads user context from Memory Store
6. Orchestrator builds prompt with context + guardrails
7. GPT-5 generates response text
8. Safety filter checks response
9. Text sent to TTS service
10. TTS returns audio file
11. Audio streamed to tablet
12. Tablet plays audio
13. Orchestrator logs interaction to database
14. Listening window opens for user response
15. Repeat from step 2
```

**Latency Budget:**
- STT: 500ms
- Context retrieval: 100ms
- GPT-5 call: 800ms
- Safety filter: 50ms
- TTS: 400ms
- Network overhead: 150ms
- **Total:** ~2 seconds

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
- Read replicas for queries
- Write primary with failover
- Partitioning by user_id
- Redis cluster for cache

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

**Per User/Month:**
- GPT-5 API calls: $5-10 (20 conversations/day)
- TTS/STT: $2-3
- Cloud hosting: $1
- Storage: $0.50
- **Total:** ~$8.50-14.50/user/month

**At Scale (10,000 users):**
- Total: $85,000-145,000/month
- Target pricing: $19.99/month → $199,900 revenue
- **Gross margin:** ~40-60%

---

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| **Frontend** | Flutter (iOS/Android/iPad) |
| **API Gateway** | AWS API Gateway |
| **Backend** | Node.js (NestJS) or Python (FastAPI) |
| **Database** | PostgreSQL + Redis |
| **AI/LLM** | OpenAI GPT-5 |
| **STT** | OpenAI Whisper |
| **TTS** | ElevenLabs or Azure Neural TTS |
| **Storage** | AWS S3 |
| **Hosting** | AWS ECS or Kubernetes |
| **Monitoring** | Datadog or CloudWatch |
| **Notifications** | Firebase Cloud Messaging + Twilio |

---

*This architecture will be refined during MVP development based on performance testing and user feedback.*
