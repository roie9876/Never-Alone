# 🚀 Backend Setup Guide

This guide will help you set up the Never Alone backend from scratch.

## Prerequisites

- Node.js 18+ installed
- Azure CLI installed (`az`)
- Access to Azure subscription
- macOS, Linux, or Windows with WSL

---

## Step 1: Azure Resources Setup

You mentioned you'll deploy Azure resources manually. Here's what you need to create:

### 1.1 Azure OpenAI Service
```bash
# Create resource
az cognitiveservices account create \
  --name never-alone-openai \
  --resource-group never-alone-mvp-rg \
  --kind OpenAI \
  --sku S0 \
  --location eastus2

# Deploy the model
az cognitiveservices account deployment create \
  --name never-alone-openai \
  --resource-group never-alone-mvp-rg \
  --deployment-name gpt-4o-realtime-preview \
  --model-name gpt-4o-realtime-preview \
  --model-version "2024-10-01" \
  --model-format OpenAI \
  --sku-capacity 1 \
  --sku-name "Standard"
```

**Note the following:**
- Endpoint: `https://never-alone-openai.openai.azure.com`
- API Key: Get from Azure Portal → Keys and Endpoint

### 1.2 Azure Cosmos DB (NoSQL API)
```bash
# Create Cosmos DB account
az cosmosdb create \
  --name never-alone-cosmos \
  --resource-group never-alone-mvp-rg \
  --kind GlobalDocumentDB \
  --locations regionName=eastus2 failoverPriority=0 \
  --default-consistency-level Session

# Create database
az cosmosdb sql database create \
  --account-name never-alone-cosmos \
  --resource-group never-alone-mvp-rg \
  --name never-alone
```

**Create these containers** (in Azure Portal or CLI):
1. `users` - Partition key: `/userId`
2. `conversations` - Partition key: `/userId`, TTL: 7776000 (90 days)
3. `memories` - Partition key: `/userId`
4. `reminders` - Partition key: `/userId`
5. `photos` - Partition key: `/userId`
6. `safety-config` - Partition key: `/userId`

**Note the following:**
- Endpoint: `https://never-alone-cosmos.documents.azure.com:443/`
- Primary Key: Get from Azure Portal → Keys

### 1.3 Azure Cache for Redis
```bash
az redis create \
  --name never-alone-redis \
  --resource-group never-alone-mvp-rg \
  --location eastus2 \
  --sku Standard \
  --vm-size C1
```

**Note the following:**
- Host: `never-alone-redis.redis.cache.windows.net`
- Port: `6380`
- Access Key: Get from Azure Portal → Access Keys

### 1.4 Azure Blob Storage
```bash
# Create storage account
az storage account create \
  --name neveralonestorage \
  --resource-group never-alone-mvp-rg \
  --location eastus2 \
  --sku Standard_LRS

# Create containers
az storage container create \
  --account-name neveralonestorage \
  --name audio-files \
  --public-access blob

az storage container create \
  --account-name neveralonestorage \
  --name photos \
  --public-access blob
```

**Note the following:**
- Connection String: Get from Azure Portal → Access Keys

### 1.5 Azure Speech Services
```bash
az cognitiveservices account create \
  --name never-alone-speech \
  --resource-group never-alone-mvp-rg \
  --kind SpeechServices \
  --sku S0 \
  --location eastus2
```

**Note the following:**
- Key: Get from Azure Portal → Keys and Endpoint
- Region: `eastus2`

---

## Step 2: Local Setup

### 2.1 Install Dependencies
```bash
cd backend
npm install
```

### 2.2 Create .env File
```bash
cp .env.example .env
```

Now edit `.env` and fill in your Azure credentials:
```bash
nano .env  # or use your preferred editor
```

**Fill in these values from your Azure resources:**
- `AZURE_OPENAI_ENDPOINT` - From OpenAI service
- `AZURE_OPENAI_KEY` - From OpenAI service
- `COSMOS_ENDPOINT` - From Cosmos DB
- `COSMOS_KEY` - From Cosmos DB
- `REDIS_HOST` - From Redis Cache
- `REDIS_PASSWORD` - From Redis Cache
- `BLOB_STORAGE_CONNECTION_STRING` - From Storage Account
- `SPEECH_KEY` - From Speech Service

### 2.3 Verify Connections
```bash
# Test if all services are reachable
npm run test:connections
```

---

## Step 3: Generate Audio Files

Generate the 5 Hebrew audio files for reminders:
```bash
npm run generate:audio
```

This will create:
- `medication-reminder-hebrew.mp3`
- `check-in-hebrew.mp3`
- `reminder-snoozed-10min-hebrew.mp3`
- `check-in-declined-hebrew.mp3`
- `appointment-30min-hebrew.mp3`

Files will be uploaded to Azure Blob Storage automatically.

---

## Step 4: Start Development Server

```bash
npm run start:dev
```

Server will start at `http://localhost:3000`

### Test the Health Endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-10T...",
  "services": {
    "cosmosDB": "connected",
    "redis": "connected",
    "blobStorage": "connected"
  }
}
```

---

## Step 5: Test Memory Service

### Test Short-Term Memory
```bash
curl -X POST http://localhost:3000/memory/save-short-term \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "turns": [
      {"role": "user", "content": "Hello", "timestamp": "2025-11-10T10:00:00Z"},
      {"role": "assistant", "content": "Hi there!", "timestamp": "2025-11-10T10:00:05Z"}
    ]
  }'
```

### Test Long-Term Memory
```bash
curl -X POST http://localhost:3000/memory/save-long-term \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "content": "User'\''s daughter Sarah lives in Tel Aviv",
    "category": "family",
    "tags": ["Sarah", "Tel Aviv", "family"]
  }'
```

### Load All Memories
```bash
curl http://localhost:3000/memory/load/test-user-123
```

---

## Common Issues

### Issue: Cannot connect to Cosmos DB
**Solution:** Check firewall settings in Azure Portal. Add your IP address to allowed IPs.

### Issue: Cannot connect to Redis
**Solution:** Ensure you're using port `6380` (SSL) and `rediss://` protocol.

### Issue: Speech Service fails
**Solution:** Verify your Speech Service region matches `SPEECH_REGION` in `.env`.

### Issue: TypeScript errors
**Solution:** Run `npm install` again to ensure all types are installed.

---

## Next Steps

1. ✅ Complete Azure resource setup
2. ✅ Create `.env` file with credentials
3. ✅ Run `npm install`
4. ✅ Test health endpoint
5. ✅ Generate audio files
6. ⏭️ Proceed to Week 2: Realtime API Integration

---

## Useful Commands

```bash
# Start development server
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests (when implemented)
npm run test

# Generate audio files
npm run generate:audio

# Check TypeScript types
npm run build

# Format code
npm run format

# Lint code
npm run lint
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # Azure configuration
│   ├── controllers/     # API endpoints
│   ├── services/        # Business logic (Memory, Realtime, Reminder)
│   ├── interfaces/      # TypeScript interfaces
│   ├── app.module.ts    # Main NestJS module
│   └── main.ts          # Application entry point
├── scripts/
│   └── generate-audio.ts # Audio generation script
├── .env                 # Your credentials (DO NOT COMMIT)
├── .env.example         # Template file
└── package.json
```

---

**Need help?** Check the main documentation in `/docs/technical/GETTING_STARTED.md`
