# ✅ Azure AD Authentication Checklist for Scripts

**Purpose:** Quick reference for creating any new scripts that access Azure services  
**Last Updated:** November 11, 2025

---

## 🚨 CRITICAL RULE

**ALL scripts accessing Cosmos DB or Blob Storage MUST use Azure AD authentication (DefaultAzureCredential)**

❌ **NEVER use:**
- `COSMOS_CONNECTION_STRING`
- `COSMOS_KEY`
- `BLOB_STORAGE_CONNECTION_STRING`

✅ **ALWAYS use:**
- `COSMOS_ENDPOINT` + `DefaultAzureCredential`
- `BLOB_STORAGE_ACCOUNT_NAME` + `DefaultAzureCredential`

---

## 📋 Required Imports

Every script accessing Azure services needs these imports:

```javascript
// For Cosmos DB
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config(); // Load environment variables

// For Blob Storage
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();
```

---

## 🔧 Correct Pattern (Copy-Paste Template)

### Cosmos DB Access

```javascript
// ✅ CORRECT: Azure AD Authentication
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

const database = client.database('never-alone');
const container = database.container('users'); // or 'memories', 'photos', etc.

// Use container.items.query(), container.item().read(), etc.
```

### Blob Storage Access

```javascript
// ✅ CORRECT: Azure AD Authentication
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

const credential = new DefaultAzureCredential();
const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
const blobServiceUrl = `https://${accountName}.blob.core.windows.net`;

const blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
const containerClient = blobServiceClient.getContainerClient('audio-files'); // or 'photos'

// Use containerClient.uploadBlob(), getBlockBlobClient(), etc.
```

---

## ❌ Wrong Patterns (DO NOT USE)

```javascript
// ❌ WRONG: Connection string (security risk!)
const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);

// ❌ WRONG: Direct key access
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY
});

// ❌ WRONG: Blob storage connection string
const blobServiceClient = new BlobServiceClient(process.env.BLOB_STORAGE_CONNECTION_STRING);
```

---

## 🧪 Testing Your Script

Before committing, verify your script works with Azure AD:

```bash
# 1. Make sure you're logged into Azure CLI
az login

# 2. Check your account
az account show

# 3. Run your script
node backend/scripts/your-new-script.js

# 4. Verify it connects successfully (no auth errors)
```

---

## 📦 Required npm Packages

Make sure these are in `package.json`:

```json
{
  "dependencies": {
    "@azure/cosmos": "^4.0.0",
    "@azure/storage-blob": "^12.17.0",
    "@azure/identity": "^4.0.0",
    "dotenv": "^16.3.1"
  }
}
```

---

## 🔍 How to Find Incorrect Usage

### Search for connection strings in code:

```bash
# From backend/ directory
grep -r "COSMOS_CONNECTION_STRING" src/ scripts/ --include="*.ts" --include="*.js"
grep -r "BLOB_STORAGE_CONNECTION_STRING" src/ scripts/ --include="*.ts" --include="*.js"
grep -r "new CosmosClient(process.env" src/ scripts/ --include="*.ts" --include="*.js"
```

If you find ANY matches, those files need to be updated to use Azure AD.

---

## 📚 Examples of Correct Scripts

**Reference these scripts for proper Azure AD usage:**

✅ `/backend/scripts/check-containers.js`
✅ `/backend/scripts/list-databases.js`
✅ `/backend/scripts/add-test-photos.js`
✅ `/backend/scripts/setup-tiferet-profile.js`
✅ `/backend/scripts/add-hebrew-tags.js`
✅ `/backend/scripts/create-blob-containers.ts`
✅ `/backend/scripts/generate-audio.ts`
✅ `/backend/src/config/azure.config.ts`

---

## 🆘 Troubleshooting

### Error: "Invalid Cosmos DB connection string"
**Problem:** Script is trying to use `COSMOS_CONNECTION_STRING` (old method)  
**Solution:** Update script to use `COSMOS_ENDPOINT` + `DefaultAzureCredential`

### Error: "The client is not authenticated"
**Problem:** Not logged into Azure CLI  
**Solution:** Run `az login`

### Error: "AuthorizationPermissionMismatch"
**Problem:** Your Azure account doesn't have RBAC permissions  
**Solution:** Assign roles:
```bash
# For Cosmos DB
az cosmosdb sql role assignment create \
  --account-name neveralone \
  --resource-group never-alone-rg \
  --role-definition-name "Cosmos DB Built-in Data Contributor" \
  --principal-id $(az ad signed-in-user show --query id -o tsv) \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/never-alone-rg/providers/Microsoft.DocumentDB/databaseAccounts/neveralone"

# For Blob Storage
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/never-alone-rg/providers/Microsoft.Storage/storageAccounts/neveralone"
```

---

## 🎯 Quick Checklist Before Committing

- [ ] Script imports `DefaultAzureCredential` from `@azure/identity`
- [ ] Script uses `process.env.COSMOS_ENDPOINT` (not `COSMOS_CONNECTION_STRING`)
- [ ] Script uses `process.env.BLOB_STORAGE_ACCOUNT_NAME` (not `BLOB_STORAGE_CONNECTION_STRING`)
- [ ] Script calls `require('dotenv').config()` at the top
- [ ] Tested script locally with `az login` credentials
- [ ] No connection strings or keys hardcoded in script
- [ ] Script works when run from command line

---

## 📖 Full Documentation

For complete details, see:
- **`backend/AZURE_AD_AUTHENTICATION_GUIDE.md`** - Comprehensive authentication guide
- **`.github/copilot-instructions.md`** - Project coding standards
- **`docs/technical/architecture.md`** - Overall architecture

---

**Remember:** Azure AD authentication is a **security requirement**, not optional. All new code must follow this pattern.
