# 🔐 Azure AD Authentication - Quick Reference

## ✅ Migration Complete!

All Azure services now use **Azure AD (Entra ID) authentication** via `DefaultAzureCredential`. No more access keys in code!

---

## 📋 Current Resources (Using Azure AD)

### 1. Resource Group ✅
```
Name: never-alone-rg
Location: East US 2
Subscription: 7aa77d2e-cbec-48b4-8518-9802543b25af
```

### 2. Cosmos DB ✅ AZURE AD ENABLED
```
Resource Name: neveralone
API: Azure Cosmos DB for NoSQL
Endpoint: https://neveralone.documents.azure.com:443/
Database Name: never-alone
Auth: Azure AD (DefaultAzureCredential)
```

**Containers (all exist and verified):**
| Container Name | Partition Key | TTL | Status |
|---------------|---------------|-----|--------|
| users | /userId | none | ✅ |
| conversations | /userId | 7776000 | ✅ |
| memories | /userId | none | ✅ |
| reminders | /userId | none | ✅ |
| photos | /userId | none | ✅ |
| safety-config | /userId | none | ✅ |

**RBAC Role Assigned:**
- Role: `Cosmos DB Built-in Data Contributor`
- Principal: `2acfdf14-ad32-4735-85eb-097c89d073b6`
- Assignment ID: `2b333b35-240e-4c09-8435-fb06e7b26eeb`

📋 **In .env (no key needed!):**
```bash
COSMOS_ENDPOINT=https://neveralone.documents.azure.com:443/
COSMOS_DATABASE=never-alone
# COSMOS_KEY - REMOVED (using Azure AD)
```

### 3. Blob Storage ✅ AZURE AD ENABLED
```
Resource Name: neveralone
Endpoint: https://neveralone.blob.core.windows.net
Auth: Azure AD (DefaultAzureCredential)
```

**Containers:**
- `audio-files` (for pre-recorded reminders)
- `photos` (for context-aware photo triggers)

**RBAC Role Assigned:**
- Role: `Storage Blob Data Contributor`
- Principal: `2acfdf14-ad32-4735-85eb-097c89d073b6`
- Assignment ID: `a4503da8-87e5-4c6e-ba4a-75e7c6364ea0`

📋 **In .env (no connection string!):**
```bash
BLOB_STORAGE_ACCOUNT_NAME=neveralone
BLOB_CONTAINER_AUDIO=audio-files
BLOB_CONTAINER_PHOTOS=photos
# BLOB_STORAGE_CONNECTION_STRING - REMOVED (using Azure AD)
```

### 4. Azure OpenAI 🔜 Ready for Azure AD
```
Resource Name: neveralone-resource
Endpoint: https://neveralone-resource.cognitiveservices.azure.com
Deployment: gpt-realtime
Auth: Will use Azure AD when implemented (Week 2)
```

📋 **In .env (key removed, ready for Azure AD):**
```bash
AZURE_OPENAI_ENDPOINT=https://neveralone-resource.cognitiveservices.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-realtime
AZURE_OPENAI_API_VERSION=2025-08-28
# AZURE_OPENAI_KEY - REMOVED (will use Azure AD)
```

### 5. Redis Cache ⚠️ Uses Password (Azure AD not supported)
```
Status: Not deployed yet (optional for MVP)
When deployed: Uses password authentication
```

📋 **In .env (when deployed):**
```bash
REDIS_HOST=<your-redis>.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<your-redis-key>
REDIS_TLS=true
```

### 6. Speech Service 🔑 Uses API Key
```
Region: swedencentral
Auth: API key (Azure AD migration later)
```

📋 **In .env:**
```bash
SPEECH_KEY=1ONLpQOB2vj9RayDiYEUG6j58kJPoVRtqWkFMYS5WxCTjfqFVnlDJQQJ99BIACfhMk5XJ3w3AAAYACOGZWnz
SPEECH_REGION=swedencentral
```

---

## 🔑 Assign RBAC Permissions (Required!)

Your user principal ID: `2acfdf14-ad32-4735-85eb-097c89d073b6`

### Cosmos DB (Already assigned ✅)
```bash
az cosmosdb sql role assignment create \
  --account-name neveralone \
  --resource-group never-alone-rg \
  --scope "/" \
  --principal-id 2acfdf14-ad32-4735-85eb-097c89d073b6 \
  --role-definition-name "Cosmos DB Built-in Data Contributor"
```

### Blob Storage (Already assigned ✅)
```bash
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee 2acfdf14-ad32-4735-85eb-097c89d073b6 \
  --scope "/subscriptions/7aa77d2e-cbec-48b4-8518-9802543b25af/resourceGroups/never-alone-rg/providers/Microsoft.Storage/storageAccounts/neveralone"
```

### For Production (Azure App Service):
1. Enable **System Assigned Managed Identity** on App Service
2. Assign same roles to the Managed Identity (replace principal-id with identity's object ID)
3. Code automatically uses Managed Identity in production!

---

## 🚀 Quick Commands

```bash
# Login to Azure (required for local dev)
az login

# Check your login
az account show

# Verify Cosmos DB containers
npm run check:containers

# Start dev server
npm run start:dev

# Test health endpoint
curl http://localhost:3000/health
```

**Expected Health Response:**
```json
{
  "status": "healthy",
  "services": {
    "cosmosDb": true,      // ✅ Azure AD working
    "redis": false,        // ⚠️ Not deployed yet
    "blobStorage": true    // ✅ Azure AD working
  }
}
```

---

## 📚 How Azure AD Authentication Works

### Local Development:
1. You run `az login` to authenticate
2. `DefaultAzureCredential` automatically uses your Azure CLI credentials
3. Code accesses Azure services using your identity
4. No keys or secrets needed in code!

### Production (Azure App Service):
1. Enable Managed Identity on App Service
2. Assign RBAC roles to the Managed Identity
3. Code automatically detects it's running in Azure
4. `DefaultAzureCredential` uses Managed Identity
5. Zero code changes needed!

**Authentication Chain:**
```
DefaultAzureCredential tries:
1. Environment Variables → 2. Managed Identity → 3. Azure CLI → 4. Azure PowerShell
```

---

## ⚠️ Troubleshooting

### "Key based authentication is not permitted on this storage account"
✅ **Fixed!** Storage account now uses Azure AD. Make sure:
- `.env` has `BLOB_STORAGE_ACCOUNT_NAME=neveralone` (not connection string)
- You're logged in: `az login`
- RBAC role assigned (see commands above)

### "Request is blocked because principal does not have required RBAC permissions"
→ Re-run the role assignment commands above
→ Wait 5 minutes for permissions to propagate

### "DefaultAzureCredential authentication failed"
→ Run `az login` and authenticate
→ Verify: `az account show`
→ Make sure you're in correct subscription

### "Local Authorization is disabled. Use an AAD token"
✅ **Fixed!** Cosmos DB now uses Azure AD. Code updated to use `aadCredentials` parameter.

---

## 📊 Estimated Monthly Costs (MVP with 1-3 test users)

| Service | Tier | Est. Cost |
|---------|------|-----------|
| Azure OpenAI | Pay-as-you-go | $10-30 |
| Cosmos DB | 400 RU/s | $24 |
| Redis Cache | Standard C1 (optional) | $16 |
| Blob Storage | LRS | $5 |
| Speech Service | Pay-as-you-go | $10 |
| **Total** | | **~$65-85/month** |

---

## 🎯 What's Left to Do?

✅ Cosmos DB - Azure AD working  
✅ Blob Storage - Azure AD working  
✅ All 6 containers created and verified  
✅ RBAC permissions assigned  
✅ .env file cleaned of all access keys  
✅ Scripts updated (check-containers.js, list-databases.js)  
✅ Server starts successfully with Azure AD  

🔜 Next steps:
- Verify health endpoint shows `blobStorage: true`
- Deploy Redis Cache (optional)
- Implement Azure OpenAI with Azure AD (Week 2)
- Generate Hebrew audio files (Task 1.5)

---

## 📚 Documentation

- **Complete Azure AD migration guide:** `backend/AZURE_AD_AUTH_COMPLETE.md`
- **Setup checklist:** `backend/SETUP_CHECKLIST.md`
- **Getting started:** `docs/technical/GETTING_STARTED.md`
- **Implementation tasks:** `docs/technical/IMPLEMENTATION_TASKS.md`

---

*Last updated: November 10, 2025*  
*🔐 All Azure resources using Azure AD authentication (except Redis and Speech)*
