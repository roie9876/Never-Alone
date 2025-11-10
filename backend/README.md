# Never Alone - Backend API

NestJS backend service for the Never Alone AI companion application.

## 🏗️ Architecture

This backend implements:
- **3-tier memory system** (Redis + Cosmos DB)
- **Azure OpenAI Realtime API integration** (coming in Week 2)
- **Reminder scheduling** (coming in Week 3)
- **Pre-recorded audio generation** (Task 1.5)

## 📋 Prerequisites

- Node.js 18+ and npm
- Azure account with:
  - Azure OpenAI resource (gpt-4o-realtime-preview deployed)
  - Azure Cosmos DB account (NoSQL API)
  - Azure Cache for Redis (Standard tier)
  - Azure Blob Storage account
  - Azure Speech Services (for TTS)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Azure credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview

# Azure Cosmos DB
COSMOS_ENDPOINT=https://<your-cosmos>.documents.azure.com:443/
COSMOS_KEY=<your-cosmos-key>
COSMOS_DATABASE=never-alone

# Azure Redis Cache
REDIS_HOST=<your-redis>.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<your-redis-key>
REDIS_TLS=true

# Azure Blob Storage
BLOB_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
BLOB_CONTAINER_AUDIO=audio-files
BLOB_CONTAINER_PHOTOS=photos

# Azure Speech Services
SPEECH_KEY=<your-speech-key>
SPEECH_REGION=eastus2
```

### 3. Create Cosmos DB Containers

Run this Azure CLI command to create required containers:

```bash
# Set variables
RESOURCE_GROUP="never-alone-mvp-rg"
COSMOS_ACCOUNT="<your-cosmos-account>"
DATABASE="never-alone"

# Create containers
az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name users --partition-key-path /userId

az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name conversations --partition-key-path /userId --ttl 7776000

az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name memories --partition-key-path /userId

az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name reminders --partition-key-path /userId

az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name photos --partition-key-path /userId

az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name safety-config --partition-key-path /userId

az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name user-music-preferences --partition-key-path /userId

az cosmosdb sql container create --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP --database-name $DATABASE \
  --name music-playback-history --partition-key-path /userId --ttl 7776000
```

### 4. Generate Pre-Recorded Audio Files

```bash
npm run generate-audio
```

This will:
- Generate 5 Hebrew MP3 files using Azure TTS
- Upload them to Azure Blob Storage
- Display URLs for each file

### 5. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## 🧪 Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-10T...",
  "services": {
    "cosmosDb": true,
    "redis": true,
    "blobStorage": true
  },
  "version": "0.1.0"
}
```

### Memory Operations

**Load memory for a user:**
```bash
curl http://localhost:3000/memory/load/test-user-123
```

**Add a conversation turn:**
```bash
curl -X POST http://localhost:3000/memory/turn \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "turn": {
      "role": "user",
      "timestamp": "2025-11-10T10:00:00Z",
      "transcript": "Hello, how are you today?"
    }
  }'
```

**Extract a long-term memory:**
```bash
curl -X POST http://localhost:3000/memory/extract \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "memory": {
      "memory_type": "family_info",
      "key": "daughter_name",
      "value": "My daughter Sarah lives in Tel Aviv",
      "importance": "high"
    }
  }'
```

**Search memories:**
```bash
curl "http://localhost:3000/memory/search/test-user-123?keywords=sarah,family&limit=5"
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── azure.config.ts       # Azure service connections
│   ├── controllers/
│   │   ├── health.controller.ts  # Health check endpoint
│   │   └── memory.controller.ts  # Memory API endpoints
│   ├── services/
│   │   └── memory.service.ts     # 3-tier memory implementation
│   ├── interfaces/
│   │   ├── memory.interface.ts   # Memory type definitions
│   │   ├── reminder.interface.ts # Reminder types
│   │   └── user.interface.ts     # User & safety types
│   ├── app.module.ts             # Main NestJS module
│   └── main.ts                   # Application entry point
├── scripts/
│   └── generate-audio.ts         # TTS audio generation script
├── package.json
├── tsconfig.json
└── .env.example
```

## 🎯 Implementation Status

### ✅ Week 1 Complete
- [x] NestJS project setup
- [x] Azure configuration service
- [x] Memory service (3-tier system)
- [x] Memory controller (REST API)
- [x] Audio generation script
- [x] Health check endpoint

### 🔜 Week 2 (Next Steps)
- [ ] Realtime API integration
- [ ] Memory extraction via function calling
- [ ] Working memory updates
- [ ] Transcript logging to Cosmos DB

### 🔜 Week 3
- [ ] Reminder scheduler service
- [ ] Photo context triggering
- [ ] Snooze/decline logic

## 📚 Documentation

Full technical documentation is available in `/docs/technical/`:

- [Getting Started](../docs/technical/GETTING_STARTED.md)
- [Implementation Tasks](../docs/technical/IMPLEMENTATION_TASKS.md)
- [Memory Architecture](../docs/technical/memory-architecture.md)
- [Reminder System](../docs/technical/reminder-system.md)
- [MVP Simplifications](../docs/technical/mvp-simplifications.md)

## 🐛 Troubleshooting

**Redis connection fails:**
- Verify REDIS_TLS=true for Azure Cache
- Check firewall rules allow your IP
- Confirm password is correct

**Cosmos DB authentication error:**
- Ensure COSMOS_KEY is the primary/secondary key (not connection string)
- Verify endpoint URL format

**Audio generation fails:**
- Check SPEECH_KEY and SPEECH_REGION
- Verify Speech Services resource is enabled
- Confirm he-IL-AvriNeural voice is available in your region

## 📝 Scripts

```bash
npm run start         # Start production server
npm run start:dev     # Start development server with hot reload
npm run build         # Build for production
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run test          # Run unit tests
npm run generate-audio # Generate Hebrew audio files
```

## 🔒 Security Notes

- Never commit `.env` file to git
- Use Azure Key Vault in production
- Rotate keys regularly
- Enable Cosmos DB firewall rules
- Use managed identities in production

## 📊 Monitoring

Health check endpoint provides real-time status of all Azure services.

For production monitoring:
- Enable Application Insights
- Set up Azure Monitor alerts
- Track token usage (OpenAI)
- Monitor Redis cache hit rate
- Track Cosmos DB RU consumption

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## 📄 License

Private project - All rights reserved.
