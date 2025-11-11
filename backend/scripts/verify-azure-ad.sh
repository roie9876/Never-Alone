#!/bin/bash

# Verify All Azure Services Use Azure AD Authentication
# This script checks that no connection strings or keys are used

echo "🔐 Azure AD Authentication Verification"
echo "========================================"
echo ""

cd /Users/robenhai/Never\ Alone/backend

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Check 1: Search for connection string usage in code
echo "1️⃣ Checking for connection string usage in code..."
if grep -r "COSMOS_CONNECTION_STRING\|BLOB_STORAGE_CONNECTION_STRING" src/ scripts/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".env"; then
    echo -e "${RED}❌ FAILED: Found connection string references in code${NC}"
    echo "   Files still using connection strings (should use Azure AD):"
    grep -r "COSMOS_CONNECTION_STRING\|BLOB_STORAGE_CONNECTION_STRING" src/ scripts/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".env"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ PASSED: No connection strings found in code${NC}"
fi

echo ""

# Check 2: Verify DefaultAzureCredential is imported
echo "2️⃣ Checking for DefaultAzureCredential usage..."
if grep -r "DefaultAzureCredential" src/config/azure.config.ts scripts/*.js scripts/*.ts 2>/dev/null | grep -q "import.*DefaultAzureCredential"; then
    echo -e "${GREEN}✅ PASSED: DefaultAzureCredential is imported${NC}"
    COUNT=$(grep -r "import.*DefaultAzureCredential" src/ scripts/ --include="*.ts" --include="*.js" 2>/dev/null | wc -l)
    echo "   Found in $COUNT files"
else
    echo -e "${RED}❌ FAILED: DefaultAzureCredential not found${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""

# Check 3: Verify .env file doesn't contain connection strings
echo "3️⃣ Checking .env file for connection strings..."
if [ -f ".env" ]; then
    if grep -q "COSMOS_CONNECTION_STRING\|BLOB_STORAGE_CONNECTION_STRING" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠️  WARNING: .env file contains connection strings${NC}"
        echo "   These should be removed - Azure AD doesn't need them"
        echo ""
        echo "   Lines to remove:"
        grep "COSMOS_CONNECTION_STRING\|BLOB_STORAGE_CONNECTION_STRING" .env
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ PASSED: .env file clean (no connection strings)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: No .env file found${NC}"
fi

echo ""

# Check 4: Verify Azure CLI is logged in
echo "4️⃣ Checking Azure CLI authentication..."
if az account show > /dev/null 2>&1; then
    ACCOUNT=$(az account show --query name -o tsv 2>/dev/null)
    USER=$(az account show --query user.name -o tsv 2>/dev/null)
    echo -e "${GREEN}✅ PASSED: Azure CLI is logged in${NC}"
    echo "   Account: $ACCOUNT"
    echo "   User: $USER"
else
    echo -e "${RED}❌ FAILED: Not logged into Azure CLI${NC}"
    echo "   Run: az login"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""

# Check 5: Test Cosmos DB with Azure AD
echo "5️⃣ Testing Cosmos DB connection with Azure AD..."
if node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

const credential = new DefaultAzureCredential();
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  aadCredentials: credential
});

client.getDatabaseAccount()
  .then(() => {
    console.log('✅ Cosmos DB connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Cosmos DB connection failed:', err.message);
    process.exit(1);
  });
" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED: Cosmos DB Azure AD authentication working${NC}"
else
    echo -e "${RED}❌ FAILED: Cosmos DB Azure AD authentication failed${NC}"
    echo "   Check RBAC permissions: az cosmosdb sql role assignment list --account-name neveralone --resource-group never-alone-rg"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""

# Check 6: Test Blob Storage with Azure AD
echo "6️⃣ Testing Blob Storage connection with Azure AD..."
if node -e "
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

const credential = new DefaultAzureCredential();
const accountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
const blobServiceUrl = \`https://\${accountName}.blob.core.windows.net\`;

const blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);

blobServiceClient.getAccountInfo()
  .then(() => {
    console.log('✅ Blob Storage connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Blob Storage connection failed:', err.message);
    process.exit(1);
  });
" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED: Blob Storage Azure AD authentication working${NC}"
else
    echo -e "${RED}❌ FAILED: Blob Storage Azure AD authentication failed${NC}"
    echo "   Check RBAC permissions: az role assignment list --assignee \$(az ad signed-in-user show --query id -o tsv)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
echo "========================================"
echo "📊 Verification Summary"
echo "========================================"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "🎉 Your backend is fully using Azure AD authentication!"
    echo ""
    echo "✅ Cosmos DB: Azure AD (DefaultAzureCredential)"
    echo "✅ Blob Storage: Azure AD (DefaultAzureCredential)"
    echo "✅ No connection strings in code"
    echo "✅ Azure CLI logged in"
    echo ""
    echo "📚 See AZURE_AD_AUTHENTICATION_GUIDE.md for details"
else
    echo -e "${RED}❌ FOUND $ISSUES_FOUND ISSUE(S)${NC}"
    echo ""
    echo "📚 Check AZURE_AD_AUTHENTICATION_GUIDE.md for troubleshooting"
    echo ""
    echo "Common fixes:"
    echo "  1. Login to Azure: az login"
    echo "  2. Assign RBAC permissions (see guide)"
    echo "  3. Remove connection strings from .env"
fi

echo ""
exit $ISSUES_FOUND
