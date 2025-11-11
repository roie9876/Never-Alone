# 🔐 Azure AD Authentication - Complete Guide

**Last Updated:** November 11, 2025  
**Status:** ✅ FULLY IMPLEMENTED

---

## 📋 Overview

Never Alone uses **Azure AD (Entra ID) authentication** for all Azure services:
- ✅ **Cosmos DB** - Using DefaultAzureCredential
- ✅ **Blob Storage** - Using DefaultAzureCredential
- ✅ **Azure OpenAI** - Using Azure AD (via API key for now, can migrate to AD)

**Why Azure AD?**
- 🔒 **More secure** - No keys in code or .env files
- 🔄 **Automatic rotation** - No manual key updates
- 📊 **Better auditing** - All access logged with user identity
- 🚀 **Production-ready** - Seamlessly works with Managed Identity

---

## ✅ Current Status: All Files Using Azure AD

### 1. Main Application Code
**File:** `/backend/src/config/azure.config.ts`

```typescript
import { DefaultAzureCredential } from '@azure/identity';
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';

// Cosmos DB - Azure AD ✅
const credential = new DefaultAzureCredential();
this.cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

// Blob Storage - Azure AD ✅
const blobServiceUrl = `https://${storageAccountName}.blob.core.windows.net`;
this.blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
```

**Status:** ✅ USING AZURE AD

---

### 2. Setup & Diagnostic Scripts

All scripts using Azure AD:

| Script | Status | Authentication Method |
|--------|--------|----------------------|
| `scripts/check-containers.js` | ✅ | DefaultAzureCredential |
| `scripts/list-databases.js` | ✅ | DefaultAzureCredential |
| `scripts/add-test-photos.js` | ✅ | DefaultAzureCredential |
| `scripts/setup-tiferet-profile.js` | ✅ | DefaultAzureCredential |
| `scripts/add-hebrew-tags.js` | ✅ | DefaultAzureCredential |
| `scripts/create-blob-containers.ts` | ✅ | DefaultAzureCredential |
| `scripts/generate-audio.ts` | ✅ | DefaultAzureCredential |
| `test-cosmos-aad.js` | ✅ | DefaultAzureCredential |

**Status:** ✅ ALL USING AZURE AD

---

### 3. ❌ Old Test File (TO BE DELETED)

**File:** `/backend/test-cosmos.js`

```javascript
// ❌ OLD: Uses connection string
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
```

**Action Required:** Delete this file - it's obsolete.

---

## 🔧 How Azure AD Authentication Works

### DefaultAzureCredential Chain

`DefaultAzureCredential` tries authentication methods in this order:

1. **Environment Variables**
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`

2. **Managed Identity** (Production on Azure)
   - Automatically used when app runs on Azure App Service
   - No credentials needed!

3. **Azure CLI** (Local Development) ⭐
   - Uses your `az login` credentials
   - **Currently using this method**

4. **Visual Studio / VS Code**
   - Uses signed-in Azure account

5. **Interactive Browser**
   - Fallback for interactive scenarios

---

## 🖥️ Local Development Setup

### Prerequisites

1. **Install Azure CLI**
   ```bash
   brew install azure-cli
   ```

2. **Login to Azure**
   ```bash
   az login
   ```

3. **Verify Login**
   ```bash
   az account show
   ```

4. **Set Subscription (if you have multiple)**
   ```bash
   az account set --subscription "<subscription-id>"
   ```

### Required RBAC Permissions

Your Azure AD user needs these roles:

#### Cosmos DB Permissions
```bash
# Get your user's Object ID
USER_ID=$(az ad signed-in-user show --query id -o tsv)

# Assign Cosmos DB Data Contributor role
az cosmosdb sql role assignment create \
  --account-name neveralone \
  --resource-group never-alone-rg \
  --scope "/" \
  --principal-id $USER_ID \
  --role-definition-name "Cosmos DB Built-in Data Contributor"
```

#### Blob Storage Permissions
```bash
# Assign Storage Blob Data Contributor role
az role assignment create \
  --assignee $USER_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/never-alone-rg/providers/Microsoft.Storage/storageAccounts/neveralone"
```

**Verify Permissions:**
```bash
# Check Cosmos DB role assignments
az cosmosdb sql role assignment list \
  --account-name neveralone \
  --resource-group never-alone-rg

# Check Blob Storage role assignments
az role assignment list \
  --assignee $USER_ID \
  --scope "/subscriptions/<subscription-id>/resourceGroups/never-alone-rg"
```

---

## 🚀 Production Deployment (Azure App Service)

### Step 1: Enable Managed Identity

In Azure Portal:
1. Go to your App Service
2. Navigate to **Identity** → **System assigned**
3. Toggle **Status** to **On**
4. Click **Save**
5. Copy the **Object (principal) ID**

Or via CLI:
```bash
az webapp identity assign \
  --resource-group never-alone-rg \
  --name never-alone-app
```

### Step 2: Assign RBAC Permissions to Managed Identity

```bash
# Get the Managed Identity's Object ID
MI_ID=$(az webapp identity show \
  --resource-group never-alone-rg \
  --name never-alone-app \
  --query principalId -o tsv)

# Assign Cosmos DB role
az cosmosdb sql role assignment create \
  --account-name neveralone \
  --resource-group never-alone-rg \
  --scope "/" \
  --principal-id $MI_ID \
  --role-definition-name "Cosmos DB Built-in Data Contributor"

# Assign Blob Storage role
az role assignment create \
  --assignee $MI_ID \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/never-alone-rg/providers/Microsoft.Storage/storageAccounts/neveralone"
```

### Step 3: Deploy Application

```bash
# Deploy via Azure CLI
az webapp up \
  --resource-group never-alone-rg \
  --name never-alone-app \
  --runtime "NODE:18-lts"
```

**No code changes needed!** DefaultAzureCredential automatically detects Managed Identity.

---

## 🌍 Environment Variables

### ❌ **NO LONGER NEEDED** (Removed from .env)

```bash
# ❌ DELETE THESE - NOT USED WITH AZURE AD
COSMOS_KEY=<removed>
COSMOS_CONNECTION_STRING=<removed>
BLOB_STORAGE_CONNECTION_STRING=<removed>
```

### ✅ **REQUIRED** (Keep these in .env)

```bash
# Cosmos DB
COSMOS_ENDPOINT=https://neveralone.documents.azure.com:443/
COSMOS_DATABASE=never-alone

# Blob Storage
BLOB_STORAGE_ACCOUNT_NAME=neveralone
BLOB_CONTAINER_AUDIO=audio-files
BLOB_CONTAINER_PHOTOS=photos

# Redis (still uses password - Azure AD not supported yet)
REDIS_HOST=neveralone.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<your-redis-key>
REDIS_TLS=true

# Azure OpenAI (still uses API key - can migrate later)
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview
```

---

## 🧪 Testing Azure AD Authentication

### Test Cosmos DB Connection

```bash
cd /Users/robenhai/Never\ Alone/backend

# Run the Azure AD test script
node test-cosmos-aad.js
```

**Expected Output:**
```
✅ SUCCESS! Connected to Cosmos DB
📦 Database: never-alone
📊 Containers found: 8
   - users
   - conversations
   - memories
   - reminders
   - photos
   - safety-config
   - user-music-preferences
   - music-playback-history
```

### Test Blob Storage Connection

```bash
node -e "
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

const credential = new DefaultAzureCredential();
const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
const blobServiceUrl = \`https://\${accountName}.blob.core.windows.net\`;

const blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);

blobServiceClient.listContainers().byPage().next()
  .then(result => {
    console.log('✅ Blob Storage connected successfully!');
    console.log('Containers:', result.value.containerItems.map(c => c.name));
  })
  .catch(err => {
    console.error('❌ Blob Storage connection failed:', err.message);
  });
"
```

---

## 🚨 Troubleshooting

### Issue 1: "Request is blocked by firewall"

**Solution:** Add your IP to Cosmos DB firewall:

```bash
# Get your public IP
MY_IP=$(curl -s ifconfig.me)

# Add to Cosmos DB firewall
az cosmosdb update \
  --name neveralone \
  --resource-group never-alone-rg \
  --ip-range-filter $MY_IP
```

Or allow all Azure services:
```bash
az cosmosdb update \
  --name neveralone \
  --resource-group never-alone-rg \
  --enable-public-network true
```

---

### Issue 2: "Principal does not have required RBAC permissions"

**Solution 1:** Re-assign roles (wait 5 minutes for propagation):

```bash
USER_ID=$(az ad signed-in-user show --query id -o tsv)

az cosmosdb sql role assignment create \
  --account-name neveralone \
  --resource-group never-alone-rg \
  --scope "/" \
  --principal-id $USER_ID \
  --role-definition-name "Cosmos DB Built-in Data Contributor"
```

**Solution 2:** Check existing role assignments:

```bash
az cosmosdb sql role assignment list \
  --account-name neveralone \
  --resource-group never-alone-rg
```

---

### Issue 3: "DefaultAzureCredential authentication failed"

**Root Causes:**
1. Not logged into Azure CLI
2. Wrong subscription selected
3. Azure CLI expired token

**Solutions:**

```bash
# 1. Re-login
az login

# 2. Verify login
az account show

# 3. Set correct subscription
az account list --output table
az account set --subscription "<subscription-id>"

# 4. Clear Azure CLI cache (if token issues)
az account clear
az login
```

---

### Issue 4: "Storage Blob Data Contributor role not found"

This means you need Blob Storage permissions.

**Solution:**

```bash
USER_ID=$(az ad signed-in-user show --query id -o tsv)
STORAGE_ID="/subscriptions/<subscription-id>/resourceGroups/never-alone-rg/providers/Microsoft.Storage/storageAccounts/neveralone"

az role assignment create \
  --assignee $USER_ID \
  --role "Storage Blob Data Contributor" \
  --scope $STORAGE_ID
```

---

## 📊 Security Best Practices

### ✅ DO

- ✅ Use `DefaultAzureCredential` in all code
- ✅ Use Managed Identity in production
- ✅ Use Azure CLI for local development
- ✅ Assign least-privilege RBAC roles
- ✅ Enable Azure Monitor for audit logs
- ✅ Use separate identities for dev/staging/prod

### ❌ DON'T

- ❌ Store connection strings in code
- ❌ Commit `.env` files with keys
- ❌ Use shared credentials across environments
- ❌ Give "Owner" role when "Contributor" is enough
- ❌ Disable firewall rules in production

---

## 📚 Migration Checklist

### For Existing Code Using Connection Strings

- [ ] Install `@azure/identity` package
- [ ] Replace connection string with endpoint
- [ ] Add `DefaultAzureCredential` import
- [ ] Update `CosmosClient` initialization
- [ ] Update `BlobServiceClient` initialization
- [ ] Remove `COSMOS_KEY` from .env
- [ ] Remove `BLOB_STORAGE_CONNECTION_STRING` from .env
- [ ] Login to Azure CLI: `az login`
- [ ] Assign RBAC permissions
- [ ] Test locally
- [ ] Enable Managed Identity for production
- [ ] Assign production RBAC permissions

---

## 🎯 Summary

### Current State (November 11, 2025)

| Service | Authentication Method | Status |
|---------|----------------------|--------|
| **Cosmos DB** | Azure AD (DefaultAzureCredential) | ✅ IMPLEMENTED |
| **Blob Storage** | Azure AD (DefaultAzureCredential) | ✅ IMPLEMENTED |
| **Redis** | Password-based | ⚠️ Azure AD not supported yet |
| **Azure OpenAI** | API Key | ⚠️ Can migrate to Azure AD later |

### Benefits Achieved

- 🔒 **No keys in .env files** for Cosmos DB and Blob Storage
- 🚀 **Production-ready** with Managed Identity
- 📊 **Full audit trail** for all data access
- 🔄 **No manual key rotation** needed

### Next Steps (Optional)

1. **Azure OpenAI Migration** - Switch from API key to Azure AD
2. **Redis Migration** - Wait for Azure AD support
3. **Monitoring** - Set up alerts for authentication failures
4. **Documentation** - Update team wiki with RBAC process

---

**Questions?** Contact the backend team or check Azure documentation:
- [Cosmos DB RBAC Guide](https://learn.microsoft.com/azure/cosmos-db/how-to-setup-rbac)
- [Blob Storage RBAC Guide](https://learn.microsoft.com/azure/storage/blobs/assign-azure-role-data-access)
- [DefaultAzureCredential Docs](https://learn.microsoft.com/dotnet/api/azure.identity.defaultazurecredential)

---

*Last updated: November 11, 2025*
