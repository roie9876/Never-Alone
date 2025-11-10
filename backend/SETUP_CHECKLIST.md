# ✅ Setup Checklist

Use this checklist to track your setup progress.

## Azure Resources (Manual Setup)

### Azure OpenAI
- [ ] Created Azure OpenAI resource
- [ ] Deployed `gpt-4o-realtime-preview` model
- [ ] Noted endpoint URL
- [ ] Noted API key

### Azure Cosmos DB (NoSQL API)
- [ ] Created Cosmos DB account (NoSQL API - NOT MongoDB)
- [ ] Created database: `never-alone`
- [ ] Created container: `users` (partition key: `/userId`)
- [ ] Created container: `conversations` (partition key: `/userId`, TTL: 7776000)
- [ ] Created container: `memories` (partition key: `/userId`)
- [ ] Created container: `reminders` (partition key: `/userId`)
- [ ] Created container: `photos` (partition key: `/userId`)
- [ ] Created container: `safety-config` (partition key: `/userId`)
- [ ] Noted endpoint URL
- [ ] Noted primary key

### Azure Redis Cache
- [ ] Created Redis Cache (Standard C1 tier)
- [ ] Noted hostname
- [ ] Noted port (6380)
- [ ] Noted access key

### Azure Blob Storage
- [ ] Created Storage Account
- [ ] Created container: `audio-files` (public blob access)
- [ ] Created container: `photos` (public blob access)
- [ ] Noted connection string

### Azure Speech Services
- [ ] Created Speech Service
- [ ] Noted API key
- [ ] Noted region (eastus2)

### Optional: YouTube API
- [ ] Created Google Cloud Project (for YouTube Music integration)
- [ ] Enabled YouTube Data API v3
- [ ] Created API key

---

## Local Setup

### Environment Configuration
- [ ] Ran `cd backend`
- [ ] Ran `npm install`
- [ ] Copied `.env.example` to `.env`
- [ ] Filled in `AZURE_OPENAI_ENDPOINT`
- [ ] Filled in `AZURE_OPENAI_KEY`
- [ ] Filled in `COSMOS_ENDPOINT`
- [ ] Filled in `COSMOS_KEY`
- [ ] Filled in `REDIS_HOST`
- [ ] Filled in `REDIS_PASSWORD`
- [ ] Filled in `BLOB_STORAGE_CONNECTION_STRING`
- [ ] Filled in `SPEECH_KEY`
- [ ] Filled in `YOUTUBE_API_KEY` (optional)

### Testing
- [ ] Ran `npm run start:dev`
- [ ] Tested health endpoint: `curl http://localhost:3000/health`
- [ ] Health endpoint returns "ok" status
- [ ] All services show "connected"

### Audio Generation
- [ ] Ran `npm run generate:audio`
- [ ] 5 MP3 files created successfully
- [ ] Files uploaded to Azure Blob Storage
- [ ] Can access audio files via URL

### Memory Service Testing
- [ ] Tested saving short-term memory
- [ ] Tested saving long-term memory
- [ ] Tested loading memories
- [ ] All memory operations work correctly

---

## Next Steps

Once all items above are checked:
- [ ] Read `/docs/technical/IMPLEMENTATION_TASKS.md`
- [ ] Start Week 2: Task 2.1 - Realtime API Gateway Service
- [ ] Celebrate! 🎉 Foundation is complete!

---

**Current Status:** 
- Date: _____________
- Blocked on: _____________
- Notes: _____________
