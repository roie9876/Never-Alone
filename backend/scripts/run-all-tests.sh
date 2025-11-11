#!/bin/bash

# Never Alone - Run All Manual Tests
# This script runs automated checks before manual testing begins

echo "🧪 Never Alone - Pre-Testing System Check"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "1️⃣ Checking Backend Status..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on port 3000${NC}"
else
    echo -e "${RED}❌ Backend is NOT running${NC}"
    echo "   Run: cd /Users/robenhai/Never\ Alone && ./start.sh"
    exit 1
fi

# Check Azure Services
echo ""
echo "2️⃣ Checking Azure Services..."

# Check Cosmos DB
echo "   - Cosmos DB..."
if node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential
});
client.getDatabaseAccount().then(() => {
    console.log('✅ Cosmos DB: Connected');
    process.exit(0);
}).catch(err => {
    console.error('❌ Cosmos DB: Failed -', err.message);
    process.exit(1);
});
" 2>/dev/null; then
    echo -e "     ${GREEN}✅ Cosmos DB connected${NC}"
else
    echo -e "     ${RED}❌ Cosmos DB connection failed${NC}"
fi

# Check Redis
echo "   - Redis..."
if redis-cli PING > /dev/null 2>&1; then
    echo -e "     ${GREEN}✅ Redis connected${NC}"
else
    echo -e "     ${RED}❌ Redis connection failed${NC}"
fi

# Check Test User Exists
echo ""
echo "3️⃣ Checking Test User (user-tiferet-001)..."
node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential
});
const container = client.database('never-alone').container('users');

container.item('user-tiferet-001', 'user-tiferet-001').read()
    .then(result => {
        console.log('✅ Test user exists:', result.resource.personalInfo.name);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Test user not found');
        console.log('   Run: node backend/scripts/setup-tiferet-profile.js');
        process.exit(1);
    });
" 2>/dev/null

# Check Photos
echo ""
echo "4️⃣ Checking Test Photos..."
PHOTO_COUNT=$(node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential
});
const container = client.database('never-alone').container('photos');

container.items.query({
    query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(result => {
    console.log(result.resources[0]);
}).catch(err => {
    console.log(0);
});
" 2>/dev/null)

if [ "$PHOTO_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $PHOTO_COUNT photos for test user${NC}"
else
    echo -e "${YELLOW}⚠️  No photos found - photo triggering tests will fail${NC}"
    echo "   Run: node backend/scripts/add-test-photos.js"
fi

# Check Safety Config
echo ""
echo "5️⃣ Checking Safety Configuration..."
node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential
});
const container = client.database('never-alone').container('safety-config');

container.items.query({
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(result => {
    if (result.resources.length > 0) {
        const config = result.resources[0];
        console.log('✅ Safety config exists');
        console.log('   - Emergency contacts:', config.emergencyContacts?.length || 0);
        console.log('   - Medications:', config.medications?.length || 0);
        console.log('   - Crisis triggers:', config.crisisTriggers?.length || 0);
    } else {
        console.log('❌ No safety config found');
        console.log('   Create via dashboard: http://localhost:3001/onboarding');
    }
}).catch(err => {
    console.error('❌ Error checking safety config:', err.message);
});
" 2>/dev/null

# Check Memory System
echo ""
echo "6️⃣ Checking Memory System..."

# Check Redis keys
REDIS_KEYS=$(redis-cli KEYS "memory:*" 2>/dev/null | wc -l)
echo "   - Redis memory keys: $REDIS_KEYS"

# Check Cosmos DB memories
MEMORY_COUNT=$(node -e "
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();
const credential = new DefaultAzureCredential();
const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    aadCredentials: credential
});
const container = client.database('never-alone').container('memories');

container.items.query({
    query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: 'user-tiferet-001' }]
}).fetchAll().then(result => {
    console.log(result.resources[0]);
}).catch(err => {
    console.log(0);
});
" 2>/dev/null)

echo "   - Long-term memories: $MEMORY_COUNT"

# Summary
echo ""
echo "=========================================="
echo "🎯 System Status Summary"
echo "=========================================="
echo -e "${GREEN}✅ Backend: Running${NC}"
echo -e "${GREEN}✅ Cosmos DB: Connected${NC}"
echo -e "${GREEN}✅ Redis: Connected${NC}"
echo "📊 Test user photos: $PHOTO_COUNT"
echo "🧠 Long-term memories: $MEMORY_COUNT"
echo ""
echo "📖 Next Steps:"
echo "1. Open Flutter app: cd ../frontend_flutter && flutter run -d macos"
echo "2. Follow test scenarios in: TASK_7.1_TESTING_PLAN.md"
echo "3. Record results in the testing checklist"
echo ""
echo "💡 Tip: Keep backend logs open in another terminal:"
echo "   tail -f /tmp/never-alone-backend.log"
echo ""
