#!/bin/bash

# Test Dashboard Data Persistence
# Purpose: Verify that Dashboard loads saved data from Cosmos DB

echo "🧪 Testing Dashboard Data Persistence"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_URL="http://localhost:3000"
DASHBOARD_URL="http://localhost:3001"
USER_ID="user-tiferet-001"

# Step 1: Check services running
echo "1️⃣ Checking services..."
echo ""

# Check backend
if lsof -i :3000 | grep -q LISTEN; then
  echo -e "   ${GREEN}✅${NC} Backend running on port 3000"
else
  echo -e "   ${RED}❌${NC} Backend NOT running"
  exit 1
fi

# Check dashboard
if lsof -i :3001 | grep -q LISTEN; then
  echo -e "   ${GREEN}✅${NC} Dashboard running on port 3001"
else
  echo -e "   ${RED}❌${NC} Dashboard NOT running"
  exit 1
fi

echo ""

# Step 2: Verify current data in Cosmos DB
echo "2️⃣ Checking current data in Cosmos DB..."
echo ""

cd "/Users/robenhai/Never Alone/backend"

node -e "
require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');
const { DefaultAzureCredential } = require('@azure/identity');

async function checkData() {
  try {
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential
    });

    const database = client.database('never-alone');
    const container = database.container('user-music-preferences');
    
    const { resources } = await container.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: '${USER_ID}' }]
      })
      .fetchAll();
    
    if (resources.length === 0) {
      console.log('⚠️  No music preferences found in Cosmos DB');
      process.exit(1);
    }
    
    const prefs = resources[0];
    console.log('✅ Found music preferences:');
    console.log('   Artists:', prefs.preferredArtists.join(', '));
    console.log('   Songs:', prefs.preferredSongs.join(', '));
    console.log('   Updated:', prefs.updatedAt);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
"

if [ $? -ne 0 ]; then
  echo ""
  echo -e "${RED}❌ Failed to verify Cosmos DB data${NC}"
  exit 1
fi

cd - > /dev/null

echo ""

# Step 3: Test GET /api/onboarding/[userId] endpoint
echo "3️⃣ Testing GET /api/onboarding/${USER_ID}..."
echo ""

API_RESPONSE=$(curl -s -w "\n%{http_code}" "${DASHBOARD_URL}/api/onboarding/${USER_ID}")
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$API_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
  echo -e "   ${GREEN}✅${NC} API endpoint works! Status: ${HTTP_CODE}"
  echo ""
  echo "   Response preview:"
  echo "$RESPONSE_BODY" | python3 -m json.tool | head -20
  
  # Check if music preferences are present
  if echo "$RESPONSE_BODY" | grep -q "musicPreferences"; then
    echo -e "   ${GREEN}✅${NC} Music preferences found in response"
    
    # Extract artists
    ARTISTS=$(echo "$RESPONSE_BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['musicPreferences']['preferredArtists'] if data.get('success') and data['data'].get('musicPreferences') else 'N/A')")
    echo "   Artists: ${ARTISTS}"
  else
    echo -e "   ${YELLOW}⚠️${NC}  No music preferences in response"
  fi
else
  echo -e "   ${RED}❌${NC} API endpoint failed! Status: ${HTTP_CODE}"
  echo "   Response: ${RESPONSE_BODY}"
  exit 1
fi

echo ""

# Step 4: Instruction for manual testing
echo "4️⃣ Manual Testing Steps:"
echo ""
echo "   Now test in your browser:"
echo ""
echo "   1. Open: ${DASHBOARD_URL}"
echo "   2. Wait for loading spinner"
echo "   3. Verify form loads with REAL data from Cosmos DB"
echo "   4. Check music preferences show current artists/songs"
echo ""
echo "   Expected behavior:"
echo "   - Loading spinner appears briefly"
echo "   - Form populates with saved configuration"
echo "   - Music preferences match Cosmos DB data"
echo "   - Console shows: \"✅ Loaded existing configuration from Cosmos DB\""
echo ""

# Step 5: Test persistence after edit
echo "5️⃣ Testing Edit → Save → Refresh cycle:"
echo ""
echo "   To verify full persistence:"
echo ""
echo "   1. Edit music preferences (add/remove artist)"
echo "   2. Click \"שלח והשלם\" (Submit)"
echo "   3. Wait for success message"
echo "   4. Refresh page (⌘R or F5)"
echo "   5. Verify changes PERSIST (don't revert to old data)"
echo ""
echo "   ✅ SUCCESS = Changes remain after refresh"
echo "   ❌ FAILURE = Changes disappear, old data returns"
echo ""

echo "======================================"
echo -e "${GREEN}✅ Automated tests passed!${NC}"
echo ""
echo "📝 Next: Complete manual testing in browser"
echo "🌐 Open: ${DASHBOARD_URL}"
echo ""
