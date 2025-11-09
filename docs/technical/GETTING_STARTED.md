# 🚀 Getting Started - Developer Onboarding

**Welcome to Never Alone!** This guide will get you from zero to productive in 30 minutes.

---

## 📖 Step 1: Read These Docs First (15 minutes)

Read in **this exact order**:

### 1️⃣ **Start: [MVP Simplifications](./mvp-simplifications.md)** (5 min)
**Why:** Understand what we're building for MVP vs. what's deferred  
**Key takeaway:** Simple approach - 50-turn memory window, keyword search, pre-recorded audio

### 2️⃣ **[Memory Architecture](./memory-architecture.md)** (5 min)
**Why:** Core system - how conversations persist across days  
**Key takeaway:** 3-tier memory (Redis + Cosmos DB), keyword search, function calling

### 3️⃣ **[Reminder System](./reminder-system.md)** (5 min)
**Why:** Second core feature - medication reminders, daily check-ins  
**Key takeaway:** Pre-recorded audio (5 MP3 files) + context-aware photo triggers

---

## 🎯 Step 2: Your First 3 Tasks (Order Matters!)

### Task 1: Set Up Azure Infrastructure (Day 1) ⚡
**Why first:** Blocks everything else  
**Time:** 2-3 hours  
**What to create:**
- Azure OpenAI resource (East US 2 region)
  - Deploy `gpt-4o-realtime-preview` model
- Cosmos DB account (NoSQL API)
  - Create 6 containers (see [cosmos-db-design.md](./cosmos-db-design.md))
- Redis Cache (Standard tier, 1GB)
- Blob Storage (for audio files)

**Acceptance criteria:**
- ✅ Can connect to Azure OpenAI from local machine
- ✅ Can read/write to Cosmos DB
- ✅ Can set/get from Redis
- ✅ Can upload file to Blob Storage

**Reference docs:**
- [Architecture Overview](./architecture.md) - Tech stack section
- [Cosmos DB Design](./cosmos-db-design.md) - Container schemas
- [MVP Simplifications](./mvp-simplifications.md) - Deployment section

**Commands to test:**
```bash
# Test Azure OpenAI connection
curl https://<your-resource>.openai.azure.com/openai/deployments?api-version=2024-08-01-preview \
  -H "api-key: <your-key>"

# Test Cosmos DB (install Azure CLI first)
az cosmosdb sql database list --account-name <account> --resource-group <rg>
```

---

### Task 2: Implement Memory Service (Day 2-3) 🧠
**Why second:** Foundation for all conversations  
**Time:** 1-2 days  
**What to build:**
- NestJS service: `MemoryService`
- Methods:
  1. `loadMemory(userId: string)` - Load all 3 tiers
  2. `saveShortTermMemory(userId, turns)` - Redis with 50-turn sliding window
  3. `extractAndSaveLongTermMemory(userId, fact)` - Cosmos DB
  4. `searchMemories(userId, keywords)` - Simple keyword search

**Acceptance criteria:**
- ✅ Can load memories in <150ms
- ✅ 50-turn sliding window works (old turns dropped)
- ✅ Keyword search finds "daughter Sarah" or "hates mushrooms"
- ✅ Multi-day continuity: Day 1 fact remembered on Day 2

**Reference docs:**
- [Memory Architecture](./memory-architecture.md) - Implementation section (has code examples!)

**Starter code:**
```typescript
// src/services/memory.service.ts
import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';
import { CosmosClient } from '@azure/cosmos';

@Injectable()
export class MemoryService {
  private redis = createClient({ url: process.env.REDIS_URL });
  private cosmos = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);

  async loadMemory(userId: string) {
    // See memory-architecture.md "Implementation" section for full code
    const shortTerm = await this.loadShortTermMemory(userId);
    const working = await this.loadWorkingMemory(userId);
    const longTerm = await this.searchMemories(userId, []); // Load all
    
    return { shortTerm, working, longTerm };
  }

  // TODO: Implement other methods (see memory-architecture.md)
}
```

---

### Task 3: Create Pre-Recorded Audio Library (Day 3) 🔊
**Why third:** Unblocks reminder testing  
**Time:** 2-4 hours  
**What to build:**
- Generate 5 Hebrew MP3 files using Azure Text-to-Speech
- Upload to Blob Storage
- Create service to retrieve audio URLs

**Files needed:**
1. `medication-reminder-hebrew.mp3` - "זה הזמן לתרופות שלך" (It's time for your medication)
2. `check-in-hebrew.mp3` - "שלום! רציתי לבדוק איך אתה מרגיש היום" (Hi! I wanted to check how you're feeling today)
3. `reminder-snoozed-10min-hebrew.mp3` - "אזכיר לך שוב בעוד 10 דקות" (I'll remind you again in 10 minutes)
4. `check-in-declined-hebrew.mp3` - "בסדר, נדבר מאוחר יותר" (Okay, we'll talk later)
5. `appointment-30min-hebrew.mp3` - "תזכורת: יש לך פגישה בעוד 30 דקות" (Reminder: You have an appointment in 30 minutes)

**Acceptance criteria:**
- ✅ All 5 MP3 files exist in Blob Storage
- ✅ Can retrieve signed URLs for playback
- ✅ Audio plays correctly in browser
- ✅ Voice is warm and conversational (he-IL-AvriNeural)

**Reference docs:**
- [Reminder System](./reminder-system.md) - Pre-Recorded Audio Library section

**Code to generate audio:**
```typescript
// scripts/generate-audio.ts
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.SPEECH_KEY,
  process.env.SPEECH_REGION
);

speechConfig.speechSynthesisVoiceName = 'he-IL-AvriNeural';
speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

const scripts = [
  { file: 'medication-reminder-hebrew.mp3', text: 'זה הזמן לתרופות שלך' },
  // Add other 4 files...
];

for (const script of scripts) {
  synthesizer.speakTextAsync(script.text, result => {
    // Upload result.audioData to Blob Storage
  });
}
```

---

## 📋 Step 3: What Comes Next? (Week 2+)

After completing Tasks 1-3, you'll have:
- ✅ Azure infrastructure ready
- ✅ Memory system working (3 tiers)
- ✅ Audio files ready for reminders

**Next priorities:**
4. **Realtime API Gateway** - WebSocket session management ([realtime-api-integration.md](./realtime-api-integration.md))
5. **Reminder Scheduler** - Time-based triggers ([reminder-system.md](./reminder-system.md))
6. **Onboarding Form** - Safety configuration ([onboarding-flow.md](../planning/onboarding-flow.md))
7. **Photo Context Triggers** - Show photos during conversation ([reminder-system.md](./reminder-system.md))

See [IMPLEMENTATION_TASKS.md](./IMPLEMENTATION_TASKS.md) for full task breakdown.

---

## 🛠️ Development Setup

### Prerequisites:
- Node.js 18+ (backend)
- Flutter 3.10+ (frontend - Mac desktop first)
- Azure CLI (`az`)
- Redis CLI (`redis-cli`)
- Git

### Clone & Install:
```bash
# Clone repo
git clone https://github.com/roie9876/Never-Alone.git
cd Never-Alone

# Install backend dependencies (NestJS)
cd backend
npm install

# Install frontend dependencies (Flutter)
cd ../frontend
flutter pub get

# Set up environment variables
cp .env.example .env
# Edit .env with your Azure credentials
```

### Environment Variables:
```bash
# .env file
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview

COSMOS_CONNECTION_STRING=<your-cosmos-connection-string>
COSMOS_DATABASE=never-alone

REDIS_URL=redis://<your-redis>.redis.cache.windows.net:6380?password=<key>

BLOB_STORAGE_CONNECTION_STRING=<your-blob-connection-string>
BLOB_CONTAINER=audio-files
```

---

## 🧪 Testing Your Setup

### Test Memory Service:
```bash
# Start backend
cd backend
npm run start:dev

# In another terminal, test memory endpoint
curl -X POST http://localhost:3000/memory/load \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'

# Should return: { shortTerm: [], working: {}, longTerm: [] }
```

### Test Audio Playback:
```bash
# Get audio URL
curl http://localhost:3000/audio/medication-reminder-hebrew

# Should return: { url: "https://<blob-storage>/medication-reminder-hebrew.mp3?signature=..." }
```

---

## 📚 Full Documentation

**All docs organized by role:**
- **For Engineers:** See [INDEX.md](../INDEX.md#for-engineers)
- **For Product:** See [INDEX.md](../INDEX.md#for-product-managers)
- **For Designers:** See [INDEX.md](../INDEX.md#for-designers)

---

## 🆘 Getting Help

**Stuck? Check these first:**
1. [Challenges & Solutions](./challenges-solutions.md) - Common issues and fixes
2. [Architecture Overview](./architecture.md) - Big picture understanding
3. [MVP Simplifications](./mvp-simplifications.md) - "Are we building this for MVP?"

**Still stuck?**
- Create GitHub issue with `[question]` tag
- Slack channel: `#never-alone-dev`
- Email tech lead: [email]

---

## ✅ Success Checklist

After 3 days, you should have:
- ✅ Azure infrastructure set up and tested
- ✅ Memory service loading/saving conversations
- ✅ 5 Hebrew audio files in Blob Storage
- ✅ Local development environment running
- ✅ First API endpoint working (memory/load)

**You're ready to move to Week 2 tasks!** 🎉

---

*Last updated: November 9, 2025*
